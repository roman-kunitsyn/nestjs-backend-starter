import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = Symbol('isPublic');
export const REQUIRED_PERMISSIONS = Symbol('requiredPermissions');

/** Explicitly opts an endpoint out of the global access-token guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Requires each permission in the active organization named in the route. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

export const ORGANIZATION_ROLES = [
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER',
] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Organization roles confer no platform-wide privileges. */
export const ORGANIZATION_ROLE_PERMISSIONS: Readonly<
  Record<OrganizationRole, readonly string[]>
> = {
  OWNER: [
    'organization:read',
    'organization:update',
    'organization:delete',
    'members:read',
    'members:invite',
    'members:remove',
    'members:roles:update',
    'resources:create',
    'resources:read',
    'resources:update',
    'resources:delete',
    'audit:read',
  ],
  ADMIN: [
    'organization:read',
    'organization:update',
    'members:read',
    'members:invite',
    'members:remove',
    'members:roles:update',
    'resources:create',
    'resources:read',
    'resources:update',
    'resources:delete',
    'audit:read',
  ],
  MEMBER: [
    'resources:create',
    'resources:read',
    'resources:update',
    'resources:delete',
  ],
  VIEWER: ['organization:read', 'members:read', 'resources:read', 'audit:read'],
};
