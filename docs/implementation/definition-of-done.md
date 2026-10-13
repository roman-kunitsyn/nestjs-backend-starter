# Definition of done

This document makes the global and per-milestone completion gates explicit. `AGENTS.md` remains authoritative; no item here may weaken its requirements.

## Every implementation milestone

A milestone is complete only when:

- Its entire approved scope is implemented as working behavior, with no placeholders.
- Every contract acceptance criterion passes and required dependencies are complete.
- Code is reviewed and refactored for correctness, readability, type safety, duplication, boundaries, security, data integrity, tenant isolation, errors, and operations.
- Relevant automated unit, integration, E2E, security, and contract tests pass; unavailable infrastructure is reported as not run, never passed.
- Lint, typecheck, and build pass where available and applicable.
- Database migrations are versioned and verified, with safe deployment behavior where applicable.
- API contracts, architecture, operations, and README documentation reflect actual behavior.
- Authentication, authorization, secret handling, and tenant-isolation controls are satisfied.
- No known critical or release-blocking defect remains.
- Requirements traceability and progress JSON/dashboard/stage records are consistent and validated.
- Only relevant files are staged, staged diff passes whitespace checks and has been inspected, and no commit/push is made unless explicitly requested.
- Final report states actual results, limitations, staged state, suggested snake_case commit, and next eligible milestone.

## Preparation milestones

Documentation-only Stage 00 milestones may omit application tests/build only when the milestone contract confirms they are not applicable. They must still validate document links, source preservation, progress consistency, and staged diff as specified by the contract.

## Stage completion

A stage is complete when every milestone in it is completed and its documented stage exit criteria pass. Record stage completion in progress tracking and the dashboard. A blocked or pending milestone prevents stage completion.

## Project final acceptance

M022 may mark the project completed only after confirming:

1. All approved milestones and stage exit criteria are complete.
2. Every applicable requirement in `requirements-matrix.md` has verification evidence.
3. All required lint, typecheck, unit, PostgreSQL integration, E2E, contract, build, Helm, security, and deployment checks pass. A required check that is unavailable is not a pass; resolve it or keep the milestone/project incomplete or blocked under `AGENTS.md`.
4. No release-blocking defects remain.
5. Architecture, API, operations, and user-facing docs match the implementation.
6. Deployment, migration, secret, scaling, backup, and recovery behavior in the reusable template has actual local verification evidence; no provider deployment or managed restore is claimed without execution. Provider-specific infrastructure, real environment credentials, production TLS/DNS, managed PostgreSQL PITR, live cloud deployment, and production disaster recovery are adopter deployment responsibilities and are documented separately.

### M022 infrastructure acceptance boundary

M022 uses a fresh disposable kind or k3d cluster and PostgreSQL instance with synthetic data. It verifies Helm install/upgrade, migrations, health probes, local smoke checks, application rollback, database backup/restore, Kubernetes security controls, and documentation consistency. GitHub governance and release evidence are verified under M021. None of these local checks are represented as production/provider evidence.
7. Progress records are consistent, and project status is set to `completed` only after all evidence is recorded.

Project completion is terminal for this roadmap. Further work requires an explicitly approved new scope.
