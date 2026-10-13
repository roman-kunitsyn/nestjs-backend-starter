# M014 — Memberships and Invitations

**Stage:** 05 — Organizations and Authorization
**Status:** completed
**Dependencies:** M013

## Objective

Deliver authorized organization member administration, invitation lifecycle, and membership departure while preserving ownership and tenant consistency.

## Scope

- List/update/remove members, role changes, leave organization, invite by normalized email, list/revoke/accept invitations.
- Authenticated invite acceptance with email ownership proof, role authority checks, expiry, one-use semantics, and transactional membership activation.
- Organization switching through URL context, not global active-org authorization state.
- Ownership transfer between eligible active memberships.

## Out of scope

- General RBAC implementation (M012), production email reliability (M015), platform admin features.

## Architecture references

- [Multi-tenancy](../../architecture/multi-tenancy.md), [authorization](../../architecture/authorization.md), [database](../../architecture/database.md), [API conventions](../../architecture/api-conventions.md); source §§5.4–5.6, 7–9.

## Deliverables

- Membership/invitation use cases and routes, permission matrix, Zod/OpenAPI contracts, transactional tests.

## Acceptance criteria

- [x] Admin operations require active org membership and relevant permissions; callers cannot self-assign roles.
- [x] Invitation has one-use expiring token digest; acceptance requires authenticated proof of invited address and atomically creates/reactivates membership.
- [x] Expired, revoked, reused, or unauthorized invitations fail without state changes; conflicting active invitations are prevented.
- [x] Remove/demote/suspend/leave and ownership transfer preserve at least one active owner under concurrency.
- [x] Existing-user and new-user invite flows work; switching organizations does not require new login or mutable global auth state.
- [x] Cross-tenant membership/resource IDs are denied and do not disclose existence.

## Verification

Run PostgreSQL concurrency/transaction tests and membership/invitation E2E matrix, including duplicate acceptance and owner edge cases; lint/typecheck/build/OpenAPI check.

## Completion checklist

- [x] API docs and permission matrix updated; tests pass; staged changes reviewed.

## Implementation notes

- Added organization-scoped member list, role update, removal, leave, ownership transfer, and invitation create/list/revoke/accept endpoints.
- Member removals and leaves suspend membership records. Organization row locks serialize ownership-changing operations with M013 lifecycle changes; owner presence is checked before commit.
- Invitation secrets are 256-bit random base64url values; only SHA-256 digests are stored. Acceptance requires a verified matching normalized account email and rechecks the inviter's current role and permission. It activates or creates membership and consumes the invitation in one transaction.
- Owners may grant ADMIN; ADMIN may grant only MEMBER/VIEWER and cannot change/remove owners. No endpoint directly grants OWNER.
- A failed email send revokes its pending invitation and returns a safe service-unavailable problem. M015 will make delivery durable through the outbox.
- Verification: format, lint, typecheck, unit, PostgreSQL integration, Fastify E2E, build, OpenAPI freshness, Drizzle migration consistency, and progress validation passed.
