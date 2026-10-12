import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', [
  'active',
  'suspended',
  'disabled',
]);
export const organizationStatus = pgEnum('organization_status', [
  'active',
  'suspended',
  'archived',
]);
export const membershipStatus = pgEnum('membership_status', [
  'active',
  'suspended',
]);
export const sessionRevocationReason = pgEnum('session_revocation_reason', [
  'logout',
  'password_reset',
  'password_change',
  'account_disabled',
  'refresh_reuse',
  'admin',
]);
export const invitationStatus = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'revoked',
]);
export const resourceStatus = pgEnum('resource_status', ['active', 'archived']);
export const outboxStatus = pgEnum('outbox_status', [
  'pending',
  'processing',
  'sent',
  'failed',
]);
