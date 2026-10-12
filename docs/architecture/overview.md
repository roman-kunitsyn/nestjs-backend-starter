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

## Source issues reserved for M002

- The reference includes repeated pasted web search-result/favicons text in the middle of architecture requirements. It remains preserved in the reference; M002 should decide how to treat it as source noise.
- The last sentence of source §21.3 is truncated after “must receive explicit tenant”. M002 must record a complete rule from the unambiguous tenant-isolation requirements or explicitly document the truncation; M001 does not invent the missing text.
- Source §20 provides ten broad phases, while `AGENTS.md` mandates Stage 00 and a later full milestone plan. M003 must map those phase outcomes into the approved milestone structure.
- Source package suggestions and the starter repository's current dependencies differ (for example Express adapter versus required Fastify, Vitest versus Jest). Reconcile against higher-authority project instructions before implementation.
- OpenAPI is called 3.1 in the technology table but the source itself conditions that target on library support. Preserve this condition for explicit decision in M002.
