# M012 — Permission Model and Authorization Policies

**Stage:** 05 — Organizations and Authorization
**Status:** completed
**Dependencies:** M011

## Objective

Implement deny-by-default permission-based RBAC and centralized, testable organization/resource policy evaluation.

## Scope

- Role-to-permission resolution and membership-role lookup; initial OWNER/ADMIN/MEMBER/VIEWER policy definitions.
- Global auth guard with explicit public routes; permission metadata/decorators plus application-service enforcement.
- Authorization errors using 401/403/404 semantics and non-disclosure rules.
- Explicit distinction between organization roles and any future platform-admin mechanism.

## Out of scope

- Organization and membership management endpoints (M013–M014), implicit platform-wide access.

## Architecture references

- [Authorization](../../architecture/authorization.md), [multi-tenancy](../../architecture/multi-tenancy.md), [database](../../architecture/database.md); source §§5.4, 7.

## Deliverables

- Policy services, guards/decorators, role/permission definitions, unit and integration tests.

## Acceptance criteria

- [x] Missing/invalid auth yields 401; explicitly forbidden requests yield 403; concealed cross-tenant resources yield 404 where specified.
- [x] Permissions are resolved against current active membership and organization state, not trusted long-lived role claims alone.
- [x] Sensitive use cases call centralized service policies even when route guards/decorators are present.
- [x] OWNER/ADMIN/MEMBER/VIEWER permission sets are seeded/documented and least-privilege behavior tested.
- [x] No undocumented platform admin bypass exists.

## Verification

Run policy unit tests and authenticated/anonymous/forbidden Fastify E2E cases; lint/typecheck/build.

## Completion checklist

- [x] Permission documentation and tests match behavior; progress and staged diff reviewed.

## Implementation notes

- Global authorization uses explicit `@Public()` metadata. Permission metadata requires an organization route parameter and is checked against current database membership, organization status, and role grants.
- Service methods `assertPermission` and `assertAll` are available for use-case-level checks. Tenant resource handlers remain responsible for concealed `404` behavior after tenant-scoped lookup.
- No platform administrator role or bypass is defined.
