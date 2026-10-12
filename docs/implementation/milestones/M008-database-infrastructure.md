# M008 — PostgreSQL and Drizzle Infrastructure

**Stage:** 03 — Database Infrastructure
**Status:** completed
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
- [x] Drizzle Kit can generate and apply a migration; migration check detects drift where supported. A dedicated infrastructure-only probe schema under `test/fixtures/database` is generated to a temporary directory and applied to fresh PostgreSQL by the Testcontainers integration test. This fixture is test tooling, not application schema or production migration history; M009 remains the first business schema milestone.
- [x] Integration tests use PostgreSQL Testcontainers, not SQLite.
- [x] Application startup does not execute migrations.

## Execution record — 2026-10-13

Implemented the singleton postgres.js/Drizzle provider, typed pool configuration, shutdown lifecycle, injectable database token, Drizzle Kit configuration and scripts, migration runner, PostgreSQL 18 Testcontainers harness, and database operations documentation.

Verification passed: formatting, lint, strict typecheck, build, 14 unit tests, 11 Fastify E2E tests, progress validation and regression tests, `drizzle-kit check`, and one PostgreSQL 18 Testcontainers check covering connectivity, transaction execution, and applying an isolated migration fixture to a fresh database. Docker access required elevated execution and was available after approval.

The original generation blocker was resolved without moving business schema work forward: M008 now has an isolated fixture config and schema that Drizzle Kit generates into a temporary directory during the PostgreSQL integration test. The test applies that generated migration on PostgreSQL 18 and verifies the resulting table and a transaction. The normal application `pnpm db:generate` command continues to target the application schema and becomes useful when M009 introduces its first schema.

Final M008 verification passed: formatting, lint, strict typecheck, build, 14 unit tests, 11 Fastify E2E tests, one PostgreSQL 18 Testcontainers integration test (including generated migration application), `drizzle-kit check`, progress validation, and progress regression tests. Docker-backed integration verification ran with approved elevated access.

## Verification

Run DB provider lifecycle/unit tests, Testcontainers connectivity/transaction tests, migration generation and fresh DB migration, lint/typecheck/build.

## Completion checklist

- [x] Database operations docs match commands; all checks pass; progress is validated; relevant diff is staged/reviewed.
