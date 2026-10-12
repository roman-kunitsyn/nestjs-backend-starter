import {
  index,
  inet,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sessionRevocationReason, userStatus } from './enums.js';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    normalizedEmail: varchar('normalized_email', { length: 320 }).notNull(),
    passwordHash: text('password_hash'),
    displayName: varchar('display_name', { length: 200 }),
    emailVerifiedAt: timestamp('email_verified_at', {
      withTimezone: true,
      mode: 'date',
    }),
    status: userStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_normalized_email_uq').on(table.normalizedEmail),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenDigest: text('refresh_token_digest').notNull(),
    familyId: uuid('family_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    revocationReason: sessionRevocationReason('revocation_reason'),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
  },
  (table) => [
    index('auth_sessions_user_created_idx').on(table.userId, table.createdAt),
    uniqueIndex('auth_sessions_token_digest_uq').on(table.refreshTokenDigest),
    index('auth_sessions_family_idx').on(table.familyId),
  ],
);

export const refreshTokenHistory = pgTable(
  'refresh_token_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    tokenDigest: text('token_digest').notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    reuseDetectedAt: timestamp('reuse_detected_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    uniqueIndex('refresh_token_history_digest_uq').on(table.tokenDigest),
    index('refresh_token_history_session_rotated_idx').on(
      table.sessionId,
      table.rotatedAt,
    ),
  ],
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenDigest: text('token_digest').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('email_verification_tokens_digest_uq').on(table.tokenDigest),
    index('email_verification_tokens_user_idx').on(table.userId),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenDigest: text('token_digest').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_digest_uq').on(table.tokenDigest),
    index('password_reset_tokens_user_idx').on(table.userId),
  ],
);
