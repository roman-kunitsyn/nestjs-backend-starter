# M020 — Helm and Kubernetes Operations

**Stage:** 09 — Production Deployment
**Status:** pending
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

- [ ] Chart renders required resources and never deploys production DB in application chart.
- [ ] Pods are non-root/restricted, network/secret controls applied, resources set, and no sensitive operational endpoint is public.
- [ ] Startup/readiness/liveness probes map to app semantics; readiness drains before shutdown; HPA respects DB connection budget.
- [ ] Migration Job executes once before app rollout; app does not auto-migrate; failed schema is not automatically reversed with app rollback.
- [ ] Staging supports healthy rolling deployment, TLS, secret references, image rollback, migration diagnosis and smoke checks.
- [ ] Backup/RPO/RTO/restore process is documented; actual restore test is required and recorded before final acceptance.

## Verification

Run Helm lint/template, Kubernetes policy checks, staging migration/rollout/probe/shutdown/rollback tests, and restore rehearsal when environment exists.

## Completion checklist

- [ ] Operations docs and actual staging evidence reviewed; stage handoff is complete.
