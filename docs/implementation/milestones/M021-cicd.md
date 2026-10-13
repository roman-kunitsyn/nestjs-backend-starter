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
- GitHub Actions execution was attempted: the latest main CI run failed before any job steps while resolving the Trivy action ref. No tagged GHCR publication or GitHub environment/protection configuration is present. No deployment was attempted. Actual staging deployment evidence is reserved for M022 under ADR-002.
- GitHub access investigation (2026-10-13): the agent runner uses the same macOS account (`HOME=/Users/user`), sees the login Keychain, and has no `GH_TOKEN` or `GITHUB_TOKEN`. GitHub CLI authentication and `gh api user` succeed outside the restricted network sandbox; API requests inside the sandbox fail to connect to `api.github.com`. The earlier invalid-token report was caused by running the status check in that restricted context.
- GitHub verification (2026-10-13, using the authenticated GitHub CLI outside the restricted network sandbox) succeeded: `gh auth status` and `gh api user` passed with `repo`, `workflow`, and `read:packages` scopes. The latest CI run, 38354045254 on `main` commit `71f72a2aede203f7da2262417137fffbb973d170`, failed during action setup because `aquasecurity/trivy-action@0.36.0` could not be resolved. The staged correction to `@v0.36.0` is unpushed, so no GitHub execution evidence for the correction exists yet. The concurrent deploy workflow run on that commit also failed; its run log was unavailable.
- GitHub reports Actions enabled with all actions allowed. The repository has no release tags or releases, no staging/production environments, and no branch protection for `main`; no repository rulesets were returned. The authenticated account's GHCR container package inventory is empty. No immutable image digest, source/version labels, SBOM/provenance, or published-image scan evidence can therefore be verified. No deployment was dispatched.
- To resume, an authorized maintainer must push the already staged M021 changes (including the Trivy ref correction) and verify CI passes. Then create and push a matching `v0.0.1` release tag (or update `package.json` and use a matching approved semver tag), and verify the Release image workflow's GHCR digest, source commit/version, SBOM/provenance, and Trivy result. In repository Settings → Environments, create `staging` and `production`; configure distinct environment-scoped `KUBECONFIG`, `HELM_VALUES_YAML`, `SMOKE_URL`, `KUBE_NAMESPACE`, and `HELM_RELEASE_NAME` values (prefer provider OIDC/workload identity in place of long-lived kubeconfig credentials). Require production reviewers and restrict its deployments to approved release refs. In Settings → Branches or Rulesets, protect `main` and require the `Quality and image gates` status check; protect release tags and enable GHCR tag immutability where available. These actions require repository administration and a deliberate push/tag, and were not performed here.
- Keep M021 blocked until the corrected workflow passes on GitHub, a tagged GHCR release and its identity/integrity/SBOM/provenance/security evidence are verified, and staging/production environment configuration and production protection are established and verified. Actual staging deployment execution remains an M022 gate, not an M021 prerequisite.
