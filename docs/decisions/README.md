# Architecture decisions

Accepted architecture decisions are recorded here as `ADR-NNN-title.md` files. Each ADR should state its status, context, decision, consequences, and affected requirements. Do not record a proposal as accepted before reconciliation and approval.

## Accepted decisions

- [ADR-001 — PostgreSQL driver](ADR-001-postgres-js-driver.md): use the `postgres.js` driver with Drizzle, following the source's explicit technology selection.
- [ADR-002 — Separate template verification from consumer deployment evidence](ADR-002-template-versus-production-verification.md): M020 and M022 verify the reusable chart and recovery behavior with disposable local infrastructure; M021 verifies GitHub CI, GHCR artifacts, security checks, repository rulesets, environment governance, and workflow safety. Live cloud infrastructure and provider-specific recovery are adopter responsibilities.
