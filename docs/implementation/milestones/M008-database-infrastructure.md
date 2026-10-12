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

- [ ] One application-lifetime client/pool serves typed Drizzle; no per-request pool.
- [ ] Pool size/timeouts are typed configuration; shutdown closes connections; transaction and test override paths work.
- [ ] Drizzle Kit can generate and apply a migration; migration check detects drift where supported.
- [ ] Integration tests use PostgreSQL Testcontainers, not SQLite.
- [ ] Application startup does not execute migrations.

## Verification

Run DB provider lifecycle/unit tests, Testcontainers connectivity/transaction tests, migration generation and fresh DB migration, lint/typecheck/build.

## Completion checklist

- [ ] Database operations docs match commands; checks pass and relevant diff is staged/reviewed.
