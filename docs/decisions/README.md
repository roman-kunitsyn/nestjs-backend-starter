# Architecture decisions

Accepted architecture decisions are recorded here as `ADR-NNN-title.md` files. Each ADR should state its status, context, decision, consequences, and affected requirements. Do not record a proposal as accepted before reconciliation and approval.

## Accepted decisions

- [ADR-001 — PostgreSQL driver](ADR-001-postgres-js-driver.md): use the `postgres.js` driver with Drizzle, following the source's explicit technology selection.
- [ADR-002 — Separate template verification from production deployment evidence](ADR-002-template-versus-production-verification.md): M020 verifies reusable deployment and recovery behavior with local ephemeral infrastructure; M021 verifies GitHub CI/release/environment configuration and workflow safety; M022 retains actual staging and managed PostgreSQL recovery as project-completion gates.
