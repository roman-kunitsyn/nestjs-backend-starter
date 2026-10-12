# M012 — Permission Model and Authorization Policies

**Stage:** 05 — Organizations and Authorization
**Status:** pending
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

- [ ] Missing/invalid auth yields 401; explicitly forbidden requests yield 403; concealed cross-tenant resources yield 404 where specified.
- [ ] Permissions are resolved against current active membership and organization state, not trusted long-lived role claims alone.
- [ ] Sensitive use cases call centralized service policies even when route guards/decorators are present.
- [ ] OWNER/ADMIN/MEMBER/VIEWER permission sets are seeded/documented and least-privilege behavior tested.
- [ ] No undocumented platform admin bypass exists.

## Verification

Run policy unit tests and authenticated/anonymous/forbidden Fastify E2E cases; lint/typecheck/build.

## Completion checklist

- [ ] Permission documentation and tests match behavior; progress and staged diff reviewed.
