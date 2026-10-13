# Implementation roadmap

This is the approved finite implementation sequence. It maps the source specification's ten capability phases to the mandatory Stage 00 preparation process in `AGENTS.md`. Stage 01 begins at M005. Milestone IDs are stable; execute one eligible milestone per session and do not skip blocked or incomplete work.

## Stage overview

| Stage | Objective | Milestones | Exit outcome |
| --- | --- | --- | --- |
| [00 — Preparation](stages/stage-00-preparation.md) | Establish documentation, reconcile the architecture, plan scope, and enable deterministic execution. | M000–M004 | All Stage 00 exit criteria in `AGENTS.md` §5 pass. |
| [01 — Project bootstrap](stages/stage-01-project-bootstrap.md) | Align the generated repository with the approved stack and repeatable local workflow. | M005 | Clean install, app start, lint, typecheck, and build pass. |
| [02 — HTTP and API foundation](stages/stage-02-http-api.md) | Establish validated request boundaries, API errors, request correlation, logging, and OpenAPI. | M006–M007 | Demonstrable `/api/v1` contracts, Zod validation, Problem Details, logs, and generated contract. |
| [03 — Database infrastructure](stages/stage-03-database.md) | Provide PostgreSQL/Drizzle lifecycle, migrations, schemas, constraints, and seeds. | M008–M009 | Fresh PostgreSQL migrates and seeds; integration checks pass. |
| [04 — Identity and sessions](stages/stage-04-identity-sessions.md) | Deliver account credential lifecycle, JWT access, rotating refresh sessions, and revocation. | M010–M011 | Full authentication lifecycle and replay/concurrency cases pass. |
| [05 — Organizations and authorization](stages/stage-05-organizations-authorization.md) | Deliver RBAC, organization lifecycle, memberships, invitations, and owner invariants. | M012–M014 | Organization flows work with cross-tenant and concurrency tests. |
| [06 — Email and audit](stages/stage-06-email-audit.md) | Complete email adapters, transactional outbox, dispatch, and audit events. | M015 | Email retries and audit atomicity are verified. |
| [07 — Example resource](stages/stage-07-example-resource.md) | Demonstrate reusable tenant-scoped CRUD, ownership, and cursor pagination. | M016 | Complete authorized resource behavior and isolation tests pass. |
| [08 — Security and observability](stages/stage-08-security-observability.md) | Apply production security controls, health checks, metrics, and tracing hooks. | M017–M018 | Controls and operational signals behave correctly across replicas. |
| [09 — Production deployment](stages/stage-09-production-deployment.md) | Build secure container, Helm/Kubernetes deployment, migrations, and CI/CD. | M019–M021 | kind/k3d rollout, migration job, probes, security policies, compatible-image rollback, isolated PostgreSQL recovery, and release gates pass; actual environment-specific staging and managed recovery remain M022 final acceptance gates. |
| [10 — Final verification](stages/stage-10-final-verification.md) | Reconcile documentation and requirements, run complete checks, and perform final acceptance. | M022 | All release-blocking criteria pass and project status can be completed. |

## Ordered milestones and dependencies

Every milestone contract is linked below. The linear dependency chain is intentional: it makes ordering deterministic and ensures each stage hands a verified capability to the next.

| Order | Milestone | Stage | Depends on | Contract |
| ---: | --- | --- | --- | --- |
| 1 | M000 Documentation Structure | 00 | — | [M000](milestones/M000-documentation-structure.md) |
| 2 | M001 Architecture Decomposition | 00 | M000 | [M001](milestones/M001-architecture-decomposition.md) |
| 3 | M002 Architecture Reconciliation | 00 | M001 | [M002](milestones/M002-architecture-reconciliation.md) |
| 4 | M003 Complete Implementation Roadmap | 00 | M002 | [M003](milestones/M003-complete-implementation-roadmap.md) |
| 5 | M004 Execution Readiness | 00 | M003 | [M004](milestones/M004-execution-readiness.md) |
| 6 | M005 Project Bootstrap and Local Workflow | 01 | M004 | [M005](milestones/M005-project-bootstrap.md) |
| 7 | M006 Zod Request Validation and API Versioning | 02 | M005 | [M006](milestones/M006-zod-validation.md) |
| 8 | M007 Problem Details, Logging, and OpenAPI | 02 | M006 | [M007](milestones/M007-http-contracts.md) |
| 9 | M008 PostgreSQL and Drizzle Infrastructure | 03 | M007 | [M008](milestones/M008-database-infrastructure.md) |
| 10 | M009 Core Schema, Migrations, and Seeds | 03 | M008 | [M009](milestones/M009-core-database-schema.md) |
| 11 | M010 User Credentials and Account Lifecycle | 04 | M009 | [M010](milestones/M010-user-account-lifecycle.md) |
| 12 | M011 JWT Sessions and Refresh Rotation | 04 | M010 | [M011](milestones/M011-session-lifecycle.md) |
| 13 | M012 Permission Model and Authorization Policies | 05 | M011 | [M012](milestones/M012-authorization.md) |
| 14 | M013 Organization Lifecycle and Ownership | 05 | M012 | [M013](milestones/M013-organizations.md) |
| 15 | M014 Memberships and Invitations | 05 | M013 | [M014](milestones/M014-memberships-invitations.md) |
| 16 | M015 Email Delivery and Audit Outbox | 06 | M014 | [M015](milestones/M015-email-audit.md) |
| 17 | M016 Tenant-Scoped Example Resources | 07 | M015 | [M016](milestones/M016-example-resources.md) |
| 18 | M017 Application Security Controls | 08 | M016 | [M017](milestones/M017-security-controls.md) |
| 19 | M018 Health and Observability | 08 | M017 | [M018](milestones/M018-observability.md) |
| 20 | M019 Production Docker Image | 09 | M018 | [M019](milestones/M019-docker-image.md) |
| 21 | M020 Helm and Kubernetes Operations | 09 | M019 | [M020](milestones/M020-kubernetes-deployment.md) |
| 22 | M021 CI/CD and Release Safety | 09 | M020 | [M021](milestones/M021-cicd.md) |
| 23 | M022 Final Review and Acceptance | 10 | M021 | [M022](milestones/M022-final-acceptance.md) |

## Scope and change control

The roadmap covers the approved architecture and mandatory project instructions. It does not add deferred capabilities such as GraphQL, microservices, distributed cache, general job processing, social OAuth, SSO, billing, subscriptions, file storage, or API keys. M005 aligns the existing generated Express/Vitest scaffold with the approved Fastify/Jest stack before features. M010 may use injected console/test mail adapters to exercise account flows; M015 completes reliable outbox delivery and production SMTP. Final-stage work fixes defects and reconciles evidence without adding major capabilities. Any new requirement or architectural change must be documented, justified, assigned a new globally unique milestone ID, and approved before altering the plan.

Milestone acceptance criteria and verification are in each linked contract. Global completion gates are in [definition-of-done.md](definition-of-done.md); requirement-to-milestone coverage is in [requirements-matrix.md](requirements-matrix.md). `progress.json` records execution state, not a second roadmap.
