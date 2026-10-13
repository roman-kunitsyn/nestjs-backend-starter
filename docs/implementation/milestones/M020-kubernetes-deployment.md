# M020 — Helm and Kubernetes Operations

**Stage:** 09 — Production Deployment
**Status:** blocked
**Dependencies:** M019

## Objective

Deploy the stateless service using a secure Helm chart, separately executed migrations, correct probes, and documented operations/recovery.

## Scope

- Helm Deployment, Service, Ingress, ConfigMap, secret references, ServiceAccount, HPA, PDB, NetworkPolicy, migration Job, optional email dispatcher CronJob.
- Probe/shutdown settings, rolling strategy, resources, autoscaling/database connection budgeting, TLS/proxy/rate-limit configuration.
- Migration expand/contract and release ordering; backup/PITR/restore operational plan and staging verification.

## Out of scope

- In-cluster production PostgreSQL, application pod migrations, concurrent production release automation (M021).

## Architecture references

- [Deployment](../../architecture/deployment.md), [database](../../architecture/database.md), [security](../../architecture/security.md), [observability](../../architecture/observability.md); source §18.

## Deliverables

- Helm chart/environment values, Kubernetes docs, migration and recovery procedures, staging deployment evidence.

## Acceptance criteria

- [x] Chart renders required resources and never deploys production DB in application chart.
- [x] Pods are non-root/restricted, network/secret controls applied, resources set, and no sensitive operational endpoint is routed through ingress.
- [x] Startup/readiness/liveness probes map to app semantics; readiness drains before shutdown; HPA pool maximum is budgeted at 50 application connections.
- [x] Migration Job executes once before app rollout; app does not auto-migrate; failed schema is not automatically reversed with app rollback.
- [ ] Staging supports healthy rolling deployment, TLS, secret references, image rollback, migration diagnosis and smoke checks.
- [x] Backup/RPO/RTO/restore process is documented; actual restore rehearsal remains required before final acceptance.

## Verification

Run Helm lint/template, Kubernetes policy checks, staging migration/rollout/probe/shutdown/rollback tests, and restore rehearsal when environment exists.

## Completion checklist

- [ ] Operations docs and actual staging evidence reviewed; stage handoff is complete.

## Execution notes

- Implemented the Helm chart under `helm/nestjs-backend-starter` with Deployment, Service, ConfigMap, ServiceAccount, optional Ingress, HPA, PDB, NetworkPolicy, and a revision-scoped pre-install/pre-upgrade migration Job. Values configure replica/pool sizing, resources, probes, network selectors, ingress TLS, image digest, secret reference, and migration retry/deadline policy. The app chart does not contain PostgreSQL.
- Updated the production image to include only `scripts/migrate.mjs` and versioned SQL migrations for the separate migration Job. `.dockerignore` selectively includes that script. Updated the image smoke assertion to permit those migration artifacts while still excluding application source, tests, package tools, and development dependencies.
- Added Kubernetes release, secret, health endpoint, migration failure, rollback, backup/PITR, and restore-rehearsal procedures in `docs/operations/kubernetes.md`; linked them from migration docs and README.
- `helm lint`, default and TLS ingress `helm template`, and progress validation passed. Rebuilt the image; migration runner and migration journal were present under the non-root runtime. Read-only image smoke passed against local Compose PostgreSQL, including readiness and SIGTERM.
- **Blocker:** no Kubernetes staging API is configured/reachable (`kubectl cluster-info` connection refused at the configured local endpoint). Therefore staging install/rollout, migration hook behavior in-cluster, TLS, rolling shutdown, image rollback, Kubernetes policy enforcement, and restore rehearsal have not been verified. Keep M020 blocked until a staging cluster and managed PostgreSQL backup/restore environment are available and evidence is recorded here.
