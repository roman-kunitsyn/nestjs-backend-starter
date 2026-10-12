# M002 — Architecture Reconciliation

**Stage:** 00 — Preparation
**Status:** pending
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

## Acceptance criteria

- [ ] Each M001 issue is resolved, or its remaining uncertainty and impact are explicitly documented.
- [ ] No conflict with higher-authority instructions is silently accepted in favor of the source reference.
- [ ] Material architecture choices have accepted ADRs with context, decision, consequences, and affected requirements.
- [ ] Architecture documents preserve all source requirements that remain applicable and identify superseded or constrained requirements with rationale.
- [ ] Source noise and truncation are retained as historical source facts; missing text is not fabricated.
- [ ] No full implementation roadmap, application feature, or unapproved architecture expansion is introduced.
- [ ] Progress and navigation accurately identify M003 as next.

## Verification requirements

- Review every issue in the architecture overview against applicable higher-authority documentation and repository evidence.
- Check internal links, ADR references, and source traceability after updates.
- Confirm progress invariants and deterministic next selection.
- Inspect the staged diff and run `git diff --cached --check`.
