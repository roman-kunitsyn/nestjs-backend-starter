# Database architecture

**Source:** Original specification §5.

## PostgreSQL and Drizzle

Use one PostgreSQL database and shared schema. Global records include users, organizations, sessions, and authentication tokens; tenant records reference an organization. Use UUID primary keys, `timestamptz`, UTC instants, `snake_case` SQL names and `camelCase` TypeScript properties, explicit foreign keys/unique/check constraints/indexes, versioned migrations, bounded pools, and transactions for multi-step changes. Prefer database-generated timestamps where consistency benefits. Define `ON DELETE` behavior; preserve historical integrity with restrictive deletes where appropriate.

Define schemas, indexes, constraints, and foreign keys in Drizzle or explicit SQL migration. One application-lifetime provider owns the pool and typed Drizzle instance, supports transactions and test substitution, and closes connections at shutdown. Do not create a pool per request. A Nest custom provider such as `DATABASE` is acceptable; an integration module is acceptable if it meets lifecycle/type-safety needs. Use Drizzle Kit for migration generation and execution. Never migrate automatically at application pod startup.

Every tenant table uses `id UUID`, `organization_id UUID NOT NULL`, and required created/updated timestamps, plus query-driven composite indexes such as `(organization_id, created_at, id)` and `(organization_id, status)`. Do not index without a query reason.

## Required core tables

| Table | Source requirements |
| --- | --- |
| `users` | UUID; display email plus required unique normalized email; nullable password hash for future external identities; optional display name and verified time; active/suspended/disabled status; timestamps. Normalize conservatively, never provider-specifically (for example Gmail dot stripping). Never expose the hash. |
| `organizations` | UUID, name (200), unique normalized/validated slug (100), active/suspended/archived status, creator FK, timestamps. Reserve platform slugs such as `admin`, `system`, `api`; retain UUIDs internally. |
| `organization_memberships` | UUID, organization/user FKs, active/suspended status, joined and audit timestamps; unique organization/user, unique `(id, organization_id)` for composite tenant FKs, indexes `(user_id,status)` and `(organization_id,status)`. Avoid casual deletion where audit history references membership. |
| `roles` | Global UUID role templates with unique key, name, optional description, system flag. Initial organization roles: OWNER, ADMIN, MEMBER, VIEWER. These are not platform roles. |
| `permissions` | UUID, unique key, optional description. Use colon names, e.g. organization read/update/delete; members read/invite/remove/roles:update; resources CRUD; audit:read. |
| `role_permissions` | Join table with `(role_id, permission_id)` primary key. |
| `membership_roles` | Join table with `(membership_id, role_id)` primary key. Initially enforce one role per membership in DB or transactionally; schema permits future multi-role support. |
| `auth_sessions` | UUID, user FK, refresh token digest and family UUID, created/last-used/expiry/revocation and reason, user agent, inet IP. Token is cryptographically random opaque, never JWT; store digest, optionally keyed per threat model; rotation atomic. |
| `refresh_token_history` | Session/token digest, rotation, expiry, reuse-detected timestamps; unique digest index. Retain consumed history for defined security window. Concurrent refresh needs row lock/CAS and narrowly bounded retry grace. |
| `email_verification_tokens`, `password_reset_tokens` | UUID, user FK, token digest, expiry, consumed/created times. Single-use random tokens; hash at rest; atomically expire/consume, rate limit generation and attempts. Password reset invalidates applicable credentials/sessions per policy. |
| `organization_invitations` | UUID, organization, normalized email, role, token digest, inviter, expiry/accept/revoke/create times. Single-use; invitee proves email ownership; transactional membership activation; reject expired/revoked/consumed; constrain inviter role authority and conflicting active invitations. |
| `audit_events` | Optional org, actor user and session, action, resource type/id, JSON metadata, request ID, inet IP, timestamp. Cover sensitive/admin actions; no credentials. Couple required event with state change transactionally when atomicity matters. |
| `example_resources` | UUID, organization, creator membership, title/description/status/timestamps. Composite FK `(created_by_membership_id, organization_id)` to membership `(id, organization_id)`. Demonstrates tenant-safe CRUD, ownership, pagination. |

The starter must add transactional `email_outbox` storage as specified in [Email](email.md).

The implemented Drizzle definitions are under `src/infrastructure/database/schema/`. PostgreSQL enum types constrain lifecycle states; checks constrain organization slug format/reserved values, invitation state consistency, and outbox attempts/status. `example_resources` and invitation inviter references use composite `(membership_id, organization_id)` foreign keys so a valid membership from another organization cannot satisfy the relationship. Memberships expose `(id, organization_id)` as a unique key for these references. Role assignments are limited to one role per membership by a unique membership index, while the join model remains relational. Reference role/permission data is installed with `pnpm db:seed:reference`; local-only fixtures require `pnpm db:seed:dev` and are rejected when `NODE_ENV=production`.

Invitation status and timestamps must be updated together. Outbox claims use `status`, `next_attempt_at`, and nullable `locked_until` with the dispatch index; claim/lease behavior belongs to the later email dispatcher milestone. These tables establish storage only and do not imply that account, invitation, audit, or email use cases already exist.

## Transactions and invariants

Use transactions for organization plus owner creation; invite acceptance plus membership; ownership change; member removal with last-owner protection; refresh rotation; reset-token consumption plus password update; and privileged changes plus required audit record. An active organization always has an active owner. Prevent removing, demoting, or suspending the last owner and reject transfer to unauthorized/inactive membership. Enforce concurrent safety using explicit locks, serializable transactions with retries, or equivalent; an out-of-transaction count check is insufficient.

Repositories handling tenant resources receive explicit organization scope and include it in reads/mutations. Never authorize from resource UUID alone. Keep migration history immutable after deployed. Integration tests use real PostgreSQL, never SQLite as substitute.

## Row-level security

PostgreSQL RLS is not required initially. Explain how it may be added as defense in depth. If adopted later, set tenant identity safely per transaction and ensure pooled connections cannot leak tenant context between requests.

## Source truncation

The reference ends §21.3 mid-sentence after “Repository methods handling organization resources must receive explicit tenant”. The enforceable requirement is nevertheless clear from §5.2 and the sentence's available beginning: repository methods receive explicit organization scope and apply it to tenant-owned operations. The missing continuation is unrecoverable and is not reconstructed; it contributes no additional known requirement.
