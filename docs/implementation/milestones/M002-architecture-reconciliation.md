# M002 — Architecture Reconciliation

**Stage:** 00 — Preparation
**Status:** completed
**Dependencies:** M001

## Objective

Resolve source gaps, contradictions, and ambiguous technical requirements identified during architecture decomposition, while preserving the approved project architecture and recording material decisions.

## Scope

- Reconcile focused architecture documents against `AGENTS.md`, approved decisions, and the preserved source.
- Resolve or explicitly document the pasted source artifacts, truncated §21.3 sentence, source phase plan versus milestone workflow, current repository stack differences, and conditional OpenAPI target listed in `docs/architecture/overview.md`.
- Record material accepted decisions in ADRs and update affected architecture documents with a clear source of authority.
- Preserve traceability and do not weaken security, tenancy, or operational constraints.

## Out of scope

- Full stage-by-stage roadmap and all implementation milestone contracts (M003).
- Progress validation tooling and execution readiness validation (M004).
- Application feature implementation.

## Architecture references

- [`AGENTS.md`](../../../AGENTS.md), especially §§3–5, 12, and 15–16.
- [`docs/architecture/overview.md`](../../architecture/overview.md) and linked architecture specifications.
- [Original architecture source](../../reference/nestjs-backend-starter-architecture-2026.md).
- [`docs/decisions/README.md`](../../decisions/README.md).

## Expected deliverables

- Reconciled architecture documents whose authority and applicability are clear.
- ADRs for material choices that cannot be resolved directly from higher-authority requirements.
- A record of source ambiguities that cannot be recovered from available evidence.
- A bounded M003 contract ready for the next session.

## Acceptance criteria

- [x] Each M001 issue is resolved, or its remaining uncertainty and impact are explicitly documented.
- [x] No conflict with higher-authority instructions is silently accepted in favor of the source reference.
- [x] Material architecture choices have accepted ADRs with context, decision, consequences, and affected requirements.
- [x] Architecture documents preserve all source requirements that remain applicable and identify superseded or constrained requirements with rationale.
- [x] Source noise and truncation are retained as historical source facts; missing text is not fabricated.
- [x] No full implementation roadmap, application feature, or unapproved architecture expansion is introduced.
- [x] Progress and navigation accurately identify M003 as next.
- [x] The selected M003 contract exists and does not preempt its roadmap work.

## Completion checklist

- [x] Acceptance criteria checked.
- [x] Architecture and decision records updated.
- [x] Progress JSON/dashboard and Stage 00 status updated.
- [x] Relevant changes staged and staged diff reviewed.
- [x] No commit created.

## Verification requirements

- Review every issue in the architecture overview against applicable higher-authority documentation and repository evidence.
- Check internal links, ADR references, and source traceability after updates.
- Confirm progress invariants and deterministic next selection.
- Inspect the staged diff and run `git diff --cached --check`.

## Completion notes

- Source search-result/favicons snippets are treated as extraction artifacts and excluded from derived requirements; the reference remains untouched.
- The §21.3 truncation is documented. Its known tenant-scope requirement is covered by complete text in §5.2; no missing continuation is invented.
- The source's ten phases remain capability order to map under M003; `AGENTS.md` controls stage and milestone execution.
- Existing Express/Vitest files are identified as generated scaffold drift. Fastify and Jest from `AGENTS.md` govern; no application/package changes are made in this documentation milestone.
- `postgres.js` is selected over the `pg` candidate via ADR-001 based on the source's explicit technology decision. Official Drizzle documentation supports both integrations; actual dependency/runtime suitability is checked during bootstrap.
- OpenAPI 3.1 is the target when output can be validated as 3.1, including schema semantics. Otherwise declare the actual supported dialect and record the limitation; do not falsely label it.
- M003 remains responsible for the full implementation roadmap and will place the stack alignment work.
