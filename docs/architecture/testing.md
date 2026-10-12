# Testing architecture

**Source:** Original specification §15 and testing requirements throughout §§5–21.

## Test categories

| Category | Purpose | Infrastructure |
| --- | --- | --- |
| Unit | Domain/service behavior | Mocks/fakes |
| Integration | SQL, constraints, transactions | Real PostgreSQL via Testcontainers matching supported production major |
| E2E | Full HTTP behavior | Nest + Fastify + PostgreSQL; Fastify injection or compatible client |
| Contract | OpenAPI correctness | Generated schema |
| Security | Auth, permissions, tenant boundaries | E2E/integration |
| Deployment smoke | Startup, health, migrations | Kubernetes staging |

Do not use SQLite instead of PostgreSQL integration coverage. Use dependency injection and fakes at infrastructure edges.

## Required behavioral coverage

Unit coverage includes password hashing/verification, JWT claims, refresh decisions, permission resolution, ownership policies, Zod schemas, pagination, org-owner rules, email rendering, and error mapping.

PostgreSQL integration checks: fresh migration, unique/FK constraints, rollback, tenant-scoped query isolation, role persistence, last-owner concurrency, atomic refresh rotation, duplicate invitation acceptance, and exclusive outbox claims.

E2E scenarios include register→verify→login→auth request; invalid password/disabled user; refresh/replay; logout/current and all; expiry/revocation; password recovery/change; multiple org membership and cross-tenant read/update by valid UUID; removed membership; role escalation; org creation; invite existing/new user, accept/expired/reuse/revoke; remove/demote/last owner/transfer; invalid body/unknown properties/malformed UUID/unsupported sort/invalid cursor/timestamp tie pagination; unexpected errors and DB outage.

Every tenant resource runs a reusable matrix: permitted own-tenant read, other-tenant read/write denied (normally 404 where concealment required), viewer write denied, removed member token denied, inactive org write denied, cross-tenant FK rejected, invalid org rejected, valid resource under wrong org denied, multiple-org permission context resolved correctly.

## Quality thresholds and scripts

Initial CI thresholds: statements 80%, branches 75%, functions 80%, lines 80%. Security-sensitive policies, crypto, session transitions, and tenancy need deeper behavioral coverage. Coverage percentage does not replace failure-path tests.

Expected functional commands are in [Deployment](deployment.md). CI must run available quality gates, PostgreSQL integration/E2E, migration/OpenAPI checks, build, and Helm lint. Report unavailable infrastructure as not verified, never as passed.
