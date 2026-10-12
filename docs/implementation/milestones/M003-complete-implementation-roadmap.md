# M003 — Complete Implementation Roadmap

**Stage:** 00 — Preparation
**Status:** pending
**Dependencies:** M002

## Objective

Define the complete project scope as ordered stages and independently verifiable milestones, with contracts, dependencies, acceptance criteria, and verification requirements established in advance.

## Scope

- Translate the original specification's ten implementation phases into the approved planning model and reconcile them with `AGENTS.md`.
- Define every anticipated implementation milestone from Stage 01 onward; Stage 01 begins at M005.
- Create stage and milestone contracts with stable IDs, objective, dependencies, scope boundaries, architecture references, deliverables, measurable acceptance criteria, verification requirements, and completion checklists.
- Assign each original and approved requirement to at least one milestone and produce a traceability matrix.
- Establish global and milestone-level definitions of done without weakening `AGENTS.md`.
- Include the required bootstrap alignment for the existing generated scaffold so the approved Fastify/Jest/TypeScript stack is established before features.

## Out of scope

- Executing implementation milestones or changing application code.
- Progress validator and next-milestone tooling (M004).
- Changing approved architecture or adding speculative capabilities.

## Architecture references

- [`AGENTS.md`](../../../AGENTS.md), especially §§3–6 and 10–17.
- [`docs/architecture/`](../../architecture/overview.md) and accepted [ADRs](../../decisions/README.md).
- [Original source phases and acceptance outcomes](../../reference/nestjs-backend-starter-architecture-2026.md#20-implementation-roadmap-for-developer-agent).
- [`docs/implementation/stages/stage-00-preparation.md`](../stages/stage-00-preparation.md).

## Expected deliverables

- `roadmap.md` with complete stage/milestone ordering and dependencies.
- Stage definitions and a contract for every planned milestone.
- `requirements-matrix.md` linking source/approved requirements to milestone acceptance and verification.
- `definition-of-done.md` for global and milestone completion gates.
- M004 contract and explicit handoff to execution readiness.

## Acceptance criteria

- [ ] Every anticipated capability in approved scope is assigned to at least one milestone.
- [ ] Every milestone uses a unique stable ID, has bounded scope and measurable acceptance criteria, and includes all required contract fields from `AGENTS.md` §5.
- [ ] Dependencies reference valid IDs, are acyclic, and produce deterministic execution order.
- [ ] The original ten phase outcomes are traceable without overriding the approved Stage 00 workflow.
- [ ] Requirements matrix covers all applicable source and higher-authority requirements.
- [ ] Global and milestone definitions of done preserve every mandatory AGENTS.md completion gate.
- [ ] The project remains finite and no feature beyond the approved architecture is added.
- [ ] M004 is the next milestone with its contract available; application code remains unchanged.

## Verification requirements

- Audit source-to-requirement-to-milestone coverage.
- Check ID uniqueness, stage ordering, dependency references/cycles, contract fields, and deterministic selection.
- Confirm documented scope matches approved architecture and current scaffold evidence.
- Check internal links and progress consistency; inspect staged diff and run `git diff --cached --check`.
