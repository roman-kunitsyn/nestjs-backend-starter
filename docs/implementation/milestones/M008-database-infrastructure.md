# M008 — PostgreSQL and Drizzle Infrastructure

**Stage:** 03 — Database Infrastructure
**Status:** pending
**Dependencies:** M007

## Objective

Provide a typed, lifecycle-safe PostgreSQL connection and Drizzle migration/test foundation.

## Scope

- Implement ADR-001 `postgres.js` client and Drizzle provider with bounded pool, injection token, transactions, graceful close, and test substitution.
- Configure Drizzle Kit, migration generation/execution/check scripts, and Testcontainers PostgreSQL setup.
- Document local database, migration, and connection-budget behavior.

## Out of scope

- Core business schema (M009), automatic migrations on app startup, repositories for feature modules.

## Architecture references

- [Database](../../architecture/database.md), [deployment](../../architecture/deployment.md), [testing](../../architecture/testing.md), [ADR-001](../../decisions/ADR-001-postgres-js-driver.md); source §5.

## Deliverables

- Database module/provider, Drizzle config, migration commands, PostgreSQL test harness, operations docs.

## Acceptance criteria

- [x] One application-lifetime client/pool serves typed Drizzle; no per-request pool.
- [x] Pool size/timeouts are typed configuration; shutdown closes connections; transaction and test override paths work.
- [ ] Drizzle Kit can generate and apply a migration; migration check detects drift where supported. **Blocked:** M008 excludes business schemas and M009, the first schema milestone, is sequenced after M008. `db:generate` currently reports no schema files; no real migration can be generated or applied without either pulling M009 scope forward or providing an approved migration fixture.
- [x] Integration tests use PostgreSQL Testcontainers, not SQLite.
- [x] Application startup does not execute migrations.

## Execution record — 2026-10-13

Implemented the singleton postgres.js/Drizzle provider, typed pool configuration, shutdown lifecycle, injectable database token, Drizzle Kit configuration and scripts, migration runner, PostgreSQL 18 Testcontainers harness, and database operations documentation.

Verification passed: formatting, lint, strict typecheck, build, 14 unit tests, 11 Fastify E2E tests, progress validation and regression tests, `drizzle-kit check`, and one PostgreSQL 18 Testcontainers check covering connectivity, transaction execution, and applying an isolated migration fixture to a fresh database. Docker access required elevated execution and was available after approval.

M008 remains blocked by the migration-generation acceptance criterion: the schema glob has no files because core schemas are M009 scope. `pnpm db:generate` fails with “No schema files found”. The migration runner was verified with an isolated fixture, but generating a migration through Drizzle Kit against the project configuration is not verified. Resolve the sequencing/fixture decision before completing M008; do not mark this criterion passed by assumption.

## Verification

Run DB provider lifecycle/unit tests, Testcontainers connectivity/transaction tests, migration generation and fresh DB migration, lint/typecheck/build.

## Completion checklist

- [ ] Database operations docs match commands; migration acceptance gate passes; relevant diff is staged/reviewed.
