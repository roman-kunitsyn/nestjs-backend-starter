# M005 — Project Bootstrap and Local Workflow

**Stage:** 01 — Project Bootstrap
**Status:** completed
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

- [x] `pnpm install --frozen-lockfile`, lint, typecheck, tests, and build pass on supported Node 24.
- [x] App listens through Fastify; no Express adapter or Express-only middleware remains.
- [x] Jest is the test runner; a Fastify-compatible smoke E2E test runs.
- [x] Compiler uses strict baseline with one consistent module system and no unsafe config weakening.
- [x] Environment validation fails safely; `.env.example` contains dummy development values only.
- [x] Local PostgreSQL Compose and documented start/test workflow work; scripts are functional, not placeholders. Migration commands are intentionally added in the database milestones.

## Verification

Run frozen install, lint/format check, typecheck, unit/E2E smoke tests, build, startup/config checks, and Compose validation where available. Record unavailable Docker infrastructure explicitly.

## Completion checklist

- [x] Acceptance and quality checks pass; setup docs match execution; progress is updated; relevant diff staged and inspected.

## Implementation notes

- Replaced Express/Vitest with the Fastify adapter and Jest ESM configuration. Kept the existing ESM/NodeNext module system and enabled strict compiler checks including unchecked indexed access and exact optional properties.
- Added Zod-validated startup settings, a local PostgreSQL 18.6 Compose service with a healthcheck and persistent named volume, and scripts for lint, formatting, typecheck, tests, build, and local infrastructure.
- Updated README and operations setup instructions to show only commands and routes that exist today. The original generated `GET /` sample remains as the smoke route.
- pnpm 12.11.2 is pinned with Corepack metadata. The lockfile resolves exact package versions. Optional native accelerators `@parcel/watcher` and `unrs-resolver` are denied build-script execution; they are not required for build/test/start workflows.
- Scope clarification: M005 verifies local database startup and application/test workflows. Migration and seed commands belong to M008/M009, where the approved scope adds Drizzle infrastructure and database schema. Adding placeholder migration commands here would conflict with M005's out-of-scope boundary and its no-placeholder acceptance rule.

## Verification record

- `pnpm install --frozen-lockfile`: passed.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`: passed.
- `pnpm start:dev` and `pnpm start:prod`: both started; `GET /` returned `Hello World!`.
- Invalid `NODE_ENV` startup failed with field-only validation details.
- `docker compose config --quiet`: passed. `pnpm infra:up` started PostgreSQL and waited until its healthcheck passed; `pnpm infra:down` stopped the container and retained the local data volume.
- Progress validation passed and selected M006.
