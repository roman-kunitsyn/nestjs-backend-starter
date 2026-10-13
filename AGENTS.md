# AGENTS.md

# Agent Instructions — nestjs-backend-starter

## 1. Purpose

This document defines the mandatory operating rules for AI development agents working on `nestjs-backend-starter`.

The project is a finite, milestone-driven implementation of a production-ready backend starter using NestJS, TypeScript, Fastify, PostgreSQL, Drizzle ORM, Zod, REST APIs, organization-based multi-tenancy, and Kubernetes.

The project has a predefined scope, an implementation roadmap, explicit acceptance criteria, and a final definition of done.

**The objective is to complete the project, not to continuously generate new work.**

Agents must implement the project through ordered stages and milestones, leaving the repository in a verified, documented, and resumable state after each milestone.

### Primary execution command

The standard user instruction is:

`implement next milestone`

This command must be sufficient to select and execute the next eligible milestone without asking the user to identify it.

**One agent session executes one milestone.**

Do not automatically begin another milestone after completing the current one.

---

## 2. Agent Role

Act as a senior backend engineer with responsibility for implementation quality, security, correctness, testing, and maintainability.

The detailed agent role is defined in:

`agents/project-developer.jsonc`

Follow that role definition when available.

The agent may plan, research, implement, review, refactor, test, validate, and document work necessary to complete the selected milestone.

The agent must not independently change approved project architecture, expand project scope, or authorize production releases.

### Core responsibilities

- Implement complete, working functionality.
- Follow the approved architecture and technology stack.
- Preserve modular boundaries and type safety.
- Enforce authentication, authorization, and tenant isolation.
- Maintain database integrity and safe migrations.
- Write meaningful automated tests.
- Review and refactor implementation before completion.
- Keep documentation consistent with actual behavior.
- Maintain reliable milestone progress tracking.
- Stage only relevant Git changes.
- Provide an accurate final implementation report.

Never claim that functionality has been implemented or verified without supporting evidence.

---

## 3. Project Technology Constraints

The approved technology stack is:

| Area              | Technology                                         |
| ----------------- | -------------------------------------------------- |
| Runtime           | Node.js 24 LTS                                     |
| Language          | TypeScript, strict mode                            |
| Framework         | NestJS                                             |
| HTTP adapter      | Fastify                                            |
| API               | REST + OpenAPI                                     |
| Validation        | Zod                                                |
| Database          | PostgreSQL                                         |
| ORM               | Drizzle ORM                                        |
| Migrations        | Drizzle Kit                                        |
| Authentication    | JWT access tokens + rotating opaque refresh tokens |
| Password hashing  | Argon2id                                           |
| Authorization     | RBAC + ownership policies                          |
| Multi-tenancy     | Organization-based, shared database and schema     |
| Email             | Injectable provider abstraction                    |
| Email reliability | PostgreSQL transactional outbox                    |
| Logging           | Pino                                               |
| Testing           | Jest + Testcontainers + E2E                        |
| Package manager   | pnpm                                               |
| Containers        | Docker                                             |
| Deployment        | Kubernetes + Helm                                  |
| CI/CD             | GitHub Actions                                     |

Use compatible stable versions and maintain a reproducible lockfile.

Do not replace approved technologies without explicit authorization.

Do not introduce GraphQL, Prisma, TypeORM, Express, class-validator, Redis, Kafka, microservices, or general-purpose background job infrastructure unless an approved architectural change requires them.

---

## 4. Documentation Architecture

The repository uses documentation as persistent project memory.

**Git-tracked files are authoritative. Previous agent conversations are not.**

### Documentation structure

```text
AGENTS.md
README.md

agents/
  project-developer.jsonc

docs/
  README.md

  reference/
    nestjs-backend-starter-architecture-2026.md

  architecture/
    overview.md
    technology-stack.md
    project-structure.md
    database.md
    authentication.md
    authorization.md
    multi-tenancy.md
    api-conventions.md
    security.md
    email.md
    observability.md
    deployment.md
    testing.md

  decisions/
    README.md
    ADR-*.md

  implementation/
    README.md
    roadmap.md
    requirements-matrix.md
    definition-of-done.md
    progress.json
    progress.md

    stages/
      stage-*.md

    milestones/
      M*.md

  operations/
    local-development.md
    testing.md
    migrations.md
    kubernetes.md
    troubleshooting.md
```

Files generated during Stage 00 may not exist initially. Their absence during bootstrap is expected.

Do not create unnecessary documentation files outside the approved structure.

### Documentation authority

Use the following precedence:

1. **`AGENTS.md`** — Mandatory agent execution protocol.
2. **Approved architecture decisions** — Explicit architectural constraints and accepted ADRs.
3. **`docs/architecture/`** — Authoritative technical specifications.
4. **`docs/implementation/definition-of-done.md`** — Quality and completion requirements.
5. **`docs/implementation/roadmap.md` and milestone files** — Implementation order and milestone contracts.
6. **`docs/implementation/progress.json`** — Authoritative recorded execution status.
7. **`docs/operations/`** — Operational procedures.
8. **`README.md`** — Human-facing project overview.
9. **`docs/reference/`** — Original specifications and historical reference material.

Higher-priority documents govern when there is a conflict.

However, conflicts must be reported and reconciled rather than silently ignored.

A milestone cannot override approved architecture or weaken the definition of done.

### Original architecture specification

The original source specification is:

`nestjs-backend-starter-architecture-2026.md`

During Stage 00, it must be preserved under:

`docs/reference/nestjs-backend-starter-architecture-2026.md`

If the source document is already located elsewhere, locate and read it before modifying or moving it.

Stage 00 must decompose the specification into focused architecture documents without losing substantive requirements.

After architecture reconciliation is complete, `docs/architecture/` becomes the authoritative technical specification.

The original document remains a historical reference, not a competing implementation contract.

---

## 5. Stage 00 — Preparation

Stage 00 establishes the project documentation, complete implementation plan, tracking system, and execution readiness.

**Stage 00 is mandatory and precedes feature implementation.**

Do not implement application features during Stage 00 unless a preparation milestone explicitly requires supporting tooling.

### Stage 00 milestones

| ID   | Milestone                       | Objective                                                                                |
| ---- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| M000 | Documentation structure         | Establish documentation directories, navigation, and conventions                         |
| M001 | Architecture decomposition      | Split the original architecture specification into focused documents                     |
| M002 | Architecture reconciliation     | Resolve gaps, contradictions, and ambiguous technical requirements                       |
| M003 | Complete implementation roadmap | Define all implementation stages, milestones, dependencies, and acceptance criteria      |
| M004 | Execution readiness             | Initialize and validate progress tracking, milestone selection, and execution procedures |

These IDs are reserved and must not be renumbered.

Stage 01 begins with M005.

### Stage 00 requirements

Stage 00 must produce:

- A complete technical documentation structure.
- Focused architecture documents.
- Relevant architecture decision records.
- A complete stage-by-stage implementation roadmap.
- A milestone contract for every planned milestone.
- Explicit milestone dependencies.
- A requirements traceability matrix.
- Global and milestone-level definitions of done.
- An initialized progress tracker.
- A human-readable progress dashboard.
- Deterministic next-milestone selection rules.
- Validation tooling for milestone metadata and progress consistency.
- Documentation for recovering interrupted sessions.

### Architecture decomposition rules

When splitting the original specification:

1. Read the entire document.
2. Identify all substantive requirements.
3. Assign each requirement to an authoritative destination document.
4. Preserve security, architectural, and operational constraints.
5. Avoid duplicating complete requirements across documents.
6. Record ambiguities for architectural reconciliation.
7. Ensure requirements remain traceable to the original specification.

Do not silently remove or materially change requirements.

### Planning requirements

M003 must define **all anticipated implementation milestones in advance**.

Every milestone must include:

- Stable milestone ID.
- Title and stage.
- Objective.
- Dependencies.
- Scope.
- Out-of-scope boundaries.
- Architecture references.
- Expected deliverables.
- Acceptance criteria.
- Verification requirements.
- Completion checklist.

Future milestones may be refined when new technical information becomes available, but changes must be explicit, documented, and justified.

Do not silently insert, remove, reorder, or redefine approved milestones.

### Stage 00 completion

Stage 00 is complete only when:

- The original architecture specification has been fully decomposed and reconciled.
- Every original implementation requirement is traceable.
- Every planned feature is assigned to at least one milestone.
- Every milestone has measurable acceptance criteria.
- All dependencies reference valid milestone IDs.
- The milestone dependency graph has no cycles.
- The execution order is deterministic.
- Progress tracking is initialized and validated.
- A fresh agent session can identify the next milestone using repository files alone.

---

## 6. Implementation Planning Model

The project uses three planning levels.

### Project

Defines the complete application scope and final acceptance criteria.

### Stage

Groups related milestones toward a meaningful architectural capability.

A stage must define:

- Objective.
- Prerequisites.
- Milestones.
- Expected outcomes.
- Stage exit criteria.

### Milestone

Defines one coherent, independently verifiable unit of implementation.

A milestone should deliver working functionality or a complete reusable infrastructure capability.

Avoid milestones defined only as file creation, partial scaffolding, or unrelated collections of tasks.

### Milestone IDs

Milestone IDs are globally unique and immutable.

Format:

`M000`, `M001`, `M002`, and so on.

Never reuse or renumber existing milestone IDs.

If approved planning changes require additional milestones, allocate new IDs and update dependencies explicitly.

### Milestone sizing

A milestone should:

- Have one primary objective.
- Have bounded, understandable scope.
- Depend only on explicitly identified prerequisites.
- Include verifiable acceptance criteria.
- Be implementable within a coherent agent session.
- Leave the repository in a valid state.
- Include all necessary testing, refactoring, and documentation.

Do not split a feature into meaningless file-level milestones.

Do not combine unrelated features solely to reduce milestone count.

---

## 7. Progress Tracking

The authoritative execution state is stored in:

`docs/implementation/progress.json`

The human-readable dashboard is:

`docs/implementation/progress.md`

The roadmap defines the ordered work. Milestone documents define the required outcomes.

**Do not maintain conflicting independent status fields across multiple files.**

Prefer generating `progress.md` from `progress.json`.

### Milestone statuses

Only these statuses are permitted:

- `pending`
- `in_progress`
- `blocked`
- `completed`

### Status definitions

**pending**

The milestone has not started.

**in_progress**

Implementation has begun, and completion gates have not yet all passed.

**blocked**

The milestone cannot currently be completed safely. The blocker and required resolution must be documented.

**completed**

All milestone acceptance criteria, quality checks, documentation updates, progress updates, and Git handoff requirements have passed.

### Project statuses

Use:

- `preparation`
- `in_progress`
- `blocked`
- `completed`

Project completion is terminal for the approved implementation roadmap.

### Progress invariants

- Only one milestone may be `in_progress`.
- Completed milestones must retain their completion records.
- Milestones cannot be completed while required dependencies remain incomplete.
- A blocked milestone cannot be silently skipped.
- The progress state must agree with repository evidence.
- The current milestone must be deterministically resolvable.
- Completed milestones must not be reset without an explicit correction record.
- The project cannot be marked completed while required milestones remain incomplete.

### Progress updates

Every milestone must update:

1. `progress.json`.
2. The generated or maintained `progress.md`.
3. Relevant stage completion information.
4. The milestone's implementation notes, where applicable.
5. Requirements traceability or verification evidence, where applicable.

Progress data must be validated before staging.

---

## 8. Next-Milestone Selection

Before any editing, confirm the human-selected short-lived branch, current worktree, milestone and dependency state. Branch preparation, pull requests, human integration, and interrupted-branch recovery follow [Git workflow](docs/operations/git-workflow.md). Do not assume milestone completion means its branch has been merged.

When the user says:

`implement next milestone`

Execute the following selection protocol.

### Step 1 — Read instructions

Read:

1. `AGENTS.md`.
2. `docs/implementation/README.md`, if available.
3. `docs/implementation/roadmap.md`, if available.
4. `docs/implementation/progress.json`, if available.
5. `docs/implementation/definition-of-done.md`, if available.

During bootstrap, missing files are expected.

### Step 2 — Inspect repository state

Run the equivalent of:

```bash
git status --short
git diff --stat
git diff --cached --stat
```

Identify:

- Uncommitted changes.
- Pre-existing staged changes.
- Interrupted milestone work.
- Changes unrelated to the next milestone.

Never assume an uncommitted change belongs to the current task.

### Step 3 — Resolve existing work

If a milestone is already `in_progress`, inspect its implementation and resume it.

If a milestone is `blocked`, revisit the blocker and resume it if resolution is available.

If an earlier milestone has an unresolved handoff or tracking inconsistency, reconcile that state before starting new work.

Do not automatically skip unfinished milestones.

### Step 4 — Select the next milestone

If no milestone is in progress or blocked:

1. Read the approved milestone ordering.
2. Identify milestones with `pending` status.
3. Exclude milestones whose dependencies are incomplete.
4. Select the earliest eligible milestone in roadmap order.
5. Verify its specification exists.

Do not select milestones by intuition, file modification time, or perceived importance.

### Step 5 — Detect project completion

If every required milestone is completed and final acceptance has passed, do not create new work.

Report that the planned project implementation is complete.

### Step 6 — Load the milestone contract

Read the selected milestone file and referenced architecture documents.

Read relevant source code, tests, and existing conventions before implementation.

Do not load unrelated documentation unless required to resolve a dependency or architectural question.

---

## 9. Mandatory Milestone Execution Workflow

Each milestone must follow this sequence.

### Phase A — Understand

- Read the milestone contract.
- Verify completed dependencies.
- Read relevant architecture specifications.
- Inspect existing implementation.
- Examine tests and applicable conventions.
- Identify security and tenant-isolation requirements.

### Phase B — Prepare

- Confirm repository state.
- Resolve existing milestone recovery requirements.
- Mark the selected milestone `in_progress`.
- Identify affected files and expected outputs.
- Establish a focused implementation approach.

Do not begin another milestone.

### Phase C — Implement

- Implement the complete milestone scope.
- Follow existing architecture and module boundaries.
- Add required validation and authorization.
- Implement database changes and migrations if required.
- Maintain backward compatibility where required.
- Add or update tests alongside the implementation.

Do not create placeholder functionality and mark it complete.

### Phase D — Refactor

Review the implementation for:

- Correctness.
- Readability.
- Type safety.
- Duplication.
- Unnecessary abstraction.
- Module boundaries.
- Security.
- Database consistency.
- Tenant isolation.
- Error handling.
- Operational behavior.

Refactor where necessary without expanding into unrelated work.

### Phase E — Verify

Run all checks applicable to the milestone:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Run database, OpenAPI, deployment, or security checks when relevant.

Execute only commands that are available and applicable to the current repository state.

If a required check is unavailable, explain why. Do not report it as passed.

### Phase F — Document

Update:

- Relevant architecture documentation.
- Relevant operational documentation.
- Public API contracts.
- Database documentation.
- Relevant milestone implementation notes.
- Requirements traceability when necessary.

Documentation must describe actual behavior rather than planned or assumed behavior.

### Phase G — Complete

Verify all milestone acceptance criteria and the global definition of done.

Only then:

1. Mark the milestone `completed`.
2. Record verification results.
3. Update the progress dashboard.
4. Update stage completion status if this is the final milestone of its stage.
5. Validate progress consistency.
6. Stage the relevant Git changes.
7. Verify the staged diff.
8. Produce the final milestone report.

**Stop after this milestone.**

Do not begin the next milestone in the same session.

---

## 10. Definition of Done

The global definition of done is maintained in:

`docs/implementation/definition-of-done.md`

Until that file is created during Stage 00, the following rules are mandatory.

A milestone is complete only when:

- All required functionality is implemented.
- Every acceptance criterion is satisfied.
- Code has been reviewed and refactored where appropriate.
- Relevant automated tests pass.
- Linting and typechecking pass where applicable.
- The application builds successfully where applicable.
- Database changes are migrated and verified where applicable.
- API contracts and documentation are updated.
- Authentication, authorization, and tenant isolation requirements are satisfied.
- No known critical defects remain.
- Progress records are consistent.
- Relevant Git changes are staged.
- The staged diff has been inspected.
- The final report is prepared with a suggested commit name.

### Failed quality checks

Do not mark a milestone completed when required checks fail.

Investigate and fix failures within the scope of the milestone.

If a failure cannot be resolved safely, mark the milestone `blocked` and document the issue.

### Unavailable verification

A required test or infrastructure check that cannot be performed is not a passing result.

Record the limitation and follow the milestone's acceptance policy.

Do not substitute unverified assumptions for required evidence.

### Stage completion

A stage is complete when all its milestones are completed and its stage exit criteria pass.

The final milestone of a stage must record its stage completion.

### Project completion

The project is complete only when all required milestones, all stage exit criteria, and final acceptance checks pass.

---

## 11. Engineering Rules

### Architecture

- Maintain the modular monolith architecture.
- Keep controllers thin.
- Use application services for use-case orchestration.
- Use repositories or explicit persistence services for database access.
- Enforce domain invariants centrally.
- Respect dependency injection.
- Avoid circular dependencies.
- Avoid premature abstractions.

### Type safety and validation

- Enable strict TypeScript.
- Use Zod for external input validation.
- Validate untrusted data at boundaries.
- Avoid unnecessary `any` or unsafe type assertions.
- Keep response DTOs independent of database records.
- Never expose sensitive internal fields.

### Database

- Use PostgreSQL and Drizzle ORM.
- Use parameterized queries.
- Define foreign keys, unique constraints, and indexes explicitly.
- Use transactions when atomicity is required.
- Preserve deployed migration history.
- Do not automatically migrate from application pod startup.
- Avoid destructive database operations without authorization.

### Authentication and security

- Never store plaintext passwords or refresh tokens.
- Validate JWT signatures and required claims.
- Enforce refresh-token rotation and revocation.
- Protect cookie-authenticated operations against applicable CSRF threats.
- Apply rate limits and security headers.
- Redact sensitive credentials from logs.
- Use explicit authorization checks.
- Do not introduce undocumented privilege bypasses.

### Multi-tenancy

- Treat organization isolation as a security boundary.
- Verify active organization membership.
- Enforce permission and ownership policies.
- Scope tenant-owned database queries and mutations by organization.
- Validate cross-resource organization consistency.
- Test cross-tenant access denial.
- Protect organization ownership invariants under concurrency.

### API conventions

- Use REST and established HTTP semantics.
- Follow `/api/v1` conventions.
- Use Zod schemas.
- Maintain accurate OpenAPI contracts.
- Use RFC 9457 Problem Details for errors.
- Follow documented pagination and filtering conventions.

### Infrastructure

- Maintain stateless application behavior.
- Support multiple Kubernetes replicas.
- Implement graceful shutdown.
- Maintain appropriate health endpoints.
- Keep production secrets outside source control.
- Use controlled database migration deployments.

---

## 12. Scope Control

Implement only the selected milestone and any strictly necessary supporting work.

### Allowed supporting work

Supporting changes are acceptable when they are necessary to:

- Complete the milestone correctly.
- Fix a defect directly blocking the milestone.
- Preserve security or data integrity.
- Maintain compilation or relevant test compatibility.
- Update affected documentation.

### Out-of-scope discoveries

If unrelated defects or improvements are discovered:

1. Record them in the milestone implementation notes or an appropriate issue register.
2. Assess whether they block safe milestone completion.
3. Fix security-critical problems that directly affect the selected work.
4. Avoid unrelated refactoring.
5. Recommend future work through the approved planning process.

Do not silently expand the roadmap.

### Architecture changes

If the implementation requires a change to an approved architectural decision:

- Describe the conflict.
- Explain the proposed alternative.
- Identify affected requirements and milestones.
- Request approval when the change is material.
- Create or update an ADR after approval.

Do not change major technologies or security guarantees without authorization.

---

## 13. Git Working Tree Protocol

Git is part of the milestone handoff process.

**The agent stages changes but does not commit or push unless explicitly instructed.**

### Before implementation

Inspect:

```bash
git status --short
git diff --stat
git diff --cached --stat
```

Identify pre-existing changes.

Do not overwrite, reset, clean, or discard unrelated work.

### During implementation

Keep changes focused on the selected milestone.

Do not modify unrelated files solely for formatting or cleanup.

Avoid broad automated fixes that create unnecessary repository-wide diffs.

### Before staging

- Run relevant verification commands.
- Update documentation and progress.
- Review all changed files.
- Inspect for secrets and accidental artifacts.
- Confirm no unrelated changes are included.

### Staging

Stage only milestone-related files or hunks.

Do not blindly execute:

```bash
git add .
git add -A
```

When necessary, use targeted staging or patch staging.

Never unstage or replace unrelated pre-existing staged changes without authorization.

### Staged diff verification

Run:

```bash
git diff --cached --check
git diff --cached --stat
```

Inspect the staged diff and verify it contains only intended changes.

If unrelated staged changes prevent a clean handoff, report the conflict.

### Commit policy

Do not automatically create a commit.

Do not push changes.

Provide a suggested commit name in the final report.

Commit names must be:

- Lowercase.
- Snake_case.
- Concise.
- Meaningful.
- Focused on the delivered milestone.

Examples:

```text
project_bootstrap
http_api_foundation
drizzle_database_setup
user_registration
refresh_token_rotation
organization_memberships
tenant_isolation
kubernetes_deployment
final_quality_review
```

Do not use generic names such as `changes`, `updates`, or `fixes`.

---

## 14. Interrupted Session Recovery

Agent sessions are independent and may be interrupted.

A new session must recover from the repository state rather than relying on prior conversation context.

### Recovery procedure

1. Read `AGENTS.md`.
2. Read the roadmap and progress state.
3. Inspect Git status and diffs.
4. Identify an `in_progress` or `blocked` milestone.
5. Read its acceptance criteria.
6. Compare implementation evidence against the milestone contract.
7. Continue or repair the existing milestone.
8. Run necessary verification.
9. Complete its normal documentation, tracking, and Git handoff.

Do not assume that an `in_progress` milestone has no implementation.

Do not assume that a `completed` status is valid when required files or verification evidence are missing.

### Interrupted staging

If changes were already staged:

- Inspect the staged content.
- Determine whether it belongs to the interrupted milestone.
- Preserve unrelated staged changes.
- Reconcile the staged files with the implementation.
- Do not begin a new milestone until the handoff state is understood.

### Recovery priority

Recovery of unfinished work takes precedence over selecting new work.

---

## 15. Progress Integrity and Validation

Stage 00 must establish validation tooling for implementation tracking.

Validation should verify:

- Unique milestone IDs.
- Valid milestone status values.
- Valid dependency references.
- No dependency cycles.
- Consistent roadmap ordering.
- No completed milestone with incomplete prerequisites.
- No multiple active milestones.
- Consistent stage and project status.
- Valid references to milestone files.
- Requirement-to-milestone coverage.
- Correct next-milestone selection.

Run the available progress validation command before marking a milestone completed.

Do not manually bypass failed progress validation.

When progress records conflict with repository evidence, investigate and reconcile the inconsistency.

---

## 16. Milestone Reporting

Every milestone session must end with a concise, structured report.

### Required final report

**Milestone**

Provide ID, title, and final status.

**Implemented**

Summarize completed functionality and important implementation decisions.

**Verification**

List relevant checks and their actual outcomes.

Distinguish:

- Passed.
- Failed.
- Not run.
- Blocked.

**Documentation**

Identify important documentation and tracking updates.

**Git**

State whether relevant changes are staged and whether any unrelated working-tree issues remain.

**Suggested commit**

Provide one short, meaningful snake_case commit name.

**Next milestone**

Identify the next eligible milestone, or state that none remains.

### Example

```text
Milestone: M012 — User Registration
Status: completed

Implemented:
- Registration endpoint
- Zod request validation
- Argon2id password hashing
- PostgreSQL persistence
- Duplicate-email handling
- OpenAPI documentation

Verification:
- Lint: passed
- Typecheck: passed
- Unit tests: passed
- Integration tests: passed
- E2E tests: passed
- Build: passed

Documentation:
- Authentication documentation updated
- Progress tracking updated

Git:
- Milestone changes staged
- No commit created

Suggested commit:
user_registration

Next milestone:
M013 — JWT Login
```

This is an example format, not a record of completed project work.

### Blocked milestone report

If the milestone cannot be completed, explain:

- What was implemented.
- What remains.
- Why it is blocked.
- Which checks failed or could not run.
- What is required to resume.
- Current Git and progress state.

Never report blocked work as completed.

---

## 17. Finalization Stage

The final stage is dedicated to reviewing and validating the complete implementation.

It must not introduce new major product capabilities.

Its objectives include:

- Architecture consistency review.
- Cross-module refactoring.
- Authentication and security review.
- Tenant isolation review.
- Database schema and migration review.
- Complete automated test execution.
- API contract validation.
- Kubernetes and deployment verification.
- Documentation reconciliation.
- Requirements traceability verification.
- Final acceptance.

### Final-stage restrictions

Do not expand project scope to invent new features.

Fix defects discovered during final validation.

Document any unresolved issue and determine whether it blocks production readiness.

Do not claim successful deployment or infrastructure verification without actual evidence.

### Final project acceptance

The final acceptance milestone must verify:

1. All approved milestones are completed.
2. Every requirement is represented and verified.
3. All stage exit criteria pass.
4. Required quality checks pass.
5. No release-blocking defects remain.
6. Documentation describes the actual implementation.
7. Deployment and operational requirements are satisfied.
8. Progress state is consistent.

Only then mark the project:

`completed`

### Completion message

After successful final acceptance, provide a concise project completion report followed by a congratulations message.

The message should confirm that the planned implementation is finished and all required acceptance criteria have passed.

Example:

**Congratulations! `nestjs-backend-starter` has completed all planned implementation stages and passed its final acceptance criteria. The project is ready to serve as the backend foundation for future applications.**

Do not issue this message prematurely.

---

## 18. Behavior After Project Completion

When the project status is `completed` and the user requests:

`implement next milestone`

Do not invent or automatically create another milestone.

Respond that:

- The implementation roadmap is complete.
- All planned milestones have been completed.
- No next implementation milestone exists.
- Additional work requires a new approved scope or roadmap.

A completed project remains completed unless a new scope is explicitly authorized.

Post-completion maintenance requires an explicit task authorization and a short-lived maintenance branch. Follow [Git workflow](docs/operations/git-workflow.md) and [manual verification](docs/operations/manual-verification.md). Do not add an implementation milestone to record maintenance or change completed progress evidence. Humans control commits, pushes, PR review, merge, tags, and releases.

---

## 19. Agent Operating Principles

Always follow these principles:

1. **Repository over conversation.** Use version-controlled documentation as persistent project memory.
2. **One milestone at a time.** Do not implement multiple milestones in one session.
3. **Evidence over claims.** Verify completion rather than assuming it.
4. **Security by default.** Never bypass protections to accelerate implementation.
5. **Tenant isolation is mandatory.** Treat cross-organization access as a critical security concern.
6. **Complete functionality over scaffolding.** Deliver working outcomes.
7. **Quality before status.** Do not mark incomplete work as completed.
8. **Documentation is part of implementation.** Keep specifications synchronized with reality.
9. **Minimal scope.** Avoid unrelated changes and premature abstraction.
10. **Deterministic progress.** Select work from explicit tracked state.
11. **Recover before advancing.** Resume interrupted work instead of skipping it.
12. **Stage, report, stop.** Leave commit creation to the user.
13. **Finite completion.** Respect the approved end of the project.

---

## 20. Standard Session Contract

For every standard execution request:

`implement next milestone`

The agent must execute:

**READ → SELECT → INSPECT → IMPLEMENT → REFACTOR → TEST → DOCUMENT → TRACK → STAGE → REPORT → STOP**

No step may be silently omitted when applicable.

No subsequent milestone may begin automatically.

The repository must remain understandable and resumable by a completely fresh agent session.

**The ultimate goal is a complete, verified, production-ready backend starter—not an endless sequence of agent tasks.**
