# M022 — Final Review and Acceptance

**Stage:** 10 — Final Verification
**Status:** pending
**Dependencies:** M021

## Objective

Review and validate the complete implementation against every approved requirement and resolve release-blocking defects without expanding product scope.

## Scope

- Architecture consistency and maintainability review; auth, security, tenant isolation, DB/schema/migrations, API/OpenAPI, email/outbox, logging/health, container, Kubernetes and CI/CD verification.
- Full automated suites and coverage gates; actual production-like staging rollout and managed PostgreSQL backup/PITR restore evidence; documentation/README and requirements matrix reconciliation.
- Fix defects discovered during validation, record any non-blocking limitation and obtain required approval for any acceptance exception.

## Out of scope

- New major features or speculative architecture changes.
- Claiming deployment, backup restoration, or infrastructure success without executing it.

## Architecture references

- [Global definition of done](../definition-of-done.md), [requirements matrix](../requirements-matrix.md), all architecture documents and `AGENTS.md` §17.

## CI/CD and deployment evidence boundary

M021 verifies GitHub Actions CI execution, tagged GHCR publication and artifact evidence, GitHub environment/protection configuration, and release/deployment workflow safety. M022 verifies the outcome in an actual production-like staging environment; local kind/k3d checks or M021 workflow configuration do not substitute for that evidence. Managed PostgreSQL backup/PITR recovery also remains an M022 gate under [ADR-002](../../decisions/ADR-002-template-versus-production-verification.md).

## Deliverables

- Final verification record, reconciled docs/matrix, completed progress state, and project acceptance report.

## Acceptance criteria

- [ ] Every approved milestone/stage is completed; dependency, progress, and Git handoffs are consistent.
- [ ] Every traceability matrix requirement has evidence; all mandatory quality/security/tenant checks pass.
- [ ] No release-blocking defects remain; unresolved issues and impact are documented.
- [ ] Actual production-like staging deployment is evidenced, including external secret delivery, TLS, migration behavior, healthy rollout/probes, smoke checks, and image rollback; no local kind/k3d result is represented as production evidence.
- [ ] Managed PostgreSQL backup/PITR restore rehearsal is evidenced with recovery point, observed RPO/RTO, schema/migration validation, application smoke result, and operator. M020 isolated PostgreSQL restore checks do not satisfy this criterion.
- [ ] Public API/OpenAPI match runtime; docs and README describe actual behavior.
- [ ] Project is set to completed only after all evidence is recorded; final report includes completion summary.

## Verification

Run all required lint/format/typecheck/unit/integration/E2E/contract/build/Helm/security/staging/restore checks applicable to the complete system; audit all evidence and progress graph.

## Completion checklist

- [ ] No critical defect; requirements and stage exits verified; docs reconciled; progress complete; staged diff inspected.
