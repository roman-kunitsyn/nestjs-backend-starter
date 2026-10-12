# M007 — Problem Details, Logging, and OpenAPI

**Stage:** 02 — HTTP and API Foundation
**Status:** pending
**Dependencies:** M006

## Objective

Provide consistent safe HTTP errors, request correlation, structured logging, and an accurate generated API contract.

## Scope

- RFC 9457 error filter, application error codes, validation mapping, production exception sanitization.
- Trusted request ID generation/propagation in `X-Request-ID`, logs, errors, and contract response schemas.
- Pino integration and sensitive-field redaction baseline.
- OpenAPI generation from actual routes/Zod schemas, JSON/YAML artifacts, docs endpoints and production access configuration.
- Reusable pagination/filter/sort schemas and opaque tenant/query-bound cursor utility contract.

## Out of scope

- Feature API implementation, idempotency mechanism (M016), full metrics/tracing (M018), or global security controls (M017).

## Architecture references

- [API conventions](../../architecture/api-conventions.md), [observability](../../architecture/observability.md), [security](../../architecture/security.md); source §§9–10, 14.

## Deliverables

- Problem Details handling, request context/logging, OpenAPI scripts/artifacts/check, shared API contract utilities.

## Acceptance criteria

- [ ] Errors use `application/problem+json`, stable status/code/request ID, field validation details where applicable, and no stack/raw SQL leakage in production.
- [ ] One request ID is propagated to response header, error body, structured logs, and relevant request context.
- [ ] Pino redacts credentials, authorization headers, tokens, passwords, and configured secrets.
- [ ] OpenAPI documents actual routes and supported input/output schemas, auth, success/error responses, tags, and stable operation IDs.
- [ ] Generated OpenAPI version and schema dialect are validated; no false 3.1 declaration; JSON/YAML generation and contract check scripts work.
- [ ] Unsupported sort/pagination input fails safely; cursors are opaque and bound to query/tenant context when used.

## Verification

Run error mapping tests, request ID/log redaction tests, generated contract validation/snapshot checks, and E2E validation/error cases; lint/typecheck/build.

## Completion checklist

- [ ] Contract and error behavior documented; quality checks and staged handoff pass.
