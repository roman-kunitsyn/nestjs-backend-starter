# Stage 00 — Preparation

**Status:** completed
**Objective:** Establish documentation, reconcile the source architecture, plan the implementation, and prepare deterministic milestone execution before feature work begins.

## Prerequisites

Repository bootstrap. No application feature implementation is permitted during this stage unless a preparation milestone explicitly requires supporting tooling.

## Milestones

| ID | Title | Status |
| --- | --- | --- |
| M000 | Documentation Structure | completed |
| M001 | Architecture Decomposition | completed |
| M002 | Architecture Reconciliation | completed |
| M003 | Complete Implementation Roadmap | completed |
| M004 | Execution Readiness | completed |

M000–M004 are reserved by `AGENTS.md`. M000 established navigation; M001 decomposed the source; M002 reconciled the architecture; M003 approved the complete roadmap; M004 validated tracking and execution readiness. Stage 00 exit criteria pass, and M005 is next.

## Expected outcomes

- A navigable documentation structure with the original specification preserved.
- Focused architecture specifications and any needed ADRs.
- A complete, dependency-ordered roadmap and milestone contracts.
- Requirements traceability, definitions of done, progress validation, and recovery procedures.

## Stage exit criteria

Stage 00 exits only when the requirements in `AGENTS.md` §5 are met: the original source has been decomposed and reconciled, requirements and planned features are traceable, milestone criteria and dependencies are valid and acyclic, next selection is deterministic, and progress tracking validates from repository files alone.

## Completion record

- Exit criteria: passed on 2026-10-13.
- Evidence: `pnpm progress:validate`, progress regression cases, generated dashboard consistency, requirements matrix coverage, and M005 selection.
- Stage status is recorded as `completed` in `progress.json`.
