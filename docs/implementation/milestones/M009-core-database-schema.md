# M009 — Core Schema, Migrations, and Seeds

**Stage:** 03 — Database Infrastructure
**Status:** completed
**Dependencies:** M008

## Objective

Implement the complete foundational schema, constraints, indexes, reference data, and safe seed strategy required before feature modules.

## Scope

- Users, organizations, memberships, role/permission joins, sessions/token histories, verification/reset tokens, invitations, audit events, example resources, and outbox tables.
- UUID/timestamp/naming conventions, tenant-consistent composite foreign keys, explicit delete behavior, required indexes, and migration history.
- Idempotent reference roles/permissions and isolated development fixtures; no production default administrator.

## Out of scope

- Feature use cases/API controllers, migration execution from app pod startup, optional RLS enforcement.

## Architecture references

- [Database](../../architecture/database.md), [multi-tenancy](../../architecture/multi-tenancy.md); source §§5, 16.3.

## Deliverables

- Versioned schema/migrations and seed tooling, schema documentation, DB integration coverage.

## Acceptance criteria

- [x] Every required core table and field/constraint in database architecture is represented; all tenant-owned tables have non-null `organization_id`.
- [x] Membership/resource composite constraints prevent cross-organization foreign-key references; uniqueness, checks, indexes, and delete semantics are explicit.
- [x] Applied migrations preserve deployed history and a clean database can migrate from zero.
- [x] Reference seed is idempotent; dev seed is explicit and refuses production execution.
- [x] Integration tests verify constraints, rollback, role/membership relationships, and migration behavior.

## Implementation notes

- Added 15 PostgreSQL tables across identity, organizations/authorization, audit/resources, and email outbox schema modules. Global roles are seeded as OWNER, ADMIN, MEMBER, and VIEWER; invitation and outbox lifecycle constraints are explicit.
- Generated three ordered migrations because initial schema generation preceded the final FK, check, and index refinements. None have been deployed; all are required for a fresh database. The composite FK was moved after unique-index creation, and the `inet` type refinement uses explicit PostgreSQL SQL because Drizzle Kit emitted an invalid `undefined.inet` schema qualifier for the type alteration.
- Added reference and dev fixture seed modes. The local developer fixture has no credential and does not grant production access.
- Verification passed: formatting, lint, strict typecheck, build, unit tests (14), Fastify E2E tests (11), PostgreSQL Testcontainers integration (2), Drizzle migration check, and progress validator/regression tests (11). Integration coverage confirms migration from zero, reference/dev seed idempotency, production refusal, FK/check constraints, rollback, and index presence.

## Verification

Run fresh PostgreSQL migration, repeated seed, constraints/index introspection, rollback and tenant-FK integration tests, lint/typecheck/build.

## Completion checklist

- [ ] Schema docs and traceability are current; tests pass; staged changes reviewed.
