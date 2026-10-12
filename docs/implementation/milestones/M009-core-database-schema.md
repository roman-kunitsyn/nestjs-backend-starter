# M009 — Core Schema, Migrations, and Seeds

**Stage:** 03 — Database Infrastructure
**Status:** pending
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

- [ ] Every required core table and field/constraint in database architecture is represented; all tenant-owned tables have non-null `organization_id`.
- [ ] Membership/resource composite constraints prevent cross-organization foreign-key references; uniqueness, checks, indexes, and delete semantics are explicit.
- [ ] Applied migrations preserve deployed history and a clean database can migrate from zero.
- [ ] Reference seed is idempotent; dev seed is explicit and refuses production execution.
- [ ] Integration tests verify constraints, rollback, role/membership relationships, and migration behavior.

## Verification

Run fresh PostgreSQL migration, repeated seed, constraints/index introspection, rollback and tenant-FK integration tests, lint/typecheck/build.

## Completion checklist

- [ ] Schema docs and traceability are current; tests pass; staged changes reviewed.
