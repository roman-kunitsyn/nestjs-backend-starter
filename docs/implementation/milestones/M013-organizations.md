# M013 — Organization Lifecycle and Ownership

**Stage:** 05 — Organizations and Authorization
**Status:** pending
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

- [ ] Registration remains independent; no automatic personal organization is created.
- [ ] Organization create and initial active OWNER membership commit atomically.
- [ ] Organization routes validate active membership and explicit permissions; each tenant-owned query scopes organization ID.
- [ ] Slugs are normalized/validated, unique, and reserved platform names rejected.
- [ ] An active organization is created with an active owner; invariant-safe transaction/locking primitives are ready for member changes.
- [ ] Cross-organization UUID requests do not reveal resource existence.

## Verification

Run PostgreSQL transaction/constraint tests, two-tenant E2E, owner creation and organization state checks, OpenAPI checks, lint/typecheck/build.

## Completion checklist

- [ ] Organization operations documented; invariants and staged diff inspected.
