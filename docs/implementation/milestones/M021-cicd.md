# M021 — CI/CD and Release Safety

**Stage:** 09 — Production Deployment
**Status:** pending
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

- [ ] Any required PR gate failure fails CI; integration and E2E use PostgreSQL Testcontainers.
- [ ] Release identifies immutable commit, image digest and version; scans dependencies/image and emits SBOM where supported.
- [ ] Cloud auth avoids long-lived credentials when OIDC/workload identity is available; staging/production secrets differ.
- [ ] Deployment is serialized and orders migration success before app rollout; smoke test and exact deployed digest are recorded.
- [ ] Protected approval is required for production; rollback changes app image only and does not auto-reverse schema.
- [ ] Staging pipeline can be exercised end-to-end without production side effects.

## Verification

Validate workflow syntax, run CI jobs, publish/use test artifact in staging, verify migration ordering/concurrency/recovery and smoke evidence.

## Completion checklist

- [ ] Pipeline docs match workflow; no secrets committed; staged handoff reviewed.
