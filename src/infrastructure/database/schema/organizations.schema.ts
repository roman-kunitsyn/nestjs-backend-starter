import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  invitationStatus,
  organizationStatus,
  membershipStatus,
} from './enums.js';
import { users } from './identity.schema.js';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    normalizedSlug: varchar('normalized_slug', { length: 100 }).notNull(),
    status: organizationStatus('status').notNull().default('active'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('organizations_normalized_slug_uq').on(table.normalizedSlug),
    uniqueIndex('organizations_id_slug_uq').on(table.id, table.slug),
    check('organizations_slug_ck', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      'organizations_reserved_slug_ck',
      sql`normalized_slug = slug AND normalized_slug NOT IN ('admin', 'system', 'api')`,
    ),
  ],
);

export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: membershipStatus('status').notNull().default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('organization_memberships_org_user_uq').on(
      table.organizationId,
      table.userId,
    ),
    uniqueIndex('organization_memberships_id_org_uq').on(
      table.id,
      table.organizationId,
    ),
    index('organization_memberships_user_status_idx').on(
      table.userId,
      table.status,
    ),
    index('organization_memberships_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 64 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('roles_key_uq').on(table.key)],
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('permissions_key_uq').on(table.key)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      name: 'role_permissions_pk',
      columns: [table.roleId, table.permissionId],
    }),
  ],
);

export const membershipRoles = pgTable(
  'membership_roles',
  {
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => organizationMemberships.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      name: 'membership_roles_pk',
      columns: [table.membershipId, table.roleId],
    }),
    uniqueIndex('membership_roles_one_role_uq').on(table.membershipId),
  ],
);

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 320 }).notNull(),
    normalizedEmail: varchar('normalized_email', { length: 320 }).notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    tokenDigest: text('token_digest').notNull(),
    invitedByMembershipId: uuid('invited_by_membership_id').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    status: invitationStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('organization_invitations_token_digest_uq').on(
      table.tokenDigest,
    ),
    foreignKey({
      name: 'organization_invitations_inviter_org_fk',
      columns: [table.invitedByMembershipId, table.organizationId],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
      ],
    }).onDelete('restrict'),
    index('organization_invitations_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('organization_invitations_email_status_idx').on(
      table.normalizedEmail,
      table.status,
    ),
    uniqueIndex('organization_invitations_pending_email_uq')
      .on(table.organizationId, table.normalizedEmail)
      .where(sql`status = 'pending'`),
    check(
      'organization_invitations_state_ck',
      sql`(status = 'pending' AND accepted_at IS NULL AND revoked_at IS NULL) OR (status = 'accepted' AND accepted_at IS NOT NULL AND revoked_at IS NULL) OR (status = 'revoked' AND accepted_at IS NULL AND revoked_at IS NOT NULL)`,
    ),
  ],
);
