# Stage 03 — Database Infrastructure

**Objective:** Provide lifecycle-safe PostgreSQL/Drizzle infrastructure, schema/migration conventions, core tables, and safe seed workflows.

**Prerequisites:** Stage 02. **Milestones:** M008–M009. **Outcome:** Fresh PostgreSQL setup is reproducible and integration-tested.

## Exit criteria

- Typed singleton database provider follows ADR-001, closes cleanly, and supports isolated tests.
- Migrations apply to a clean database; core keys, indexes, constraints, and transaction invariants are represented.
- Reference seeds are idempotent; development seeds cannot run in production; PostgreSQL Testcontainers checks pass.
