# M013 — Organization Lifecycle and Ownership

**Stage:** 05 — Organizations and Authorization
**Status:** completed
**Dependencies:** M012

## Objective

Implement organization creation and management while enforcing tenant boundaries and the active-owner invariant.

## Scope

- Create organization and OWNER membership atomically; list current user's organizations; view/update organization and authorized suspend/archive paths.
- Slug normalization/reserved names, active organization checks, tenant context resolution by path.
- Transaction-safe owner-count/invariant foundation used by subsequent membership changes.

## Out of scope

- Invitations and full member management (M014), platform administrator capability.

## Architecture references

- [Multi-tenancy](../../architecture/multi-tenancy.md), [authorization](../../architecture/authorization.md), [database](../../architecture/database.md); source §§5.4–5.6, 7–8.

## Deliverables

- Organization module/controller/service/repository/policies, Zod/OpenAPI contracts and integration/E2E tests.

## Acceptance criteria

- [x] Registration remains independent; no automatic personal organization is created.
- [x] Organization create and initial active OWNER membership commit atomically.
- [x] Organization routes validate active membership and explicit permissions; each tenant-owned query scopes organization ID.
- [x] Slugs are normalized/validated, unique, and reserved platform names rejected.
- [x] An active organization is created with an active owner; invariant-safe transaction/locking primitives are ready for member changes.
- [x] Cross-organization UUID requests do not reveal resource existence.

## Verification

Run PostgreSQL transaction/constraint tests, two-tenant E2E, owner creation and organization state checks, OpenAPI checks, lint/typecheck/build.

## Completion checklist

- [x] Organization operations documented; invariants and staged diff inspected.

## Implementation notes

- Added organization create/list/detail/update and suspend/archive/activate routes with Zod input and response schemas and OpenAPI operations.
- Organization creation atomically writes the active organization, active membership, and OWNER assignment. It uses the existing reference OWNER role; missing reference data returns `503 SERVICE_UNAVAILABLE` without partial writes.
- Slugs are NFKC normalized, lowercased, converted to hyphen-separated form, and reject reserved platform slugs. Unique conflicts return `409`.
- Active membership is checked before detail/update permission checks. Cross-organization and unknown IDs share `404` behavior. Lifecycle permissions and membership are resolved while the organization row is locked; reactivation verifies that an active OWNER remains.
- Exported `lockForMembershipChange` and `assertActiveOwnerInvariant` establish the lock/check protocol for M014. Membership mutations must lock the organization row first and run the invariant check before commit.
- No migration was needed; M009 already created the organization and membership schema, uniqueness constraints, and reference role tables.
