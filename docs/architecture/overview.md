# Architecture overview

**Authority:** Technical architecture extracted from source sections 1–2 and cross-cutting requirements. Unresolved source issues are listed at the end for M002; no conflict is silently resolved here.

## Purpose and scope

Build an executable, tested, deployable reusable NestJS backend starter for consumer applications, SaaS, admin dashboards, mobile applications, and multi-organization platforms. It must provide a complete technical foundation for identity, account and organization management, memberships, roles and permissions, sessions, email verification and recovery, API validation, logging, health checks, migrations, tests, and Kubernetes deployment. A demonstrative tenant-scoped resource establishes reusable business-module patterns.

The initial product is a modular monolith and a single deployable backend. Public APIs are REST/JSON and contract-first. Modules have explicit dependency-injection boundaries; tenant isolation, secure defaults, database-enforced invariants, stateless replicas, production/local parity, and business-logic independence from transport, JWT libraries, and mail vendors are architectural requirements. Avoid abstractions without a real need.

## Application layering

| Layer | Responsibility |
| --- | --- |
| Controller | HTTP routes, DTOs, status codes, OpenAPI metadata |
| Application service | Use-case orchestration and transactions |
| Domain/policy | Invariants, permissions, ownership rules |
| Repository | Tenant-scoped Drizzle/PostgreSQL operations |
| Infrastructure | Database, cryptography, email, configuration, external services |

Modules may use flat files or deeper internal structures according to complexity. Controllers call application services; services use repositories, policies, and infrastructure interfaces; repositories use Drizzle. Do not reach into another module's repository. Cross-module operations use exported services or explicit interfaces. Do not routinely use `forwardRef`; shared schema types do not transfer write ownership.

## Explicit scope boundaries

Do not build microservices, Kafka, GraphQL, event sourcing, full CQRS, distributed cache, a general workflow engine, or complex job processing in the initial starter. Social OAuth, enterprise SSO, billing, subscriptions, file storage, and external API keys are future extensions. Preserve extension points only when they have immediate architectural value. Background jobs and cache are deferred; the narrowly scoped email outbox is specified in [Email](email.md).

## Source implementation phases

Original §20 sequences the feature work as: (1) project bootstrap; (2) HTTP/API foundation; (3) database infrastructure; (4) identity and sessions; (5) organizations and authorization; (6) email and auditing; (7) example tenant resource; (8) security and observability; (9) production deployment; (10) final verification and documentation. Its acceptance outcomes range from clean install/start/build/typecheck, functional validation/errors/logging/OpenAPI, migrations/seeds and PostgreSQL tests, full auth lifecycle and concurrency tests, tenant isolation and owner invariants, email retries/audit, authorized CRUD and pagination, multi-instance security/observability, staging deployment and migration behavior, through all release gates and final security/operations documentation. M003 must translate these source phases and outcomes into ordered milestone contracts while honoring the Stage 00 and progress rules in `AGENTS.md`.

## Source section map

| Original sections | Destination |
| --- | --- |
| 1–2, 20–21 cross-cutting conventions | This document |
| 3, 4.3, 21.2 | [Project structure](project-structure.md) |
| 1.2, 4, 11 | [Technology stack](technology-stack.md) |
| 5 | [Database](database.md) |
| 6 | [Authentication](authentication.md) |
| 7 | [Authorization](authorization.md) |
| 5.2, 8 | [Multi-tenancy](multi-tenancy.md) |
| 9–10 | [API conventions](api-conventions.md) |
| 13 | [Security](security.md) |
| 12 | [Email](email.md) |
| 14 | [Observability](observability.md) |
| 17–19, operational parts of 16 | [Deployment](deployment.md) |
| 15, testing parts of 16 | [Testing](testing.md) |

## Reconciliation record

- **Pasted search-result artifacts:** The repeated favicon/search-result snippets in the reference are extraction artifacts, not project requirements. They are excluded from derived architecture. The historical source remains byte-for-byte preserved; no substantive requirement was taken from those snippets.
- **Truncated §21.3:** The sentence ends after “must receive explicit tenant”. The enforceable rule is fully stated elsewhere in source §5.2 and repeated immediately before the truncation: tenant repositories receive explicit organization scope and apply it to every operation. The missing continuation is unrecoverable and adds no known requirement; it is not reconstructed. See [Database](database.md).
- **Source phases versus milestone workflow:** The ten source phases are retained as the capability sequence for M003 to map into stable, dependency-ordered milestones. They do not override Stage 00, reserved milestone IDs, one-milestone execution, progress invariants, or AGENTS.md completion gates.
- **Repository scaffold stack (resolved in M005):** The generated Express/Vitest scaffold was replaced with the approved Fastify/Jest baseline and startup validation. Drizzle/PostgreSQL client integration remains assigned to M008; Compose provides local PostgreSQL only.
- **PostgreSQL driver:** The source's explicit technology decision selects `postgres.js`; its later dependency table lists `pg` as an alternative candidate. Drizzle documents support for both drivers. The explicit selection governs, recorded in [ADR-001](../decisions/ADR-001-postgres-js-driver.md). Verify the selected stable versions, pooling behavior, and deployment compatibility during bootstrap.
- **OpenAPI version:** OpenAPI 3.1 remains the target. A generated artifact must be validated as 3.1, including schema dialect/nullable behavior, before it is labeled 3.1. If the selected Nest/Zod generator cannot produce a valid 3.1 document, use and accurately declare the version it supports, record the limitation, and keep 3.1 as a future compatibility target. No version-specific package choice is made before M003 selects the toolchain.
