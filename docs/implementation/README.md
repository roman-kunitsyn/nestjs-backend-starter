# Implementation records

This directory contains the approved implementation sequence and its execution state.

- [Stage 00](stages/stage-00-preparation.md) defines the preparation phase.
- [M000](milestones/M000-documentation-structure.md) established the documentation structure.
- [M001](milestones/M001-architecture-decomposition.md) records architecture decomposition and source traceability.
- [M002](milestones/M002-architecture-reconciliation.md) reconciles architecture conflicts and ambiguities.
- [M003](milestones/M003-complete-implementation-roadmap.md) defines the complete implementation plan.
- [M004](milestones/M004-execution-readiness.md) establishes and verifies the progress tooling.
- [Progress data](progress.json) is authoritative; [the dashboard](progress.md) is its human-readable summary.
- [Roadmap](roadmap.md) defines approved ordering and scope; [requirements matrix](requirements-matrix.md) traces requirements to evidence; [definition of done](definition-of-done.md) records completion gates.
- Database connection and migration procedures are documented in [operations](../operations/local-development.md), [migrations](../operations/migrations.md), and [testing](../operations/testing.md).
- CI and workflow recovery are in [GitHub Actions operations](../operations/github-actions.md); versioned GHCR releases are in [release operations](../operations/releases.md); environments and repository protection are in [GitHub governance](../operations/github-governance.md). Deployment, rollback, and database recovery remain in [Kubernetes operations](../operations/kubernetes.md) and [migration operations](../operations/migrations.md).

## Resuming work

For `implement next milestone`, read `AGENTS.md`, this file, the roadmap, `progress.json`, and the definition of done. Inspect Git state, resume the single in-progress or blocked milestone first, then select the earliest pending milestone whose dependencies are complete. Never skip blocked work. `pnpm progress:validate` verifies roadmap and progress consistency; `pnpm progress:select` prints the selected milestone after validation. `pnpm progress:dashboard` regenerates this directory's human-readable status from `progress.json`; `pnpm progress:test` runs malformed-state regression cases. Node's built-in test runner is used so tracking checks need no application or database services.

When interrupted, inspect both staged and unstaged diffs before continuing. Compare the selected milestone's contract with repository evidence, retain unrelated changes, complete its checks and documentation, regenerate and validate progress, then stage only that milestone's files. Do not start another milestone in the same session. Stage 00 reserved M000–M004; M005 is the first application milestone. M001's source is the preserved architecture reference.

Progress records must agree with repository evidence. Update JSON and dashboard together and validate the state before staging. See [Interrupted Session Recovery](../../AGENTS.md#14-interrupted-session-recovery).
