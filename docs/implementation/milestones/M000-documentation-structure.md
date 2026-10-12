# M000 — Documentation Structure

**Stage:** 00 — Preparation
**Status:** completed
**Dependencies:** none

## Objective

Establish the approved documentation directories, navigation, conventions, and minimal tracking records that let a fresh session resume Stage 00.

## Scope

- Inspect the existing repository documentation and preserve the original architecture specification at `docs/reference/nestjs-backend-starter-architecture-2026.md`.
- Establish navigation for reference, architecture, decisions, implementation, and operations documentation.
- Add Stage 00 navigation and bootstrap progress records for reserved milestones M000–M004.
- Document how the next session resumes and selects work using repository state.

## Out of scope

- Reading, decomposing, summarizing, or reconciling the architecture specification's requirements (M001 and M002).
- Creating architecture specifications, ADRs, the full roadmap, requirements matrix, global definition of done, or progress validation tooling.
- Implementing application features.

## Architecture references

- [`AGENTS.md`](../../../AGENTS.md), especially §§4–9 and 14–16.
- Original source: [`nestjs-backend-starter-architecture-2026.md`](../../reference/nestjs-backend-starter-architecture-2026.md), preserved without modification for M001.

## Deliverables

- Documentation index and conventions in `docs/README.md`.
- Architecture decision index and implementation navigation.
- Stage 00 overview, this milestone contract, and initial progress data/dashboard.

## Acceptance criteria

- [x] Approved documentation areas are represented and reachable from `docs/README.md`.
- [x] Navigation explains document authority, source preservation, and basic authoring conventions.
- [x] The original architecture specification exists at its required reference path and is unchanged.
- [x] Stage 00 records M000–M004 in reserved order; M000 is complete and M001 is the next pending milestone.
- [x] A fresh session can find the bootstrap recovery and selection instructions without conversation history.
- [x] No architecture decomposition or application feature implementation is included.

## Verification requirements and evidence

- Inspect repository and Git state before changes: clean worktree; source specification already at the required path.
- Verify required navigation, stage, milestone, and tracking files exist and links resolve to repository paths.
- Parse `progress.json` and check its milestone order, status values, dependencies, and next milestone.
- Confirm the architecture reference has no diff.
- Inspect staged diff and run `git diff --cached --check`.

## Completion checklist

- [x] Acceptance criteria checked.
- [x] Progress JSON and dashboard updated consistently.
- [x] Relevant M000 changes staged and staged diff reviewed.
- [x] No commit created.

## Implementation notes

- The source specification was already present at the required path; it was left unchanged.
- This milestone establishes bootstrap records only. M001 remains responsible for examining and decomposing the source.
- Checks: JSON parsing and focused repository/file/link checks passed; staged whitespace check passed. Application lint, tests, typecheck, and build are not applicable to documentation-only M000.
