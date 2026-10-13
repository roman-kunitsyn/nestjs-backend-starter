# M016 — Tenant-Scoped Example Resources

**Stage:** 07 — Example Resource
**Status:** completed
**Dependencies:** M015

## Objective

Implement the demonstrative tenant-owned resource module that proves reusable CRUD, policy, pagination, and isolation conventions.

## Scope

- Example resource schema/repository/service/controller, create/list/detail/update/delete routes.
- Creator membership composite FK, owner/admin/member/viewer ownership policy, Zod request/response schemas, cursor pagination, filtering/sorting allowlists and OpenAPI.
- Reusable selected-endpoint idempotency mechanism with actor/organization scope, request fingerprint, atomic result recording, retention, and payload mismatch rejection; apply it to resource creation.
- Versioned idempotency persistence schema/migration required by the mechanism.

## Out of scope

- Additional business domains, global search, unapproved data export or workflow features.

## Architecture references

- [Database](../../architecture/database.md), [multi-tenancy](../../architecture/multi-tenancy.md), [authorization](../../architecture/authorization.md), [API conventions](../../architecture/api-conventions.md), [testing](../../architecture/testing.md); source §§5.4, 7, 9–10, 15, 21.

## Deliverables

- Complete example module and reusable tenant-isolation test matrix.

## Acceptance criteria

- [x] Every repository operation accepts explicit org context and includes it in SQL predicates/mutations.
- [x] Composite FK rejects creator membership from another organization.
- [x] OWNER/ADMIN with permission can update any allowed resource; MEMBER is ownership-limited; VIEWER is read-only.
- [x] CRUD uses documented statuses/Problem Details and generated OpenAPI contracts.
- [x] Cursors are opaque, validated, query/tenant-bound, stable with `(created_at,id)` tie-breaker, default 20/max 100.
- [x] Filtering/sorting allowlists reject unsupported fields; no raw user identifier interpolation.
- [x] Repeated identical idempotency requests do not create duplicate resources; key reuse with a different payload is rejected.
- [x] Standard cross-tenant, removed-member, inactive-org, viewer-write, and valid-UUID/wrong-org tests pass.

## Verification

Run unit policy/pagination tests, PostgreSQL integration constraints, full two-tenant Fastify E2E matrix, OpenAPI check, lint/typecheck/build.

## Completion checklist

- [x] Module docs and test evidence complete; staged diff reviewed.

## Verification results

- Unit: 31 tests passed.
- PostgreSQL integration: 10 tests passed, including the existing composite creator-membership FK rejection.
- Fastify E2E: 19 tests passed, including two-organization isolation, suspended member and organization rejection, member ownership, viewer write denial, CRUD, cursor filtering/order/query binding, and idempotency replay/mismatch/expiry reuse.
- OpenAPI artifacts generated and freshness check passed with Problem Details errors documented on resource routes.
- Lint, Prettier check, strict typecheck, Nest build, Drizzle migration check, and 11 progress regression tests passed.

## Implementation notes

- M009's resource table and composite creator-membership FK were reused. M016 adds `idempotency_records` in migration `0003_rapid_nova.sql`, scoped by organization and actor, with a request hash, result body/status, and configurable `RESOURCE_IDEMPOTENCY_RETENTION_HOURS` expiry (default 24).
- Resource queries and mutations take the organization ID explicitly. Detail and mutation lookup constrain both resource and organization; list uses the organization predicate before filtering and stable `(created_at,id)` keyset ordering. A strict Zod response schema projects all database results to the public resource contract.
- Signed cursors bind tenant, status/search filters, sort, and order. The shared `RESOURCE_CURSOR_SECRET` must be stable across replicas and is validated as a production secret.
- Create requires `Idempotency-Key`; the reusable `IdempotencyService` writes the resource and replay response in one transaction. Canonical JSON fingerprints ignore object property order. Matching retries replay the original response, changed payloads conflict, and expired scoped keys are removed and reusable.
- OWNER and ADMIN can modify any tenant resource with a current permission. MEMBER writes are limited to their creator membership and VIEWER is read-only. Tenant and organization status checks are performed on each request.
