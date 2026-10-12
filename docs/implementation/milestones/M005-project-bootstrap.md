# M005 — Project Bootstrap and Local Workflow

**Stage:** 01 — Project Bootstrap
**Status:** pending
**Dependencies:** M004

## Objective

Align the generated repository with the approved, reproducible Node 24, NestJS, Fastify, strict TypeScript, pnpm, Jest, and local-development baseline.

## Scope

- Replace Express adapter and incompatible starter test runner with Fastify and Jest; preserve useful starter behavior.
- Apply strict compiler baseline from architecture and compatible ESM/build configuration.
- Pin dependencies through pnpm lockfile; implement lint, format, typecheck, build, and test scripts.
- Add Zod startup configuration foundation, safe `.env.example`, Docker Compose PostgreSQL baseline, and bootstrap README/operations instructions.

## Out of scope

- Feature endpoints, database schema beyond minimal startup infrastructure, authentication, or authorization.
- Docker production image, Helm, or CI/CD.

## Architecture references

- [Technology stack](../../architecture/technology-stack.md), [project structure](../../architecture/project-structure.md), [deployment](../../architecture/deployment.md).
- [ADR-001](../../decisions/ADR-001-postgres-js-driver.md); source §§1–4, 11, 16.

## Deliverables

- Reproducible Fastify application bootstrap, approved scripts/tooling, local database workflow, and accurate setup docs.

## Acceptance criteria

- [ ] `pnpm install --frozen-lockfile`, lint, typecheck, tests, and build pass on supported Node 24.
- [ ] App listens through Fastify; no Express adapter or Express-only middleware remains.
- [ ] Jest is the test runner; a Fastify-compatible smoke E2E test runs.
- [ ] Compiler uses strict baseline with one consistent module system and no unsafe config weakening.
- [ ] Environment validation fails safely; `.env.example` contains dummy development values only.
- [ ] Local PostgreSQL Compose and documented start/migrate/test workflow work; scripts are functional, not placeholders.

## Verification

Run frozen install, lint/format check, typecheck, unit/E2E smoke tests, build, startup/config checks, and Compose validation where available. Record unavailable Docker infrastructure explicitly.

## Completion checklist

- [ ] Acceptance and quality checks pass; setup docs match execution; progress is updated; relevant diff staged and inspected.
