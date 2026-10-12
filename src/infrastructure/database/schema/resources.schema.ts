import {
  check,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  organizationMemberships,
  organizations,
} from './organizations.schema.js';
import { authSessions, users } from './identity.schema.js';
import { resourceStatus } from './enums.js';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'restrict',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorSessionId: uuid('actor_session_id').references(() => authSessions.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 120 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata').notNull().default({}),
    requestId: varchar('request_id', { length: 200 }),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_events_org_created_id_idx').on(
      table.organizationId,
      table.createdAt,
      table.id,
    ),
    index('audit_events_actor_created_idx').on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const exampleResources = pgTable(
  'example_resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    createdByMembershipId: uuid('created_by_membership_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: resourceStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('example_resources_id_org_uq').on(
      table.id,
      table.organizationId,
    ),
    foreignKey({
      name: 'example_resources_creator_org_fk',
      columns: [table.createdByMembershipId, table.organizationId],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
      ],
    }).onDelete('restrict'),
    index('example_resources_org_created_id_idx').on(
      table.organizationId,
      table.createdAt,
      table.id,
    ),
    index('example_resources_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    template: varchar('template', { length: 100 }).notNull(),
    recipient: varchar('recipient', { length: 320 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    lastError: text('last_error'),
    lockedUntil: timestamp('locked_until', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    index('email_outbox_dispatch_idx').on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    check('email_outbox_attempt_count_ck', sql`attempt_count >= 0`),
    check(
      'email_outbox_status_ck',
      sql`status IN ('pending', 'processing', 'sent', 'failed')`,
    ),
  ],
);
