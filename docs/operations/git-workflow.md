# Git, milestone, and pull request workflow

This guide defines human-controlled integration for this starter and projects adopted from it. The [progress tracker](../implementation/progress.json) records implementation milestones; it does not track or enforce branch integration.

## Branch policy

- `main` is the only permanent integration branch. Do not require a permanent `dev` or `develop` branch.
- Use short-lived branches for one milestone or authorized maintenance task, such as `milestone/m012_organization_api`, `fix/jwt_refresh`, `docs/template_adoption`, or `chore/dependency_review`.
- The human operator selects or creates the branch before the agent starts. Only one agent session executes a milestone at a time.
- Before editing, confirm branch, worktree state, milestone selection and dependencies. `implement next milestone` remains the standard command. In this completed starter it reports that no next milestone exists; maintenance requires explicit task authorization.
- Resume interrupted work on its same branch and milestone. Start the next milestone only after the previous one is merged into `main`.

## Prepare, stage, and open a PR

The operator starts from synchronized `main` and creates the selected short-lived branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c milestone/m012_organization_api
git branch --show-current
git status --short
pnpm progress:validate
pnpm progress:select
```

Agents implement, refactor, verify, document, update active adopter progress, and stage relevant changes. They do not commit, push, merge, tag, or release without explicit authorization. They suggest a concise `snake_case` commit name. Humans inspect and integrate:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached
git status --short
git commit -m "organization_lifecycle"
git push -u origin milestone/m012_organization_api
gh pr create --base main --head milestone/m012_organization_api --title "Organization lifecycle" --body "Implements M012; see contract and verification evidence in the diff."
gh pr checks --watch
gh pr view --web
```

Before merge, confirm the active main ruleset requires PRs and `Quality and image gates`, inspect CI and review comments, and ensure required checks pass. A human with merge authority merges through GitHub. Use the configured merge method; then verify integration and synchronize:

```bash
gh pr merge --merge --delete-branch
git switch main
git pull --ff-only origin main
git log -1 --oneline
```

The progress schema remains unchanged and does not assert PR integration.

## Recovery and failures

- **CI failure:** inspect `gh pr checks` and `gh run view RUN_ID --log-failed`, reproduce the failed command from [manual verification](manual-verification.md), fix on the same branch, push, and wait for required checks again. Do not merge a failed or skipped required gate.
- **PR rework:** keep the same branch and PR, make scoped review changes, rerun checks, push, and re-request review.
- **Merge conflict:** fetch and merge or rebase the latest `origin/main` following repository convention, resolve without discarding either intended change, run relevant checks, then push. Never force-push shared work without explicit authorization.
- **External blocker:** document one precise operator action, its verification command and expected result (for example, enable Docker Desktop; run `docker info`; expect server version and storage driver with exit code 0). Resume the same milestone after success. Do not repeat unchanged blocker text without new evidence.
- **Interrupted session:** inspect `git status --short`, `git diff --stat`, `git diff --cached --stat`, and branch; read the active contract and progress; compare evidence; continue on the same branch. Preserve unrelated changes; never reset or clean them.

Maintenance after project completion uses a short-lived branch and the same human PR process, with an explicitly authorized task. See [terminal behavior](../../AGENTS.md#18-behavior-after-project-completion).
