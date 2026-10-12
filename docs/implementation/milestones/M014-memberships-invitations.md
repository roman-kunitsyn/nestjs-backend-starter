# M014 — Memberships and Invitations

**Stage:** 05 — Organizations and Authorization
**Status:** pending
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

- [ ] Admin operations require active org membership and relevant permissions; callers cannot self-assign roles.
- [ ] Invitation has one-use expiring token digest; acceptance requires authenticated proof of invited address and atomically creates/reactivates membership.
- [ ] Expired, revoked, reused, or unauthorized invitations fail without state changes; conflicting active invitations are prevented.
- [ ] Remove/demote/suspend/leave and ownership transfer preserve at least one active owner under concurrency.
- [ ] Existing-user and new-user invite flows work; switching organizations does not require new login or mutable global auth state.
- [ ] Cross-tenant membership/resource IDs are denied and do not disclose existence.

## Verification

Run PostgreSQL concurrency/transaction tests and membership/invitation E2E matrix, including duplicate acceptance and owner edge cases; lint/typecheck/build/OpenAPI check.

## Completion checklist

- [ ] API docs and permission matrix updated; tests pass; staged changes reviewed.
