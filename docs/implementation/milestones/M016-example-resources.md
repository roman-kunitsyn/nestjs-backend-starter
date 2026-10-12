# M016 — Tenant-Scoped Example Resources

**Stage:** 07 — Example Resource
**Status:** pending
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

- [ ] Every repository operation accepts explicit org context and includes it in SQL predicates/mutations.
- [ ] Composite FK rejects creator membership from another organization.
- [ ] OWNER/ADMIN with permission can update any allowed resource; MEMBER is ownership-limited; VIEWER is read-only.
- [ ] CRUD uses documented statuses/Problem Details and generated OpenAPI contracts.
- [ ] Cursors are opaque, validated, query/tenant-bound, stable with `(created_at,id)` tie-breaker, default 20/max 100.
- [ ] Filtering/sorting allowlists reject unsupported fields; no raw user identifier interpolation.
- [ ] Repeated identical idempotency requests do not create duplicate resources; key reuse with a different payload is rejected.
- [ ] Standard cross-tenant, removed-member, inactive-org, viewer-write, and valid-UUID/wrong-org tests pass.

## Verification

Run unit policy/pagination tests, PostgreSQL integration constraints, full two-tenant Fastify E2E matrix, OpenAPI check, lint/typecheck/build.

## Completion checklist

- [ ] Module docs and test evidence complete; staged diff reviewed.
