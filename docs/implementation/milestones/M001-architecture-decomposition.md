# M001 — Architecture Decomposition

**Stage:** 00 — Preparation
**Status:** completed
**Dependencies:** M000

## Objective

Decompose the complete original architecture specification into focused authoritative architecture documents without losing substantive requirements, while preserving traceability to the source.

## Scope

- Read the complete source at `docs/reference/nestjs-backend-starter-architecture-2026.md`.
- Assign substantive requirements to the architecture destination documents established by AGENTS.md.
- Retain security, architecture, database, API, operational, testing, and implementation constraints.
- Identify source gaps, ambiguity, and noise for M002 rather than silently resolving them.
- Update documentation navigation and record evidence.

## Out of scope

- Reconciling conflicts against AGENTS.md or choosing among ambiguous alternatives (M002).
- Producing a complete implementation roadmap, milestone contracts beyond Stage 00, requirements matrix, or validation tooling (M003/M004).
- Performing M002's architecture reconciliation; a bounded M002 handoff contract is included so the next session can start from repository files alone.
- Implementing application features.

## Architecture references

- [`AGENTS.md`](../../../AGENTS.md) §§4–5 and 12.
- [Original specification](../../reference/nestjs-backend-starter-architecture-2026.md), all sections 1–21.
- Focused documents under `docs/architecture/`.

## Deliverables

- `overview.md`, `technology-stack.md`, `project-structure.md`, `database.md`, `authentication.md`, `authorization.md`, `multi-tenancy.md`, `api-conventions.md`, `security.md`, `email.md`, `observability.md`, `deployment.md`, and `testing.md`.
- Source section-to-destination map and explicit M002 issues in `overview.md`.
- Updated documentation index, Stage 00 status, and progress records.

## Acceptance criteria

- [x] The entire original source has been reviewed (2,559 lines, sections 1–21).
- [x] Every numbered source section is assigned to one or more authoritative architecture destinations.
- [x] Substantive requirements and constraints are represented, including schema/table rules, transaction invariants, authentication, authorization, tenancy, API contracts, security, email/outbox, observability, testing, developer workflow, Docker/Kubernetes, CI/CD, implementation phases, and coding standards.
- [x] Focused documents link conceptually to source sections and do not replace the preserved source.
- [x] Gaps, source artifacts, truncation, and conflicts requiring M002 are recorded, not silently decided.
- [x] No application features are implemented and no major architecture decision is introduced.
- [x] A fresh session resolves M002 as the next eligible milestone.
- [x] The selected M002 contract exists and describes the next bounded work without pre-deciding its outcomes.

## Verification requirements and evidence

- Read the source from first line through its final truncated sentence.
- Check section assignment coverage against source headings.
- Parse `progress.json`; validate IDs, statuses, dependency references, and deterministic next selection.
- Validate repository-relative Markdown links and ensure all expected architecture documents exist.
- Confirm the original source reference has not changed.
- Inspect the staged diff and run `git diff --cached --check`.

## Completion checklist

- [x] Acceptance criteria checked.
- [x] Progress JSON/dashboard and Stage 00 status updated.
- [x] Documentation changes staged and staged diff reviewed.
- [x] No commit created.

## Implementation notes

- The entire source was reviewed. Its numbered sections 1–21 were assigned in the overview source map and summarized in the focused architecture files.
- M002 issues: repeated pasted web search/favicons artifacts; incomplete final sentence of §21.3; source phase plan versus mandatory Stage 00 milestone execution model; package/adapter and test-runner differences in current repo; conditional OpenAPI 3.1 support.
- The reference file is preserved unchanged. No application code was changed.
- Verification: source section map and all expected document paths checked; Markdown links checked; progress JSON parsed and M002 selected; staged whitespace check passed.
