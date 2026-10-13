# M022 — Final Review and Acceptance

**Stage:** 10 — Final Verification
**Status:** pending
**Dependencies:** M021

## Objective

Review the complete reusable starter against approved requirements and resolve release-blocking defects without expanding product scope.

## Scope

- Architecture consistency and maintainability review; auth, security, tenant isolation, DB/schema/migrations, API/OpenAPI, email/outbox, logging/health, container, Kubernetes, CI/CD, and operations verification.
- Full required automated suites and security checks.
- Integrated deployment and recovery verification in a fresh disposable kind or k3d cluster and fresh disposable PostgreSQL instance containing synthetic data only.
- Documentation, README, requirements traceability, and progress consistency review.
- Fix defects found during acceptance; record non-blocking limitations and any approved exception.

## Out of scope

- New major features or speculative architecture changes.
- Selecting a cloud provider, provisioning/purchasing managed infrastructure, configuring real cloud credentials, or deploying to live staging/production.
- Managed PostgreSQL PITR, production TLS/DNS, provider-specific infrastructure hardening, and production disaster recovery exercises. Document these as adopter deployment responsibilities.
- Claiming deployment, backup restoration, or infrastructure success without executing the corresponding local verification.

## Architecture references

- [Global definition of done](../definition-of-done.md), [requirements matrix](../requirements-matrix.md), [ADR-002](../../decisions/ADR-002-template-versus-production-verification.md), all architecture documents, and `AGENTS.md` §17.

## CI/CD and deployment evidence boundary

M021 verifies GitHub CI/CD, versioned GHCR publication, immutable artifact identity, SBOM/provenance and security checks, repository rulesets, staging/production environment governance, and deployment workflow safety. M022 uses a fresh local cluster and PostgreSQL instance to validate the integrated Helm, migration, health, smoke, rollback, backup/restore, and security behavior. Local results are template-level evidence and do not represent a cloud deployment or managed-service recovery test. Real credentials, kubeconfig/workload identity, external Helm values, DNS, public/runner-reachable smoke endpoints, managed PostgreSQL PITR, and production disaster recovery are adopter deployment responsibilities under [ADR-002](../../decisions/ADR-002-template-versus-production-verification.md).

## Deliverables

- Final verification record, reconciled documentation and traceability, completed progress state, and project acceptance report.

## Acceptance criteria

- [ ] Every approved milestone and stage exit criterion is complete; dependency, progress, and Git handoffs are consistent.
- [ ] Every traceability requirement has evidence; required quality, security, and tenant-isolation checks pass.
- [ ] No release-blocking defects remain; unresolved issues and impact are documented.
- [ ] A fresh disposable kind/k3d cluster and PostgreSQL instance are provisioned for this acceptance run with synthetic data and temporary credentials only.
- [ ] Helm install and upgrade succeed; migration hook ordering and migration state are verified.
- [ ] Startup, readiness, and liveness probes behave as specified; local smoke checks pass using a cluster-local path or port-forward, without public DNS.
- [ ] Application rollback to a schema-compatible image succeeds without automatic schema rollback.
- [ ] Database backup and restore into an isolated fresh database succeeds; synthetic data markers, migration state, and application readiness/smoke behavior are verified.
- [ ] Kubernetes security controls are checked, including pod security context, service account/token behavior, and applicable NetworkPolicy allow/deny behavior.
- [ ] API/OpenAPI match runtime; architecture, operations, README, and consumer deployment instructions describe actual behavior and have no contradictory M021/M022 scope.
- [ ] Progress validator and all applicable final checks pass; project is set to completed only after all evidence is recorded.

## Verification

Run all applicable lint/format/typecheck/unit/integration/E2E/contract/build/Helm/security checks and the integrated disposable-cluster/database acceptance procedure. Audit evidence and the progress graph. Do not count unavailable checks as passed. Record local-only scope and any infrastructure capability that could not be verified.

## Completion checklist

- [ ] No critical defect; requirements and stage exits verified; docs reconciled; progress complete; staged diff inspected.
