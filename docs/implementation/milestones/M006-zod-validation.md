# M006 — Zod Request Validation and API Versioning

**Stage:** 02 — HTTP and API Foundation
**Status:** pending
**Dependencies:** M005

## Objective

Establish reusable, type-safe validation of all public HTTP input and the `/api/v1` route convention.

## Scope

- Zod boundary integration for body, path, and query values; strict public write objects, UUID/enums, bounds, normalization, and body-size limits.
- Shared schema/type patterns for separate input and response DTOs; configure API prefix/versioning and public health route namespace conventions.
- Add representative valid/invalid controller tests.

## Out of scope

- Business endpoints, database persistence, OpenAPI artifact generation (M007), or new validation framework.

## Architecture references

- [API conventions](../../architecture/api-conventions.md), [technology stack](../../architecture/technology-stack.md); source §§9–10.

## Deliverables

- Reusable Zod request parsing/pipe and testable API prefix/versioning configuration.

## Acceptance criteria

- [ ] Body, path, and query input is parsed before controller/service use; untrusted values do not rely on TypeScript types alone.
- [ ] Unknown public write fields, malformed UUIDs, invalid enums, excessive lengths/body sizes, and invalid query values fail consistently.
- [ ] DTO response schemas do not expose internal persistence models.
- [ ] Business API route convention is `/api/v1`; health routes remain outside it.
- [ ] No class-validator is introduced.

## Verification

Run schema unit tests and Fastify E2E cases for valid input, malformed path/query/body, unknown properties, and size limits; lint/typecheck/build.

## Completion checklist

- [ ] Acceptance and quality checks pass; API conventions are documented; progress/diff handoff is complete.
