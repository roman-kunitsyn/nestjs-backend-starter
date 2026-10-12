import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import {
  organizationMemberships,
  organizations,
  membershipRoles,
  permissions,
  rolePermissions,
  roles,
} from '../../infrastructure/database/schema/organizations.schema.js';

const denied = () =>
  new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
  });

@Injectable()
export class PermissionService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Resolve current active membership, organization, and role state on every call. */
  async hasPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ) {
    const [grant] = await this.db
      .select({ permission: permissions.key })
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
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.status, 'active'),
          eq(organizations.status, 'active'),
          eq(permissions.key, permission),
        ),
      )
      .limit(1);
    return grant !== undefined;
  }

  async assertPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ) {
    if (!(await this.hasPermission(userId, organizationId, permission)))
      throw denied();
  }

  async assertAll(
    userId: string,
    organizationId: string,
    required: readonly string[],
  ) {
    for (const permission of required)
      await this.assertPermission(userId, organizationId, permission);
  }
}
