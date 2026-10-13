# M022 — Final Review and Acceptance

**Stage:** 10 — Final Verification
**Status:** completed
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

- [x] Every approved milestone and stage exit criterion is complete; dependency, progress, and Git handoffs are consistent.
- [x] Every traceability requirement has evidence; required quality, security, and tenant-isolation checks pass.
- [x] No release-blocking defects remain; consumer-specific deployment responsibilities are documented.
- [x] A fresh disposable kind cluster and PostgreSQL instance were provisioned with synthetic data and temporary credentials only.
- [x] Helm install and upgrade succeeded; migration hook ordering and migration state were verified.
- [x] Startup, readiness, and liveness probes returned healthy responses; local smoke checks passed without public DNS.
- [x] Application rollback to a schema-compatible image succeeded without automatic schema rollback.
- [x] Database backup and restore into an isolated fresh database succeeded; synthetic marker, migration state, and application readiness were verified.
- [x] Kubernetes security controls were checked, including pod security context, service account token behavior, and NetworkPolicy allow/deny behavior.
- [x] API/OpenAPI match runtime; architecture, operations, README, and consumer deployment instructions describe actual behavior and keep M021/M022 responsibilities distinct.
- [x] Progress validation and applicable final checks passed; project completion was recorded after evidence review.

## Verification

Run all applicable lint/format/typecheck/unit/integration/E2E/contract/build/Helm/security checks and the integrated disposable-cluster/database acceptance procedure. Audit evidence and the progress graph. Do not count unavailable checks as passed. Record local-only scope and any infrastructure capability that could not be verified.

## Completion checklist

- [x] No release-blocking defect remains; requirements and stage exits verified; docs reconciled; progress complete; staged diff inspected.

## Final acceptance record — 2026-10-13

- **Full checks:** Prettier, ESLint, strict TypeScript, Nest build, 38 unit tests (16 suites), 22 Fastify E2E tests (2 suites), 10 PostgreSQL integration tests (2 suites), OpenAPI artifact validation, Drizzle migration consistency, Helm lint, and all 11 progress regression tests passed. `pnpm audit --prod` reported no known vulnerabilities. `pnpm image:scan` passed its HIGH/CRITICAL gate for `nestjs-backend-starter:local`.
- **Integrated install and upgrade:** Fresh kind v1.37.0 cluster `m022-final`, PostgreSQL 18.6, and temporary synthetic credentials. Helm release revision 1 installed; its pre-install migration Job completed, and the database contained four migration journal records before two API replicas became ready. Revision 2 upgraded to a compatible image and its pre-upgrade migration Job completed; Helm rollback created revision 3 and returned to revision 1's image with two ready replicas. Rollback changed the application revision only; no down-migration job ran.
- **Health and API smoke:** Startup, readiness, and liveness returned HTTP 200 through a localhost port-forward. The protected organizations route returned the expected 401 without credentials. The production OpenAPI artifact passed the repository's operation/schema/freshness validation.
- **Recovery:** Added marker `synthetic-m022-final-restore`, produced a custom-format `pg_dump`, restored it into a new `app_restored` database, and verified the marker plus all four Drizzle migration records. The app was restarted against the restored database and readiness returned HTTP 200, then pointed back to the original disposable database.
- **Kubernetes controls:** API pods ran as UID 1000, with `automountServiceAccountToken=false`, read-only root filesystems, and RuntimeDefault seccomp. The exact NetworkPolicy rendered by the chart was exercised on a second fresh kind v1.37.0 cluster with Calico v3.33.0: configured ingress and selected database egress succeeded; untrusted ingress and unapproved database egress timed out as denied. Both disposable clusters used synthetic data and were destroyed after evidence capture.
- **Documentation and traceability:** Updated README status, setup and migrations, live route list, actual chart location, and command inventory; removed stale bootstrap-only statements and nonexistent test/database commands. The requirements matrix covers M022 and the completed stage records remain consistent. M021 hosted CI/release/governance evidence and its adopter-deployment boundary were reviewed in the preserved M021 record and ADR-002.
- **Scope limits:** No live staging/production deployment, cloud credentials, external DNS/TLS, managed PostgreSQL PITR, or provider disaster-recovery exercise was performed or claimed. These remain adopter deployment responsibilities under ADR-002 and the operations guides.

### Verification record

- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed (38 tests, 16 suites).
- `pnpm test:e2e`: passed (22 tests, 2 suites).
- `pnpm test:integration`: passed (10 tests, 2 suites).
- `pnpm build`: passed.
- `pnpm openapi:check`: passed; artifacts current.
- `pnpm db:check`: passed.
- `pnpm helm:lint`: passed.
- `pnpm progress:test`: passed (11 regressions).
- `pnpm security:audit`: passed; no known production dependency vulnerabilities.
- `pnpm image:scan`: passed; no unfixed HIGH or CRITICAL gate failure.
- Fresh kind/Helm/PostgreSQL install, upgrade, migration hook, probes, API smoke, compatible-image rollback, dump/restore and restored-database readiness: passed.
- Calico NetworkPolicy ingress/egress allow and deny probes: passed.
