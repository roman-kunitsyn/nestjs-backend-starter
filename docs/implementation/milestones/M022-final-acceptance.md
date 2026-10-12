# M022 — Final Review and Acceptance

**Stage:** 10 — Final Verification
**Status:** pending
**Dependencies:** M021

## Objective

Review and validate the complete implementation against every approved requirement and resolve release-blocking defects without expanding product scope.

## Scope

- Architecture consistency and maintainability review; auth, security, tenant isolation, DB/schema/migrations, API/OpenAPI, email/outbox, logging/health, container, Kubernetes and CI/CD verification.
- Full automated suites and coverage gates; staging rollout/restore evidence; documentation/README and requirements matrix reconciliation.
- Fix defects discovered during validation, record any non-blocking limitation and obtain required approval for any acceptance exception.

## Out of scope

- New major features or speculative architecture changes.
- Claiming deployment, backup restoration, or infrastructure success without executing it.

## Architecture references

- [Global definition of done](../definition-of-done.md), [requirements matrix](../requirements-matrix.md), all architecture documents and `AGENTS.md` §17.

## Deliverables

- Final verification record, reconciled docs/matrix, completed progress state, and project acceptance report.

## Acceptance criteria

- [ ] Every approved milestone/stage is completed; dependency, progress, and Git handoffs are consistent.
- [ ] Every traceability matrix requirement has evidence; all mandatory quality/security/tenant checks pass.
- [ ] No release-blocking defects remain; unresolved issues and impact are documented.
- [ ] Actual staging deployment, migration behavior, probes, rollback, and backup restore are evidenced; no unsupported claims.
- [ ] Public API/OpenAPI match runtime; docs and README describe actual behavior.
- [ ] Project is set to completed only after all evidence is recorded; final report includes completion summary.

## Verification

Run all required lint/format/typecheck/unit/integration/E2E/contract/build/Helm/security/staging/restore checks applicable to the complete system; audit all evidence and progress graph.

## Completion checklist

- [ ] No critical defect; requirements and stage exits verified; docs reconciled; progress complete; staged diff inspected.
