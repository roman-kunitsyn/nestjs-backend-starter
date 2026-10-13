# M021 — CI/CD and Release Safety

**Stage:** 09 — Production Deployment
**Status:** blocked
**Dependencies:** M020

## Objective

Automate quality gates, immutable artifact publication, controlled migration/deployment, and release recovery procedures.

## Scope

- GitHub Actions PR CI for frozen install, lint/format/typecheck, unit/integration/E2E, migration/OpenAPI checks, build, Helm lint, image build/scan.
- GitHub Actions execution evidence for CI and a tagged release publishing to GHCR, including immutable artifact identity/integrity, SBOM/provenance, and dependency/image security checks.
- Active GitHub repository rulesets for branch and version-tag protection; distinct staging/production GitHub environment governance, including required production approval, deployment-ref restrictions, and administrator-bypass behavior.
- Documented deployment-time integration contracts for `KUBECONFIG`, `HELM_VALUES_YAML`, and `SMOKE_URL`, including the OIDC/workload-identity adaptation path. Their values and real infrastructure are not required to complete M021.
- Deployment workflow configuration and safety for digest selection, per-environment concurrency, migration ordering, rollout/health/smoke gates, deployment records, and digest-based application recovery without schema rollback.

## Out of scope

- Selecting or provisioning a cloud provider, purchasing infrastructure, configuring real credentials/kubeconfig, setting up DNS, or providing publicly reachable smoke endpoints.
- Triggering an actual staging or production deployment. M021 verifies repository and workflow configuration only.

## Architecture references

- [Deployment](../../architecture/deployment.md), [testing](../../architecture/testing.md); source §19.

## Deliverables

- CI/release/deploy workflows and protected-environment/recovery documentation.

## Acceptance criteria

- [x] Any required PR gate failure fails CI; integration and E2E use PostgreSQL Testcontainers.
- [x] Release identifies immutable commit, image digest and version; scans dependencies/image and emits SBOM/provenance metadata.
- [x] GitHub Actions CI execution passes, and a tagged release publishes to GHCR with version, source commit, and digest recorded; the published artifact identity/integrity, SBOM/provenance, and dependency/image security results are verified.
- [x] Active GitHub repository rulesets protect the default branch with required CI status and protect version tags from update/deletion; bypass configuration is reviewed.
- [ ] Deployment workflow selects separate staging/production GitHub environments; each has distinct governance and an appropriate deployment-ref restriction, production requires approval and is limited to approved release refs, administrator bypass is disabled where supported, and repository ruleset bypass actors are reviewed. No secret values or reachable endpoints are required as acceptance evidence.
- [x] Exact consumer deployment-time input names (`KUBECONFIG`, `HELM_VALUES_YAML`, `SMOKE_URL`), purposes, environment isolation, and setup/verification procedures are documented without fabricating credentials or values.
- [x] Deployment workflow configuration serializes per environment, selects an immutable digest, runs/verifies the Helm migration hook before rollout, gates on rollout and smoke results, and records the deployed digest; recovery redeploys a compatible digest without reversing schema.

## Verification

Validate workflow syntax and safety locally. Run CI through GitHub Actions and verify a tagged GHCR release, including source commit, version, published digest, artifact integrity, SBOM/provenance, and dependency/image scan results. Inspect active repository rulesets and each staging/production environment's reviewer, deployment-ref, and administrator-bypass settings using the read-only commands in `docs/operations/github-governance.md`; use its Settings UI fallback when API access is unavailable. Review or exercise the deployment workflow's digest validation, environment isolation, concurrency, migration-before-rollout behavior, health/smoke gates, deployment record, and digest-based rollback semantics without requiring environment secrets or a deployment dispatch. M022 verifies integrated behavior in a fresh disposable local cluster and PostgreSQL instance; provider deployment and managed PostgreSQL PITR are consumer responsibilities.

## Completion checklist

- [x] CI/release/environment operations guides provide prerequisites, exact commands, expected outcomes, troubleshooting, and manual checks; links added to both README navigation files.
- [ ] Repository ruleset and environment governance acceptance criteria pass; do not complete until production deployment refs satisfy the approved-release-ref requirement. Consumer deployment values and credentials are not M021 completion gates.

## Implementation notes and blocker

- CI, release, and deployment workflows are `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `.github/workflows/deploy.yml`. CI runs the frozen pnpm install, formatting, lint, typecheck, unit/integration/E2E, migration/OpenAPI, build, Helm, dependency audit, image build, and Trivy gates. Release publishes version/SHA tags, BuildKit SBOM/provenance, and scans the pushed digest. Deployment uses environment concurrency, digest pinning, migration/rollout/smoke gates, and a 90-day record.
- v0.0.1 hosted verification (2026-10-13): release run [38359664805](https://github.com/roman-kunitsyn/nestjs-backend-starter/actions/runs/38359664805) completed successfully on commit `460e3e0581e3afd43ad644caef383c9696a32522`; both quality and publish jobs passed, including dependency and exact-digest Trivy scan. The run summary recorded image `ghcr.io/roman-kunitsyn/nestjs-backend-starter@sha256:6f87cc59a9aa6ca69ab05fa6599887263d95b31c6a614ef89a036dffc178bf16`, version `0.0.1`, and source labels. Direct `docker buildx imagetools inspect` confirmed the digest resolves to a linux/amd64 OCI index; its attestation manifest contains SPDX SBOM and SLSA provenance predicate layers. Build record artifact `11794660508` has SHA-256 `5e551173666f44ba46c8e0e37fc2341d5ae8a2d3fd2f540b6fa7f0a87f3d3c8c`. The repository tag exists; the GitHub Releases API returned 404 for a separate Release page, consistent with this workflow publishing GHCR only.
- Protection audit (2026-10-13): active main ruleset `main-branch-protection` ID `24975194` requires PRs and `Quality and image gates`, and blocks deletion/non-fast-forward updates. Active tag ruleset `release-tag-protection` ID `24975901` blocks updates/deletion on `refs/tags/v*`. Neither ruleset has bypass actors. The last recorded GitHub environment audit found `staging` and `production` with no protection rules or deployment branch policy and reported administrator bypass enabled. This is evidence that the then-observed configuration failed M021, not evidence of current settings. A fresh read-only audit is still required. Environment secret names/values, variables, clusters, and endpoints are adopter deployment-time configuration, not M021 evidence. No deployment was dispatched.
- Environment governance re-verification (2026-10-13, authenticated GitHub CLI/API evidence supplied by the repository operator): both `staging` and `production` have custom deployment branch policies enabled and allow only `main`; `can_admins_bypass` is `false` for both. Staging has no required reviewer. Production requires reviewer `roman-kunitsyn`; self-review is permitted for the solo-maintainer workflow. The protected `main` ref is the approved source ref for the manually dispatched deployment workflow. The workflow deploys the separately selected immutable digest and records its version and source commit; the preserved v0.0.1 release record remains the evidence for the tagged artifact. Both environment policies and the production approval gate were therefore verified. Secret values were not retrieved.
- The fresh environment evidence resolves the missing-protection/reviewer/admin-bypass finding: both environments have custom policies, production has a reviewer, and administrator bypass is disabled. However, the reported production deployment policy allows `main` only. M021/ADR-002 require production deployment refs to be limited to approved release refs. The manually dispatched workflow accepts a digest, version, and source commit but does not verify that those inputs identify the same protected version-tag release. Therefore this reported policy does not yet demonstrate the remaining release-ref criterion. Keep M021 blocked until the production policy and workflow satisfy the existing criterion or the approved contract is explicitly amended. Secret values were not retrieved.
- Operational docs were added under `docs/operations/` with tested-against-repository commands, expected results, manual verification steps, and troubleshooting. README and docs navigation now link directly to CI, release, and environment guides, with deployment/rollback/database recovery links maintained in the Kubernetes and migration guides.
- M021 remains blocked only on enforcing and verifying the approved release-ref restriction for production. The environment settings otherwise verify separate environments, custom deployment policies, production review, and disabled administrator bypass. Do not provision real credentials or endpoints for template acceptance. M022 uses a fresh disposable local kind/k3d cluster and PostgreSQL instance; actual staging, cloud deployment, managed PITR, and production disaster recovery are consumer responsibilities under ADR-002.
