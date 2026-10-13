# GitHub Actions CI and troubleshooting

## Prerequisites

- A GitHub account with read access to `roman-kunitsyn/nestjs-backend-starter`.
- GitHub CLI (`gh`), Node.js 24, pnpm 12.11.2, and Docker for local reproduction.
- Repository checkout at the commit or pull request being checked.

Authenticate and confirm the repository before querying runs:

```bash
gh auth status
gh repo view roman-kunitsyn/nestjs-backend-starter
```

Expected: `gh auth status` reports an authenticated account with repository read access, and `gh repo view` prints the repository. Do not print or paste access tokens when diagnosing authentication.

## Run CI locally

From the repository root, run the same checks as `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:check
pnpm openapi:check
pnpm build
pnpm helm:lint
pnpm security:audit
pnpm image:build
trivy image --ignore-unfixed --exit-code 1 --severity HIGH,CRITICAL --vuln-type os,library nestjs-backend-starter:local
```

Integration and E2E tests require Docker for PostgreSQL Testcontainers. Image checks require Docker and Trivy. Expected: each command exits zero; the image scan considers HIGH and CRITICAL findings with available fixes. These local runs help reproduce CI but do not replace a successful hosted run.

## Inspect hosted CI

List recent CI and release runs, then inspect a specific run:

```bash
gh run list --repo roman-kunitsyn/nestjs-backend-starter --limit 20
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter --log
gh run watch RUN_ID --repo roman-kunitsyn/nestjs-backend-starter
```

Replace `RUN_ID` with the numeric Actions run ID. Expected: conclusion `success`; the `Quality and image gates` job and all its required steps, including Testcontainers, Helm, dependency audit, image build, and Trivy scan, conclude successfully. A release run must also show a successful `Publish immutable image` job. The required PR status context is exactly `Quality and image gates`.

Manual verification: open the run URL shown by `gh run view`, check the event, full source SHA, workflow path, all job conclusions, and the logs for each security gate. For a PR, confirm the `Quality and image gates` check is required by the active `main-branch-protection` ruleset. Use [Release operations](releases.md) to validate a published artifact and [GitHub governance](github-governance.md) for environments and protections.

## Diagnose failures

```bash
gh run list --repo roman-kunitsyn/nestjs-backend-starter --limit 20
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter --log-failed
gh run view RUN_ID --repo roman-kunitsyn/nestjs-backend-starter
```

Expected: the failed step and its error are visible. Resolve the cause in a branch, rerun local checks, and push a corrective commit through the normal protected-branch process. Use `gh run rerun RUN_ID --failed --repo roman-kunitsyn/nestjs-backend-starter` only after confirming the failure was transient and the workflow inputs/source remain valid; a rerun is not a fix for a deterministic failure.

Common causes:

- Dependency install: confirm Node 24, pnpm 12.11.2, and lockfile consistency; use the frozen install command above.
- Integration or E2E: inspect Testcontainers/Docker startup and PostgreSQL logs in the failed step.
- OpenAPI or migration check: regenerate/review the checked-in artifact or migration journal with the documented project scripts, then commit the intended output.
- Helm: run `pnpm helm:lint` and inspect chart values and templates under `helm/nestjs-backend-starter/`.
- Image build or Trivy: run `pnpm image:build`, then the Trivy command above; inspect whether findings are fixed, whether the registry/base image is reachable, and whether the action version resolves.
- Release workflow: confirm the pushed tag exactly matches `v` plus `package.json`'s version; see [Release operations](releases.md).

If a check is unavailable, record it as not run. Do not treat a skipped or unavailable security gate as passed.

## Manual verification checklist

1. Confirm the workflow is `.github/workflows/ci.yml` and triggers on pull requests and pushes to `main`.
2. Confirm every job step is green in the hosted run and the run's `head_sha` is the intended commit.
3. Confirm branch protection requires `Quality and image gates`.
4. Confirm release workflow execution and artifact checks separately; a green CI run alone does not prove GHCR publication.
5. Find deployment, rollback, and database recovery procedures in [Kubernetes operations](kubernetes.md) and [Database migrations](migrations.md).
