# Manual verification procedures

This guide assigns an operator check to each lifecycle event. The completed starter's local Kubernetes acceptance is reusable-template evidence. Each adopter remains responsible for cloud deployment, managed PostgreSQL PITR, production disaster recovery, credentials, TLS/DNS, and deployment governance. Routine checks do not reopen or reset the starter roadmap.

## Before starting a milestone

**Purpose:** confirm selection, branch, dependencies and repository state. **Actor:** operator and agent. **Prerequisites:** synchronized `main`, short-lived branch, active roadmap.

Run `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git branch --show-current`, `pnpm progress:validate`, and `pnpm progress:select`.

**Expected:** intended branch, no unexplained changes, valid progress and deterministic eligible milestone. In this completed starter, selection reports completion and `next_milestone` is null. Inspect and resolve existing in-progress/blocked work before editing; do not start a milestone here. Record branch, authorization, selected contract and dependencies. Progress checks are automated local gates; branch selection is manual.

## After an agent session

**Purpose:** review staged handoff. **Actor:** human operator. **Prerequisites:** agent reports actual checks and staged files.

Run `git status --short`, `git diff --cached --check`, `git diff --cached --stat`, and `git diff --cached`.

**Expected:** only authorized changes, no secrets/artifacts, accurate results and progress matching repository evidence. If active adopter progress changed, run `pnpm progress:validate`; do not alter this completed starter tracker for maintenance. Keep changes uncommitted and request scoped correction for findings. Record review and staged file list. Manual operator action.

## Before merging a pull request

**Purpose:** require CI and human review. **Actor:** PR reviewer/maintainer. **Prerequisites:** PR targets `main`, required CI active, review threads resolved.

Run `gh pr checks PR_NUMBER --watch`, `gh pr view PR_NUMBER --json baseRefName,headRefName,mergeStateStatus,reviewDecision,statusCheckRollup,url`, and `gh api repos/OWNER/REPO/rulesets`.

**Expected:** base `main`, required checks green, review accepted, active ruleset requires PRs and `Quality and image gates`, and no bypass defeats protection. CI runs format, lint, typecheck, unit/PostgreSQL/E2E tests, migration/OpenAPI checks, build, Helm lint, dependency audit, image build and Trivy. For workflow edits, run the pinned Actions linter version used by the repository's release evidence (v1.7.7): `actionlint`; generic YAML parsing is not adequate. Check its version with `actionlint -version`. Inspect CI with `gh run view RUN_ID --log-failed`; repair on the PR branch and rerun. Record PR URL, CI run IDs and ruleset evidence. CI is automated; review and ruleset inspection are manual.

## After merging a pull request

**Purpose:** verify integration before the next milestone. **Actor:** human operator.

Run `gh pr view PR_NUMBER --json state,mergedAt,mergeCommit`, `git switch main`, `git pull --ff-only origin main`, and `git log -1 --oneline`.

**Expected:** PR merged and fetched `main` contains its merge commit. Resolve local synchronization issues without discarding work. Record merge SHA and CI run. This is a manual operator check.

## Before a release

**Purpose:** bind release to reviewed source and compatibility. **Actor:** release maintainer. **Prerequisites:** approved version and merged source on `main`.

Run `git switch main`, `git pull --ff-only origin main`, `git status --short`, then `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm db:check`, `pnpm openapi:check`, `pnpm build`, `pnpm helm:lint`, and `pnpm security:audit`.

**Expected:** clean tree and all checks pass. Review breaking API and migration compatibility, confirm version matches `package.json`, and obtain human release authorization. Tag only through the authorized release process. Record version, source SHA, checks, contract review and migration/backout plan. Checks are automated; release approval is manual.

## After a release

**Purpose:** verify release image identity and security evidence. **Actor:** release maintainer. **Prerequisites:** tagged workflow completed.

Run `gh run list --workflow release.yml --limit 10`, `gh run view RUN_ID`, `docker buildx imagetools inspect ghcr.io/OWNER/REPO:VERSION`, and `docker buildx imagetools inspect ghcr.io/OWNER/REPO:sha-SOURCE_COMMIT`.

**Expected:** successful run for intended tag/SHA; both references resolve to the same image digest; SBOM and BuildKit provenance attestations are attached; digest Trivy scan passed. Inspect workflow summary/logs without exposing secrets. Hold deployment on mismatch or scan failure; diagnose using [release operations](releases.md). Record run URL, version, source SHA, digest, attestations and scan. Workflow gates are automated; identity inspection is manual.

## After an API contract change

**Purpose:** keep the public contract accurate and compatible. **Actor:** author and API reviewer. **Prerequisites:** intended public API change.

Run `pnpm openapi:generate`, inspect `git diff -- artifacts/openapi.json artifacts/openapi.yaml`, then run `pnpm openapi:check`.

**Expected:** consistent fresh OpenAPI 3.1 JSON/YAML. Review operations, parameters, schemas, auth, Problem Details, statuses, pagination and compatibility. Consumers regenerate from the identified artifact. Correct source/schema or restore unintended changes, then regenerate and recheck. Record artifact diff, release/source identity, compatibility decision and consumer coordination. Generation/check are automated; review is manual. See [API artifacts](api-artifacts.md).

## When adopting the starter

**Purpose:** establish independent identity and planning before product work. **Actor:** adopter maintainer. **Prerequisites:** verified source version and new repository.

Follow [template adoption](template-adoption.md), including frozen install, format, lint, typecheck, unit, integration, E2E, build, OpenAPI, Helm and progress checks. Validate GitHub Actions using `actionlint`; inspect rulesets/environments without retrieving secret values. **Expected:** independent Git history and remote, recorded source SHA, fresh active Stage 00 planning, customized identity and baseline checks pass. Record provenance, repository, customizations and results. Tests are automated; identity and governance are operator checks.

## Before a real deployment

**Purpose:** verify adopter cloud and data recovery readiness. **Actor:** deployment owner/on-call. **Prerequisites:** protected environment, reviewed values, authorized credentials and verified release digest.

Run `helm lint helm/nestjs-backend-starter -f ./environment-values.yaml`, then follow [Kubernetes operations](kubernetes.md). Confirm environment reviewers/ref policy, source/version/digest, migration Job, rollout, replicas, readiness, TLS/ingress, network policy, logs/metrics and application smoke behavior. Verify managed PostgreSQL backup/PITR health and conduct an isolated restore rehearsal against adopter-defined RPO/RTO. Never expose secret values in evidence.

**Expected:** successful migration/rollout/smoke and recorded recovery point/rehearsal. Stop on migration, digest, recovery or smoke failure; application rollback requires schema compatibility review, and database repair is separate. Record source/digest, deployment run, Helm revision, migration job, replica health, smoke result, backup identifier, observed recovery window and operator. Workflow/Helm checks are automated; cloud, recovery and approvals belong to the adopter.

## Recurring maintenance and security review

**Purpose:** maintain controls without reopening the starter roadmap. **Actor:** maintainer and security/deployment owners. **Prerequisites:** explicit maintenance authorization and short-lived branch.

Run `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm db:check`, `pnpm openapi:check`, `pnpm build`, `pnpm helm:lint`, and `pnpm security:audit`. For workflow changes run `actionlint`.

Review dependency/image findings, Node/base-image support, rulesets/environments, secret scoping, release attestations, database backup and restore evidence, TLS and deployment drift. Use `gh api repos/OWNER/REPO/rulesets`, GitHub Settings, and `gh secret list` (names only). Never retrieve or print secret values. Record date, actor, commit, results and exceptions; track unresolved issues through an explicitly authorized maintenance plan. CI/scanners automate selected checks; governance, recovery and risk decisions are manual. Recurring checks do not change M000–M022 status.
