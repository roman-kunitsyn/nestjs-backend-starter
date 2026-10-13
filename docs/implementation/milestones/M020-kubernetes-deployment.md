# M020 — Helm and Kubernetes Operations

**Stage:** 09 — Production Deployment
**Status:** completed
**Dependencies:** M019

## Objective

Deliver and verify a reusable secure Helm deployment and recovery template using reproducible ephemeral Kubernetes and isolated PostgreSQL environments.

## Scope

- Helm Deployment, Service, Ingress, ConfigMap, secret references, ServiceAccount, HPA, PDB, NetworkPolicy, migration Job, optional email dispatcher CronJob.
- Probe/shutdown settings, rolling strategy, resources, autoscaling/database connection budgeting, TLS/proxy/rate-limit configuration.
- Migration expand/contract and release ordering; backup/PITR/restore operational plan, reproducible template-level Kubernetes verification, and isolated PostgreSQL recovery verification.

## Out of scope

- In-cluster production PostgreSQL, application pod migrations, concurrent production release automation (M021).

## Architecture references

- [Deployment](../../architecture/deployment.md), [database](../../architecture/database.md), [security](../../architecture/security.md), [observability](../../architecture/observability.md); source §18.

## Deliverables

- Helm chart/environment values, Kubernetes docs, migration and recovery procedures, and reproducible template-level deployment/recovery evidence.

## Acceptance criteria

- [x] Chart renders required resources and never deploys production DB in application chart.
- [x] Pods are non-root/restricted, network/secret controls applied, resources set, and no sensitive operational endpoint is routed through ingress.
- [x] Startup/readiness/liveness probes map to app semantics; readiness drains before shutdown; HPA pool maximum is budgeted at 50 application connections.
- [x] Migration Job executes once before app rollout; app does not auto-migrate; failed schema is not automatically reversed with app rollback.
- [x] An ephemeral kind cluster verifies install, healthy rolling upgrade, probes and configured 45-second shutdown drain, migration Job ordering and failure diagnosis, TLS termination and external Secret references, NetworkPolicy allow/deny behavior, smoke checks, and rollback to a schema-compatible image. Cluster/tool versions and outcomes are recorded below.
- [x] Backup/RPO/RTO/restore process is documented; actual restore rehearsal remains required before final acceptance.
- [x] A disposable isolated PostgreSQL instance verifies the documented backup/restore procedure, migration state, and application smoke checks. The final custom-format dump and restore took 381 ms; synthetic recovery marker `synthetic-m020-final-restore` and all four migration records were present, and application readiness returned 200 against the restored database. This does not claim managed-service PITR.
- [x] Results identify all local cluster/database checks as template-level verification. Actual production-like staging deployment and managed PostgreSQL backup/PITR are consumer deployment responsibilities, not M022 gates.

## Verification

Run Helm lint/template and Kubernetes policy checks, then execute the chart in kind or k3d for migration ordering/failure, rollout, probes, TLS/secrets, security policies, smoke, shutdown/drain, and compatible-image rollback. Execute the documented backup/restore steps against a disposable isolated PostgreSQL instance. These tests verify the reusable template only. M022 repeats integrated local verification; provider deployment and managed-service PITR remain consumer responsibilities.

## Completion checklist

- [x] Operations docs and template-level evidence reviewed; M020 handoff is complete. Stage 09 remains in progress until M021 completes.

## Execution notes

- Implemented the Helm chart under `helm/nestjs-backend-starter` with Deployment, Service, ConfigMap, ServiceAccount, optional Ingress, HPA, PDB, NetworkPolicy, and a revision-scoped pre-install/pre-upgrade migration Job. Values configure replica/pool sizing, resources, probes, network selectors, ingress TLS, image digest, secret reference, and migration retry/deadline policy. The app chart does not contain PostgreSQL.
- Updated the production image to include only `scripts/migrate.mjs` and versioned SQL migrations for the separate migration Job. `.dockerignore` selectively includes that script. Updated the image smoke assertion to permit those migration artifacts while still excluding application source, tests, package tools, and development dependencies.
- Added Kubernetes release, secret, health endpoint, migration failure, rollback, backup/PITR, and restore-rehearsal procedures in `docs/operations/kubernetes.md`; linked them from migration docs and README.
- `helm lint`, default and TLS ingress `helm template`, and progress validation passed. Rebuilt the image; migration runner and migration journal were present under the non-root runtime. Read-only image smoke passed against local Compose PostgreSQL, including readiness and SIGTERM.
- **Planning amendment (ADR-002, amended 2026-10-13):** M020 requires reproducible kind or k3d and isolated-PostgreSQL verification. M022 repeats integrated local verification. Real staging deployment and managed PostgreSQL PITR are consumer deployment responsibilities, not template completion gates. Local evidence must not be described as production evidence.
- Chart verification found that the existing values declared HPA/PDB settings but the templates omitted those resources. Added `autoscaling/v2` HPA and `policy/v1` PDB templates, made `maxSurge: 1` / `maxUnavailable: 0` explicit, and bumped chart version to 0.2.1. Helm lint and render show HPA min/max 2/10 at 70% CPU, PDB minAvailable 1, migration Job, Ingress, and NetworkPolicy. At the default DB pool maximum of five, HPA maximum ten budgets 50 application connections. Dynamic CPU scaling was not exercised because the temporary cluster has no metrics-server; the HPA minimum was applied and two replicas were ready.
- kind v1.37.0 install and chart 0.2.0 rollout succeeded. Migration Jobs completed before their application rollouts. A deliberate invalid database password produced PostgreSQL auth error `28P01`; the pre-upgrade Job failed, Helm rejected the upgrade, and the previous release remained at 2/2 ready replicas. The corrected new-image upgrade succeeded, followed by Helm rollback to revision 10. Final revision 12 is deployed with the previous image, 2/2 replicas ready, `maxSurge=1`, and `maxUnavailable=0`.
- A temporary ingress-nginx controller terminated HTTPS with the generated self-signed `api.m020.test` certificate. On the final 0.2.1 Calico cluster, a request to `/api/v1/no-such` traversed TLS and returned the app's Problem Details 404. `/health/metrics` returned 404 and was not routed through the Ingress. Secret values were generated for this disposable cluster only.
- Calico v3.33.0 provided NetworkPolicy enforcement in a second ephemeral kind cluster. The final chart-rendered rule allowed the app-selected pod to connect to the selected database endpoint and denied traffic from a separate namespace. The main app pod ran as UID 1000 with zero effective capabilities, read-only root filesystem, RuntimeDefault seccomp, and no service-account token mount.
- **Correction record (2026-10-13):** final review found that the original default namespace/pod selectors matched all namespaces/pods and SMTP egress accepted all destinations. M020 was reopened before handoff. Defaults now target the `ingress-nginx`, `database`, and `kube-system` CoreDNS namespaces with specific workload labels; managed PostgreSQL and SMTP CIDR allowlists are supported, and SMTP egress is disabled unless an approved CIDR is configured. Re-rendered and reverified the corrected policy on the final Calico cluster: ingress from the selected ingress namespace and app-to-selected-database traffic were allowed; untrusted namespace ingress and default SMTP egress were denied.
- The final chart 0.2.1 install on kind v1.37.0 completed its migration Job and reached two ready replicas. A deliberate bad DB password failed the pre-upgrade Job with PostgreSQL `28P01` while preserving the prior healthy release. A compatible-image rolling upgrade succeeded; Helm rollback to revision 1 created revision 3 and converged to two ready pods on `nestjs-backend-starter:m020-old`, with `maxSurge=1` and `maxUnavailable=0`.
- Isolated PostgreSQL 18.6 used synthetic data and a temporary password. `pg_dump -Fc`/`pg_restore` restored into a fresh database; marker `synthetic-m020-final-restore` and four Drizzle migration records were verified. Dump plus restore took 381 ms, and a non-root application pod using the restored database reported readiness 200. This is runbook verification only, not a managed backup/PITR rehearsal.
- Verification passed: Helm lint and render; kind install, migration ordering/failure diagnosis, rolling upgrade, HPA/PDB resources, probes, local TLS/API-only routing, security context, Calico NetworkPolicy allow/deny, compatible-image rollback, isolated PostgreSQL dump/restore and restored-database smoke. Dynamic CPU scaling was not run because metrics-server was unavailable. Actual staging and managed PostgreSQL PITR were not run and are not claimed; adopters verify those in their deployment environments.
