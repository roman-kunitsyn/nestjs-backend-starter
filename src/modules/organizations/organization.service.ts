import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import {
  membershipRoles,
  organizationMemberships,
  organizations,
  permissions as permissionRecords,
  rolePermissions,
  roles,
} from '../../infrastructure/database/schema/organizations.schema.js';
import { auditEvents } from '../../infrastructure/database/schema/resources.schema.js';
import { PermissionService } from '../auth/permission.service.js';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schemas.js';
import {
  organizationListItemResponseSchema,
  organizationResponseSchema,
} from './organization.schemas.js';

const notFound = () =>
  new NotFoundException({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Organization was not found',
  });

const unavailableOwnerRole = () =>
  new ServiceUnavailableException({
    code: 'SERVICE_UNAVAILABLE',
    message: 'Organization role data is unavailable',
  });

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  return 'cause' in error && isUniqueViolation(error.cause);
};

const publicOrganization = (organization: typeof organizations.$inferSelect) =>
  organizationResponseSchema.parse({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  });

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly permissions: PermissionService,
  ) {}

  async create(userId: string, input: CreateOrganizationInput) {
    try {
      return await this.db.transaction(async (tx) => {
        const [ownerRole] = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(eq(roles.key, 'OWNER'))
          .limit(1);
        if (!ownerRole) throw unavailableOwnerRole();

        const [organization] = await tx
          .insert(organizations)
          .values({
            name: input.name,
            slug: input.slug,
            normalizedSlug: input.slug,
            createdByUserId: userId,
          })
          .returning();
        if (!organization)
          throw new Error('Organization insert returned no row');

        const [membership] = await tx
          .insert(organizationMemberships)
          .values({ organizationId: organization.id, userId, status: 'active' })
          .returning();
        if (!membership)
          throw new Error('Owner membership insert returned no row');

        await tx.insert(membershipRoles).values({
          membershipId: membership.id,
          roleId: ownerRole.id,
        });
        await tx.insert(auditEvents).values({
          organizationId: organization.id,
          actorUserId: userId,
          action: 'organization.created',
          resourceType: 'organization',
          resourceId: organization.id,
          metadata: { slug: organization.slug },
        });

        return {
          ...publicOrganization(organization),
          membership: {
            id: membership.id,
            role: 'OWNER',
            status: 'active' as const,
          },
        };
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'That organization slug is already in use',
        });
      throw error;
    }
  }

  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        organization: organizations,
        membershipId: organizationMemberships.id,
        membershipStatus: organizationMemberships.status,
        role: roles.key,
      })
      .from(organizationMemberships)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMemberships.organizationId),
      )
      .leftJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .leftJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(eq(organizationMemberships.userId, userId));

    return rows.map(({ organization, membershipId, membershipStatus, role }) =>
      organizationListItemResponseSchema.parse({
        ...publicOrganization(organization),
        membership: { id: membershipId, role, status: membershipStatus },
      }),
    );
  }

  async get(userId: string, organizationId: string) {
    const organization = await this.requireMember(userId, organizationId);
    await this.permissions.assertPermission(
      userId,
      organizationId,
      'organization:read',
    );
    return publicOrganization(organization);
  }

  async update(
    userId: string,
    organizationId: string,
    input: UpdateOrganizationInput,
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        const locked = await this.lockForMembershipChange(tx, organizationId);
        if (locked.status !== 'active') throw notFound();
        await this.assertActiveMembership(tx, userId, organizationId);
        await this.assertMemberPermission(
          tx,
          userId,
          organizationId,
          'organization:update',
        );
        const [updated] = await tx
          .update(organizations)
          .set({ ...input, normalizedSlug: input.slug, updatedAt: new Date() })
          .where(
            and(
              eq(organizations.id, organizationId),
              eq(organizations.status, 'active'),
            ),
          )
          .returning();
        if (!updated) throw notFound();
        await tx.insert(auditEvents).values({
          organizationId,
          actorUserId: userId,
          action: 'organization.updated',
          resourceType: 'organization',
          resourceId: organizationId,
          metadata: {
            nameChanged: input.name !== locked.name,
            slugChanged: input.slug !== locked.slug,
          },
        });
        return publicOrganization(updated);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'That organization slug is already in use',
        });
      throw error;
    }
  }

  async changeStatus(
    userId: string,
    organizationId: string,
    action: 'suspend' | 'archive' | 'activate',
  ) {
    const requiredPermission =
      action === 'activate' ? 'organization:update' : 'organization:delete';

    return this.db.transaction(async (tx) => {
      // Membership changes in M014 must acquire this organization row lock before
      // changing owner roles/status so lifecycle and owner checks serialize.
      const locked = await this.lockForMembershipChange(tx, organizationId);
      if (locked.status === 'archived') throw notFound();
      await this.assertActiveMembership(tx, userId, organizationId);
      await this.assertMemberPermission(
        tx,
        userId,
        organizationId,
        requiredPermission,
      );
      if (action === 'suspend' && locked.status !== 'active')
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Organization is not active',
        });
      if (action === 'activate' && locked.status !== 'suspended')
        throw new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Organization is not suspended',
        });

      if (action === 'activate')
        await this.assertActiveOwnerInvariant(tx, organizationId);

      const status =
        action === 'suspend'
          ? 'suspended'
          : action === 'archive'
            ? 'archived'
            : 'active';
      const [updated] = await tx
        .update(organizations)
        .set({ status, updatedAt: new Date() })
        .where(eq(organizations.id, organizationId))
        .returning();
      if (!updated) throw notFound();
      await tx.insert(auditEvents).values({
        organizationId,
        actorUserId: userId,
        action: 'organization.status_changed',
        resourceType: 'organization',
        resourceId: organizationId,
        metadata: { action, previousStatus: locked.status, status },
      });
      return publicOrganization(updated);
    });
  }

  async requirePermission(
    userId: string,
    organizationId: string,
    permission: string,
  ) {
    const organization = await this.requireMember(userId, organizationId);
    if (organization.status !== 'active') throw notFound();
    await this.permissions.assertPermission(userId, organizationId, permission);
  }

  private async requireMember(userId: string, organizationId: string) {
    const [row] = await this.db
      .select({ organization: organizations })
      .from(organizations)
      .innerJoin(
        organizationMemberships,
        and(
          eq(organizationMemberships.organizationId, organizations.id),
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, 'active'),
        ),
      )
      .where(
        and(
          eq(organizations.id, organizationId),
          eq(organizations.status, 'active'),
        ),
      )
      .limit(1);
    if (!row) throw notFound();
    return row.organization;
  }

  private async hasActiveOwner(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    organizationId: string,
  ) {
    const [owner] = await tx
      .select({ membershipId: organizationMemberships.id })
      .from(organizationMemberships)
      .innerJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.status, 'active'),
          eq(roles.key, 'OWNER'),
        ),
      )
      .limit(1);
    return owner !== undefined;
  }

  /** Membership mutations must lock this row before changing owner state. */
  async lockForMembershipChange(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    organizationId: string,
  ) {
    const [organization] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)
      .for('update');
    if (!organization) throw notFound();
    return organization;
  }

  /** Call before commit after any membership/role mutation in an active org. */
  async assertActiveOwnerInvariant(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    organizationId: string,
  ) {
    const [organization] = await tx
      .select({ status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (
      organization?.status === 'active' &&
      !(await this.hasActiveOwner(tx, organizationId))
    )
      throw new ConflictException({
        code: 'ORGANIZATION_OWNER_REQUIRED',
        message: 'An active organization requires at least one active owner',
      });
  }

  private async assertMemberPermission(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    userId: string,
    organizationId: string,
    requiredPermission: string,
  ) {
    const [grant] = await tx
      .select({ permission: permissionRecords.key })
      .from(organizationMemberships)
      .innerJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(
        permissionRecords,
        eq(permissionRecords.id, rolePermissions.permissionId),
      )
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, 'active'),
          eq(permissionRecords.key, requiredPermission),
        ),
      )
      .limit(1);
    if (!grant)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
  }

  private async assertActiveMembership(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    userId: string,
    organizationId: string,
  ) {
    const [membership] = await tx
      .select({ id: organizationMemberships.id })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, 'active'),
        ),
      )
      .limit(1);
    if (!membership) throw notFound();
  }
}
