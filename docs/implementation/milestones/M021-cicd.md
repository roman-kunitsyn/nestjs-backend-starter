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
- [x] GitHub Actions CI execution passes, and a tagged release publishes to GHCR with version, source commit, and digest recorded; the published artifact identity/integrity, SBOM/provenance, and dependency/image security results are verified.
- [ ] Workflow dispatch selects separate staging/production GitHub environments; their environment-scoped configuration and credentials are verified, using short-lived OIDC/workload identity where supported.
- [ ] Production environment approval and deployment restrictions are enforced through GitHub environment protection.
- [x] Deployment workflow configuration serializes per environment, selects an immutable digest, runs/verifies the Helm migration hook before rollout, gates on rollout and smoke results, and records the deployed digest; recovery redeploys a compatible digest without reversing schema.

## Verification

Validate workflow syntax and safety locally. Run CI through GitHub Actions and verify a tagged GHCR release, including the source commit, version, published digest, artifact integrity, SBOM/provenance, and dependency/image scan results. Inspect GitHub staging/production environment configuration and production protection settings. Review or exercise the deployment workflow's digest validation, environment isolation, concurrency, migration-before-rollout behavior, health/smoke gates, deployment record, and digest-based rollback semantics without requiring a staging dispatch. M022 owns actual staging deployment and managed PostgreSQL PITR evidence.

## Completion checklist

- [x] CI/release/environment operations guides provide prerequisites, exact commands, expected outcomes, troubleshooting, and manual checks; links added to both README navigation files.
- [ ] Environment protection and deployment configuration acceptance criteria pass; do not complete while unverified or absent.

## Implementation notes and blocker

- CI, release, and deployment workflows are `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `.github/workflows/deploy.yml`. CI runs the frozen pnpm install, formatting, lint, typecheck, unit/integration/E2E, migration/OpenAPI, build, Helm, dependency audit, image build, and Trivy gates. Release publishes version/SHA tags, BuildKit SBOM/provenance, and scans the pushed digest. Deployment uses environment concurrency, digest pinning, migration/rollout/smoke gates, and a 90-day record.
- v0.0.1 hosted verification (2026-10-13): release run [38359664805](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359664805) completed successfully on commit `460e3e0581e3afd43ad644caef383c9696a32522`; both quality and publish jobs passed, including dependency and exact-digest Trivy scan. The run summary recorded image `ghcr.io/roman-kunitsyn/nestjs-backend-starter@sha256:6f87cc59a9aa6ca69ab05fa6599887263d95b31c6a614ef89a036dffc178bf16`, version `0.0.1`, and source labels. Direct `docker buildx imagetools inspect` confirmed the digest resolves to a linux/amd64 OCI index; its attestation manifest contains SPDX SBOM and SLSA provenance predicate layers. Build record artifact `11794660508` has SHA-256 `5e551173666f44ba46c8e0e37fc2341d5ae8a2d3fd2f540b6fa7f0a87f3d3c8c`. The repository tag exists; the GitHub Releases API returned 404 for a separate Release page, consistent with this workflow publishing GHCR only.
- Protection audit (2026-10-13): active main ruleset `main-branch-protection` ID `24975194` requires PRs and `Quality and image gates`, and blocks deletion/non-fast-forward updates. Active tag ruleset `release-tag-protection` ID `24975901` blocks updates/deletion on `refs/tags/v*`. Neither ruleset has bypass actors. GitHub reports the `staging` and `production` environments exist, but each has no protection rules, no deployment branch policy, no variables, and no secret names; admins can bypass environment protection. Therefore the required environment-scoped credentials/configuration, production reviewers, and ref restrictions are absent. No deployment was dispatched.
- Operational docs were added under `docs/operations/` with tested-against-repository commands, expected results, manual verification steps, and troubleshooting. README and docs navigation now link directly to CI, release, and environment guides, with deployment/rollback/database recovery links maintained in the Kubernetes and migration guides.
- M021 remains blocked only on absent/unverified GitHub environment configuration and production protection. An administrator must configure separate staging/production values and credentials (prefer short-lived OIDC/workload identity), require production reviewers, restrict production deployment refs, and ensure admins cannot bypass the intended protection; then inspect environment settings again without exposing secret values. Actual staging deployment and managed database recovery remain M022 gates under ADR-002.
