# ADR-002 — Separate template verification from production deployment evidence

**Status:** Accepted
**Date:** 2026-10-13

## Context

M020 currently requires a staging deployment and a managed PostgreSQL restore rehearsal before the starter can advance to M021. The chart and recovery runbook are reusable template artifacts, while staging credentials, a Kubernetes service, ingress/DNS/TLS, and managed-database backup facilities belong to an adopting application's environment. M020 is blocked because those external environments are not configured. Treating their absence as a blocker prevents local verification of the template itself; treating local tests as production evidence would make an unsupported claim.

The project goal remains a production-oriented reusable starter. Security controls, rollout safety, backup/PITR requirements, and the requirement for real production-like evidence are retained. The amendment changes where each kind of evidence is required and what it proves.

## Decision

1. **M020 template-level verification:** require an ephemeral Kubernetes cluster created with kind or k3d and an isolated, disposable PostgreSQL instance. Verify chart install and upgrade with healthy rolling replacement, migration Job ordering and failure diagnosis, startup/readiness/liveness and shutdown drain behavior, configured TLS and external Secret references, restrictive pod/network policy behavior, application image rollback with a schema-compatible prior image, and the documented backup/restore procedure against the isolated database. Capture commands and results without production credentials or data. Do not describe this as a production deployment or managed-service PITR test.
2. **M022 environment-specific acceptance:** retain actual staging deployment evidence for production-like Kubernetes, ingress TLS, external secret delivery, migration, rollout, smoke, and image rollback. Retain an actual managed PostgreSQL backup/PITR restore rehearsal and record the recovery point, observed RPO/RTO, schema/migration validation, smoke result, and operator. These gates remain required before project status can become `completed`.
3. **Security and reliability invariants:** retain non-root/restricted pods, least-privilege service accounts and network policy, secret externalization, no public operational endpoints, bounded database connection budgets, separate one-shot migrations, expand/contract compatibility, no automatic schema rollback, backup encryption/access control, and explicit RPO/RTO ownership. Local fixtures must use isolated throwaway resources and synthetic credentials/data.

## M020 acceptance boundary

Replace M020's staging-only acceptance item with:

> An ephemeral kind or k3d cluster verifies install, healthy rolling upgrade, probe and shutdown drain behavior, migration Job ordering and failure diagnosis, TLS and external Secret references, applicable security policies, smoke checks, and rollback to a schema-compatible image. A disposable isolated PostgreSQL instance verifies the documented backup/restore procedure, migration state, and application smoke checks. Results identify these as template-level tests and do not claim managed-service PITR or production deployment verification.

Add an M020 note that real staging deployment and managed-service PITR evidence are reserved for M022 and remain mandatory there. Update Stage 09 exit criteria to require reproducible template-level deployment/recovery verification; keep production-like deployment and managed recovery evidence as M022 final acceptance gates.

## Affected documents

- `docs/implementation/milestones/M020-kubernetes-deployment.md`
- `docs/implementation/stages/stage-09-production-deployment.md`
- `docs/implementation/roadmap.md`
- `docs/implementation/milestones/M022-final-acceptance.md`
- `docs/architecture/deployment.md`
- `docs/architecture/database.md`
- `docs/implementation/requirements-matrix.md`
- `docs/decisions/README.md`

The source architecture reference remains unchanged. This is a verification-boundary amendment, not a removal of source requirements: production-like deployment and managed recovery remain explicit final acceptance requirements.

## Consequences

- M020 can be verified using reproducible local infrastructure and completed without claiming external production evidence.
- M021 may begin only after all revised M020 template-level criteria pass.
- M022 remains blocked from project completion until actual staging and managed PostgreSQL recovery evidence passes.
- Progress records will reflect the revised gates only after the amendment is approved and M020 evidence is collected.

## Approval

Approved explicitly by the project owner on 2026-10-13. The M020 template-level tests and M022 environment-specific gates are now the governing planning amendment.
