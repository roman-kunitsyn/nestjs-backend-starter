# Implementation records

This directory contains the approved implementation sequence and its execution state.

- [Stage 00](stages/stage-00-preparation.md) defines the preparation phase.
- [M000](milestones/M000-documentation-structure.md) is the active contract for documentation setup.
- [Progress data](progress.json) is authoritative; [the dashboard](progress.md) is its human-readable summary.
- `roadmap.md`, `requirements-matrix.md`, and `definition-of-done.md` are established by later Stage 00 milestones.

## Resuming work

For `implement next milestone`, read `AGENTS.md`, this file, the roadmap when available, and `progress.json`. Inspect Git state, resume any in-progress or blocked milestone first, then select the earliest pending milestone whose dependencies are complete. During bootstrap, M000–M004 are reserved in `AGENTS.md`; M001's source is the preserved architecture reference. Do not infer later milestone scope before its contract is created.

Progress records must agree with repository evidence. Update JSON and dashboard together and validate the state before staging. See [Interrupted Session Recovery](../../AGENTS.md#14-interrupted-session-recovery).
