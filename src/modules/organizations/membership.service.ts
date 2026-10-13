import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import {
  organizationMemberships,
  organizations,
  organizationInvitations,
  membershipRoles,
  roles,
  permissions,
  rolePermissions,
} from '../../infrastructure/database/schema/organizations.schema.js';
import { users as identityUsers } from '../../infrastructure/database/schema/identity.schema.js';
import { OrganizationService } from './organization.service.js';
import type { CreateInvitationInput } from './membership.schemas.js';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender.js';

const missing = () =>
  new NotFoundException({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource was not found',
  });
const denied = () =>
  new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
  });
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const normalizeEmail = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase();
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class MembershipService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly organizationsService: OrganizationService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async list(userId: string, orgId: string) {
    await this.organizationsService.requirePermission(
      userId,
      orgId,
      'members:read',
    );
    const rows = await this.db
      .select({
        membership: organizationMemberships,
        user: identityUsers,
        role: roles.key,
      })
      .from(organizationMemberships)
      .innerJoin(
        identityUsers,
        eq(identityUsers.id, organizationMemberships.userId),
      )
      .leftJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .leftJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(eq(organizationMemberships.organizationId, orgId));
    return rows.map(({ membership, user, role }) => ({
      id: membership.id,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role,
      status: membership.status,
      joinedAt: membership.joinedAt,
    }));
  }

  async updateRole(
    actorId: string,
    orgId: string,
    memberId: string,
    roleKey: 'ADMIN' | 'MEMBER' | 'VIEWER',
  ) {
    return this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      const actor = await this.requirePermission(
        tx,
        actorId,
        orgId,
        'members:roles:update',
      );
      const target = await this.member(tx, orgId, memberId);
      if (target.id === actor.id)
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Members cannot change their own role',
        });
      const currentRole = await this.roleForMembership(tx, target.id);
      if (currentRole === 'OWNER' && actor.role !== 'OWNER') throw denied();
      this.assertRoleAuthority(actor.role, roleKey);
      const nextRole = await this.findRole(tx, roleKey);
      await tx
        .delete(membershipRoles)
        .where(eq(membershipRoles.membershipId, target.id));
      await tx
        .insert(membershipRoles)
        .values({ membershipId: target.id, roleId: nextRole.id });
      if (currentRole === 'OWNER')
        await this.organizationsService.assertActiveOwnerInvariant(tx, orgId);
      return { ...target, role: roleKey };
    });
  }

  async remove(actorId: string, orgId: string, memberId: string) {
    return this.changeMembership(actorId, orgId, memberId);
  }
  async leave(actorId: string, orgId: string) {
    return this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      const [member] = await tx
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, orgId),
            eq(organizationMemberships.userId, actorId),
            eq(organizationMemberships.status, 'active'),
          ),
        )
        .limit(1);
      if (!member) throw missing();
      await tx
        .update(organizationMemberships)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(eq(organizationMemberships.id, member.id));
      await this.organizationsService.assertActiveOwnerInvariant(tx, orgId);
      return { left: true };
    });
  }

  async invite(actorId: string, orgId: string, input: CreateInvitationInput) {
    const email = input.email.trim();
    const normalizedEmail = normalizeEmail(email);
    const rawToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const invitation = await this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      const actor = await this.requirePermission(
        tx,
        actorId,
        orgId,
        'members:invite',
      );
      this.assertRoleAuthority(actor.role, input.role);
      const [existing] = await tx
        .select()
        .from(organizationMemberships)
        .innerJoin(
          identityUsers,
          eq(identityUsers.id, organizationMemberships.userId),
        )
        .where(
          and(
            eq(organizationMemberships.organizationId, orgId),
            eq(identityUsers.normalizedEmail, normalizedEmail),
            eq(organizationMemberships.status, 'active'),
          ),
        )
        .limit(1);
      if (existing)
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'This user is already an active member',
        });
      const [pendingInvitation] = await tx
        .select({ id: organizationInvitations.id })
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.organizationId, orgId),
            eq(organizationInvitations.normalizedEmail, normalizedEmail),
            eq(organizationInvitations.status, 'pending'),
          ),
        )
        .limit(1);
      if (pendingInvitation)
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'A pending invitation already exists for this email',
        });
      const [role] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.key, input.role))
        .limit(1);
      if (!role)
        throw new ConflictException({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Role data is unavailable',
        });
      const [created] = await tx
        .insert(organizationInvitations)
        .values({
          organizationId: orgId,
          email,
          normalizedEmail,
          roleId: role.id,
          tokenDigest: digest(rawToken),
          invitedByMembershipId: actor.id,
          expiresAt: new Date(now.getTime() + 7 * 86400000),
        })
        .returning();
      if (!created) throw new Error('Invitation insert returned no row');
      return created;
    });
    try {
      await this.email.send({
        to: email,
        subject: 'Organization invitation',
        text: `Invitation token: ${rawToken}`,
      });
    } catch {
      await this.db
        .update(organizationInvitations)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(
            eq(organizationInvitations.id, invitation.id),
            eq(organizationInvitations.status, 'pending'),
          ),
        );
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Invitation email could not be delivered',
      });
    }
    return {
      id: invitation.id,
      email: invitation.email,
      role: input.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async listInvitations(userId: string, orgId: string) {
    await this.organizationsService.requirePermission(
      userId,
      orgId,
      'members:read',
    );
    const rows = await this.db
      .select({ invitation: organizationInvitations, role: roles.key })
      .from(organizationInvitations)
      .innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
      .where(eq(organizationInvitations.organizationId, orgId));
    return rows.map(({ invitation, role }) => ({
      id: invitation.id,
      email: invitation.email,
      role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }));
  }

  async revoke(userId: string, orgId: string, invitationId: string) {
    return this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      await this.requirePermission(tx, userId, orgId, 'members:invite');
      const [row] = await tx
        .update(organizationInvitations)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(
            eq(organizationInvitations.id, invitationId),
            eq(organizationInvitations.organizationId, orgId),
            eq(organizationInvitations.status, 'pending'),
          ),
        )
        .returning();
      if (!row) throw missing();
      return { revoked: true };
    });
  }

  async accept(userId: string, rawToken: string) {
    return this.db.transaction(async (tx) => {
      const [initial] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.tokenDigest, digest(rawToken)))
        .limit(1);
      if (!initial)
        throw new NotFoundException({
          code: 'INVITATION_INVALID',
          message: 'Invitation is invalid or unavailable',
        });
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        initial.organizationId,
      );
      const [invitation] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, initial.id))
        .limit(1)
        .for('update');
      if (!invitation || invitation.status !== 'pending')
        throw new NotFoundException({
          code: 'INVITATION_INVALID',
          message: 'Invitation is invalid or unavailable',
        });
      const [user] = await tx
        .select()
        .from(identityUsers)
        .where(eq(identityUsers.id, userId))
        .limit(1);
      if (
        !user ||
        !user.emailVerifiedAt ||
        user.normalizedEmail !== invitation.normalizedEmail
      )
        throw denied();
      if (org.status !== 'active') throw missing();
      if (invitation.expiresAt <= new Date())
        throw new ConflictException({
          code: 'INVITATION_EXPIRED',
          message: 'Invitation has expired',
        });
      const [inviter] = await tx
        .select({ status: organizationMemberships.status, role: roles.key })
        .from(organizationMemberships)
        .innerJoin(
          membershipRoles,
          eq(membershipRoles.membershipId, organizationMemberships.id),
        )
        .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
        .where(
          and(
            eq(organizationMemberships.id, invitation.invitedByMembershipId),
            eq(organizationMemberships.status, 'active'),
          ),
        )
        .limit(1);
      const [inviteRole] = await tx
        .select({ key: roles.key })
        .from(roles)
        .where(eq(roles.id, invitation.roleId))
        .limit(1);
      if (!inviter || !inviteRole)
        throw new ConflictException({
          code: 'INVITATION_INVALID',
          message: 'Invitation authority is no longer valid',
        });
      const [inviterGrant] = await tx
        .select({ permission: permissions.key })
        .from(organizationMemberships)
        .innerJoin(
          membershipRoles,
          eq(membershipRoles.membershipId, organizationMemberships.id),
        )
        .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
        .innerJoin(
          permissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(
          and(
            eq(organizationMemberships.id, invitation.invitedByMembershipId),
            eq(
              organizationMemberships.organizationId,
              invitation.organizationId,
            ),
            eq(organizationMemberships.status, 'active'),
            eq(permissions.key, 'members:invite'),
          ),
        )
        .limit(1);
      if (!inviterGrant)
        throw new ConflictException({
          code: 'INVITATION_INVALID',
          message: 'Invitation authority is no longer valid',
        });
      this.assertRoleAuthority(inviter.role, inviteRole.key);
      const [existing] = await tx
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(
              organizationMemberships.organizationId,
              invitation.organizationId,
            ),
            eq(organizationMemberships.userId, userId),
          ),
        )
        .limit(1);
      if (existing?.status === 'active')
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'User is already a member',
        });
      let membershipId: string;
      if (existing) {
        membershipId = existing.id;
        await tx
          .update(organizationMemberships)
          .set({
            status: 'active',
            joinedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(organizationMemberships.id, existing.id));
        await tx
          .delete(membershipRoles)
          .where(eq(membershipRoles.membershipId, existing.id));
      } else {
        const [member] = await tx
          .insert(organizationMemberships)
          .values({
            organizationId: invitation.organizationId,
            userId,
            status: 'active',
          })
          .returning();
        if (!member) throw new Error('Membership insert returned no row');
        membershipId = member.id;
      }
      await tx
        .insert(membershipRoles)
        .values({ membershipId, roleId: invitation.roleId });
      const [accepted] = await tx
        .update(organizationInvitations)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(
          and(
            eq(organizationInvitations.id, invitation.id),
            eq(organizationInvitations.status, 'pending'),
            gt(organizationInvitations.expiresAt, new Date()),
          ),
        )
        .returning();
      if (!accepted)
        throw new ConflictException({
          code: 'INVITATION_INVALID',
          message: 'Invitation is no longer available',
        });
      return { organizationId: org.id, membershipId, role: inviteRole.key };
    });
  }

  async transferOwnership(actorId: string, orgId: string, memberId: string) {
    return this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      const actor = await this.requirePermission(
        tx,
        actorId,
        orgId,
        'members:roles:update',
      );
      if (actor.role !== 'OWNER') throw denied();
      const target = await this.member(tx, orgId, memberId);
      if (target.status !== 'active' || target.id === actor.id)
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Transfer requires a different active member',
        });
      const owner = await this.findRole(tx, 'OWNER');
      const admin = await this.findRole(tx, 'ADMIN');
      await tx
        .delete(membershipRoles)
        .where(eq(membershipRoles.membershipId, actor.id));
      await tx
        .insert(membershipRoles)
        .values({ membershipId: actor.id, roleId: admin.id });
      await tx
        .delete(membershipRoles)
        .where(eq(membershipRoles.membershipId, target.id));
      await tx
        .insert(membershipRoles)
        .values({ membershipId: target.id, roleId: owner.id });
      await this.organizationsService.assertActiveOwnerInvariant(tx, orgId);
      return { transferred: true, ownerMembershipId: target.id };
    });
  }

  private async changeMembership(
    actorId: string,
    orgId: string,
    memberId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const org = await this.organizationsService.lockForMembershipChange(
        tx,
        orgId,
      );
      if (org.status !== 'active') throw missing();
      const actor = await this.requirePermission(
        tx,
        actorId,
        orgId,
        'members:remove',
      );
      const target = await this.member(tx, orgId, memberId);
      if (target.id === actor.id)
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Use the leave endpoint to remove yourself',
        });
      const targetRole =
        (await this.roleForMembership(tx, target.id)) ?? 'VIEWER';
      if (targetRole === 'OWNER' && actor.role !== 'OWNER') throw denied();
      this.assertRoleAuthority(actor.role, targetRole);
      await tx
        .update(organizationMemberships)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(eq(organizationMemberships.id, target.id));
      await this.organizationsService.assertActiveOwnerInvariant(tx, orgId);
      return { removed: true };
    });
  }

  private async member(tx: Transaction, orgId: string, id: string) {
    const [row] = await tx
      .select({ membership: organizationMemberships, user: identityUsers })
      .from(organizationMemberships)
      .innerJoin(
        identityUsers,
        eq(identityUsers.id, organizationMemberships.userId),
      )
      .where(
        and(
          eq(organizationMemberships.id, id),
          eq(organizationMemberships.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!row) throw missing();
    return {
      id: row.membership.id,
      userId: row.user.id,
      email: row.user.email,
      displayName: row.user.displayName,
      status: row.membership.status,
      joinedAt: row.membership.joinedAt,
    };
  }
  private async roleForMembership(tx: Transaction, id: string) {
    const [row] = await tx
      .select({ key: roles.key })
      .from(membershipRoles)
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(eq(membershipRoles.membershipId, id))
      .limit(1);
    return row?.key;
  }
  private async findRole(tx: Transaction, key: string) {
    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, key))
      .limit(1);
    if (!role)
      throw new ConflictException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Role data is unavailable',
      });
    return role;
  }
  private assertRoleAuthority(actorRole: string, targetRole: string) {
    if (
      targetRole === 'OWNER' ||
      (actorRole !== 'OWNER' && targetRole === 'ADMIN')
    )
      throw denied();
  }
  private async requirePermission(
    tx: Transaction,
    userId: string,
    orgId: string,
    permissionKey: string,
  ) {
    const [row] = await tx
      .select({ membership: organizationMemberships, role: roles.key })
      .from(organizationMemberships)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMemberships.organizationId),
      )
      .innerJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, orgId),
          eq(organizationMemberships.status, 'active'),
          eq(organizations.status, 'active'),
          eq(permissions.key, permissionKey),
        ),
      )
      .limit(1);
    if (!row) throw denied();
    return { id: row.membership.id, role: row.role };
  }
}
