# M021 — CI/CD and Release Safety

**Stage:** 09 — Production Deployment
**Status:** blocked
**Dependencies:** M020

## Objective

Automate quality gates, immutable artifact publication, controlled migration/deployment, and release recovery procedures.

## Scope

- GitHub Actions PR CI for frozen install, lint/format/typecheck, unit/integration/E2E, migration/OpenAPI checks, build, Helm lint, image build/scan.
- GitHub Actions execution evidence for CI and a tagged release publishing to GHCR, including immutable artifact identity/integrity, SBOM/provenance, and dependency/image security checks.
- GitHub staging/production environment configuration, production environment protection, and environment-scoped credentials or short-lived OIDC/workload identity where supported.
- Deployment workflow configuration and safety for digest selection, per-environment concurrency, migration ordering, rollout/health/smoke gates, deployment records, and digest-based application recovery without schema rollback.

## Out of scope

- Triggering an actual production deployment or adding cloud credentials without authorized environment configuration.
- Dispatching an actual deployment to staging or using that deployment as M021 evidence; actual production-like staging behavior is verified in M022.

## Architecture references

- [Deployment](../../architecture/deployment.md), [testing](../../architecture/testing.md); source §19.

## Deliverables

- CI/release/deploy workflows and protected-environment/recovery documentation.

## Acceptance criteria

- [x] Any required PR gate failure fails CI; integration and E2E use PostgreSQL Testcontainers.
- [x] Release identifies immutable commit, image digest and version; scans dependencies/image and emits SBOM/provenance metadata.
- [ ] GitHub Actions CI execution passes, and a tagged release publishes to GHCR with version, source commit, and digest recorded; the published artifact identity/integrity, SBOM/provenance, and dependency/image security results are verified.
- [ ] Workflow dispatch selects separate staging/production GitHub environments; their environment-scoped configuration and credentials are verified, using short-lived OIDC/workload identity where supported.
- [ ] Production environment approval and deployment restrictions are enforced through GitHub environment protection.
- [x] Deployment workflow configuration serializes per environment, selects an immutable digest, runs/verifies the Helm migration hook before rollout, gates on rollout and smoke results, and records the deployed digest; recovery redeploys a compatible digest without reversing schema.

## Verification

Validate workflow syntax and safety locally. Run CI through GitHub Actions and verify a tagged GHCR release, including the source commit, version, published digest, artifact integrity, SBOM/provenance, and dependency/image scan results. Inspect GitHub staging/production environment configuration and production protection settings. Review or exercise the deployment workflow's digest validation, environment isolation, concurrency, migration-before-rollout behavior, health/smoke gates, deployment record, and digest-based rollback semantics without requiring a staging dispatch. M022 owns actual staging deployment and managed PostgreSQL PITR evidence.

## Completion checklist

- [x] Pipeline docs match workflow; no secrets committed; staged handoff reviewed after implementation.

## Implementation notes and blocker

- Added reusable PR CI, tagged GHCR release, and manually dispatched protected deployment workflows. GHCR release uses version and commit SHA tags, records the published digest, emits BuildKit SBOM/provenance metadata, and scans the exact pushed digest.
- Deployment uses a non-cancelling environment concurrency group, waits for Helm's pre-upgrade migration hook and rollout, verifies the labeled migration Job, runs an environment-configured smoke URL, and uploads a 90-day deployment record.
- Local validation passed workflow YAML and embedded shell parsing, frozen pnpm install, Helm lint, formatting, lint, typecheck, 38 unit tests, 10 PostgreSQL integration tests, 22 E2E tests, migration consistency, OpenAPI freshness, build, production dependency audit, Docker image build, and HIGH/CRITICAL image scan.
- GitHub Actions execution, tagged GHCR publication, artifact verification, and GitHub environment/protection configuration remain unverified. No deployment was attempted. Actual staging deployment evidence is reserved for M022 under ADR-002.
- Blocker rechecked on 2026-10-13: this workspace has no configured Git remote and `gh auth status` reports the saved GitHub token is invalid. GitHub Actions execution, GHCR publication, and staging/production environment and protection settings therefore cannot be verified. Keep M021 blocked until authenticated repository access and the required GitHub environment configuration are available; staging deployment execution is not an M021 prerequisite.
