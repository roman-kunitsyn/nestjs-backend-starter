# M021 — CI/CD and Release Safety

**Stage:** 09 — Production Deployment
**Status:** blocked
**Dependencies:** M020

## Objective

Automate quality gates, immutable artifact publication, controlled migration/deployment, and release recovery procedures.

## Scope

- GitHub Actions PR CI for frozen install, lint/format/typecheck, unit/integration/E2E, migration/OpenAPI checks, build, Helm lint, image build/scan.
- Release pipeline for immutable commit, semantic version/SHA tag, registry publication, SBOM where supported, vulnerability scanning, OIDC/workload identity where available.
- Deployment workflow with digest selection, concurrency lock, migration Job, rollout health, smoke tests and deployed-version record.

## Out of scope

- Triggering an actual production deployment or adding cloud credentials without authorized environment configuration.

## Architecture references

- [Deployment](../../architecture/deployment.md), [testing](../../architecture/testing.md); source §19.

## Deliverables

- CI/release/deploy workflows and protected-environment/recovery documentation.

## Acceptance criteria

- [x] Any required PR gate failure fails CI; integration and E2E use PostgreSQL Testcontainers.
- [x] Release identifies immutable commit, image digest and version; scans dependencies/image and emits SBOM/provenance metadata.
- [ ] Workflow dispatch selects separate staging/production GitHub environments; actual environment-specific secrets and short-lived OIDC/workload identity are configured where the provider supports it.
- [x] Deployment is serialized per environment and Helm migration hooks complete before rollout; smoke test and exact deployed digest are recorded.
- [ ] Production environment approval is enforced through configured GitHub environment protection; application rollback redeploys a digest and does not reverse schema.
- [ ] Staging pipeline can be exercised end-to-end without production side effects; it remains unverified because repository environments, staging cluster credentials, values, and smoke endpoint are not configured in this workspace.

## Verification

Validate workflow syntax, run CI jobs, publish/use test artifact in staging, verify migration ordering/concurrency/recovery and smoke evidence.

## Completion checklist

- [x] Pipeline docs match workflow; no secrets committed; staged handoff reviewed after implementation.

## Implementation notes and blocker

- Added reusable PR CI, tagged GHCR release, and manually dispatched protected deployment workflows. GHCR release uses version and commit SHA tags, records the published digest, emits BuildKit SBOM/provenance metadata, and scans the exact pushed digest.
- Deployment uses a non-cancelling environment concurrency group, waits for Helm's pre-upgrade migration hook and rollout, verifies the labeled migration Job, runs an environment-configured smoke URL, and uploads a 90-day deployment record.
- Local validation passed workflow YAML and embedded shell parsing, frozen pnpm install, Helm lint, formatting, lint, typecheck, 38 unit tests, 10 PostgreSQL integration tests, 22 E2E tests, migration consistency, OpenAPI freshness, build, production dependency audit, Docker image build, and HIGH/CRITICAL image scan.
- GitHub Actions execution and end-to-end staging deployment remain unverified. Resume after configuring the `staging` GitHub environment (`KUBECONFIG`, `HELM_VALUES_YAML`, `SMOKE_URL`), running a tagged release to publish an image digest, and dispatching that digest to staging. Configure required reviewers and environment restrictions on `production` before any production dispatch. No cloud credentials or environment secrets were available here, and no deployment was attempted.
