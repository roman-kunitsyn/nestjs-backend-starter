# M004 — Execution Readiness

**Stage:** 00 — Preparation
**Status:** pending
**Dependencies:** M003

## Objective

Initialize and validate the progress tracker, milestone selector, and recovery/execution procedures so a fresh session can deterministically start M005 using repository files alone.

## Scope

- Validate roadmap metadata, IDs, dependencies, stage ordering, milestone contracts, traceability, and progress invariants.
- Add validation tooling and a command documented for local use.
- Reconcile `progress.json` and generated/maintained `progress.md` to the complete roadmap.
- Document interrupted-work recovery and next-milestone resolution in the implementation navigation.
- Complete Stage 00 tracking and stage exit records only if all preparation criteria pass.

## Out of scope

- Executing M005 or any application implementation milestone.
- Revising the approved project scope or architecture.

## Architecture references

- [`AGENTS.md`](../../../AGENTS.md) §§5, 7–9, 14–16.
- [`roadmap.md`](../roadmap.md), [`requirements-matrix.md`](../requirements-matrix.md), and [`definition-of-done.md`](../definition-of-done.md).
- [`progress.json`](../progress.json).

## Expected deliverables

- Progress validator and deterministic selector (using the project's existing supported runtime/tooling where practical).
- Complete, validated progress data and dashboard.
- Stage 00 marked complete only when its exit criteria pass; M005 identified as next.
- Recovery/execution instructions tested against repository state.

## Acceptance criteria

- [ ] Unique milestone IDs, valid status values and references, acyclic dependencies, valid contracts, and stage/roadmap ordering are checked by tooling.
- [ ] Completed milestones cannot have unfinished dependencies; at most one milestone is active; project/stage status is consistent.
- [ ] Requirements coverage is checked and next selection returns the earliest eligible milestone or reports no eligible work.
- [ ] Dashboard agrees with authoritative progress JSON.
- [ ] An interrupted in-progress or blocked milestone is resumed before selecting pending work.
- [ ] Stage 00 exit criteria pass and M005 is selected from repository files alone.
- [ ] No feature implementation has begun.

## Verification requirements

- Run validator against valid progress and fixtures/cases for duplicate IDs, invalid status/reference, dependency cycle, multiple active milestones, incomplete dependency, and wrong next milestone.
- Verify dashboard generation/consistency and fresh-session M005 selection.
- Inspect staged diff and run `git diff --cached --check`.

## Completion checklist

- [ ] Acceptance criteria and validator cases pass.
- [ ] Progress JSON/dashboard and Stage 00 completion state agree.
- [ ] M005 resolves as the next eligible milestone from repository files alone.
- [ ] Relevant changes are staged and staged diff reviewed; no commit created.
