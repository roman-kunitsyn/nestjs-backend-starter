# Implementation records

This directory contains the approved implementation sequence and its execution state.

- [Stage 00](stages/stage-00-preparation.md) defines the preparation phase.
- [M000](milestones/M000-documentation-structure.md) established the documentation structure.
- [M001](milestones/M001-architecture-decomposition.md) records architecture decomposition and source traceability.
- [M002](milestones/M002-architecture-reconciliation.md) reconciles architecture conflicts and ambiguities.
- [M003](milestones/M003-complete-implementation-roadmap.md) defines the complete implementation plan.
- [M004](milestones/M004-execution-readiness.md) is the next contract for validating execution readiness.
- [Progress data](progress.json) is authoritative; [the dashboard](progress.md) is its human-readable summary.
- [Roadmap](roadmap.md) defines approved ordering and scope; [requirements matrix](requirements-matrix.md) traces requirements to evidence; [definition of done](definition-of-done.md) records completion gates.

## Resuming work

For `implement next milestone`, read `AGENTS.md`, this file, the roadmap when available, and `progress.json`. Inspect Git state, resume any in-progress or blocked milestone first, then select the earliest pending milestone whose dependencies are complete. During bootstrap, M000–M004 are reserved in `AGENTS.md`; each next contract is established before handoff. M001's source is the preserved architecture reference.

Progress records must agree with repository evidence. Update JSON and dashboard together and validate the state before staging. See [Interrupted Session Recovery](../../AGENTS.md#14-interrupted-session-recovery).
