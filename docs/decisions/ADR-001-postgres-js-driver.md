# ADR-001 — Use postgres.js as the Drizzle PostgreSQL driver

**Status:** Accepted
**Date:** 2026-10-13

## Context

The preserved specification's technology decision table (§1.2) names `postgres.js`. Its package candidate table (§4.1) names `pg`, creating an apparent conflict. The project mandates PostgreSQL and Drizzle but does not otherwise prescribe a driver. The current repository scaffold has neither database driver.

Drizzle's official [PostgreSQL guide](https://orm.drizzle.team/docs/get-started-postgresql) documents native support for both `node-postgres` (`pg`) and `postgres.js`, including use of an existing driver client. The drivers have behavior differences; for example, the guide notes prepared statements are enabled by default in `postgres.js`, which may require configuration in some environments.

## Decision

Use the `postgres.js` package and Drizzle's `drizzle-orm/postgres-js` integration as the initial PostgreSQL driver. The explicit selected-technology table governs over the later candidate dependency list. Configure one bounded application-lifetime pool/client, inject the typed Drizzle instance, and close it during graceful shutdown as required by the database architecture.

## Consequences

- The implementation and migration tooling use one consistent driver/API line; do not mix `pg` examples or APIs into the application.
- The bootstrap milestone must verify compatible stable package versions, transaction lifecycle, connection limits, prepared statement behavior, and the chosen deployment/database pooler.
- Switching drivers later requires a documented decision and verification of type parsing, transaction semantics, and pool lifecycle.

## Affected requirements

- Original architecture §§1.2, 4.1, 5.3.
- [`docs/architecture/technology-stack.md`](../architecture/technology-stack.md).
- [`docs/architecture/database.md`](../architecture/database.md).
