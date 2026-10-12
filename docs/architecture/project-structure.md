# Project structure

**Source:** Original specification §§3, 4.3, 16.4, 21.1–21.2.

## Boundaries

- `src/modules`: functional application modules.
- `src/infrastructure`: database, cryptography, email, logging, telemetry, time, and platform adapters.
- `src/common`: reusable technical constructs without feature ownership.
- `src/contracts`: shared HTTP contracts, never internal database models.
- `drizzle/migrations`: committed immutable migrations once deployed.
- `deploy/helm`: deployable Kubernetes chart and environment values.
- `test`: unit, integration, E2E, fixtures, factories, and helpers.

The source's illustrative tree includes bootstrap configuration (`fastify`, OpenAPI, security, validation), typed configuration, common decorators/guards/filters/interceptors/errors/pagination/validation, infrastructure database schemas and seeds, crypto/email/logging/telemetry/time, feature modules for auth/users/sessions/organizations/memberships/invitations/authorization/audit/health/example resources, shared problem and pagination contracts, Drizzle migrations, test categories, Helm templates, seed/admin/OpenAPI scripts, GitHub workflows, and standard runtime/configuration files. This is a guide to boundaries, not a requirement to create every directory before needed.

Do not introduce catch-all `shared.service.ts`, `base.repository.ts`, or `utils.ts` dumping grounds. Keep controllers thin, application services responsible for orchestration, and public module boundaries explicitly typed. Avoid unjustified `any`, unsafe casts, circular dependencies, and generic abstractions. Use `unknown` until untrusted values are validated. Prefer readable code and explicit transaction boundaries.

## Typical feature module

A nontrivial module may contain request/response Zod schemas under `dto/`, centralized policy functions under `policies/`, a controller, application service, tenant-aware repository, and module registration. Implement in this order: schema/indexes, request and response contracts, tenant-scoped persistence, application use cases, authorization policies, REST routes and OpenAPI, unit/integration/E2E tests, and documentation. Keep simple modules flat.

## Repository documentation

The README must explain purpose, architecture, stack, prerequisites, installation, environment, commands, database workflow, tests, authentication, tenancy, API docs, Kubernetes workflow, security, and troubleshooting. Document each nontrivial design choice in its relevant document. The authoritative project documentation map is in [`docs/README.md`](../README.md).
