# API conventions

**Source:** Original specification §§9–10.

## REST and responses

Business and auth routes use `/api/v1`; health endpoints remain outside. Use plural resource nouns. GET retrieves, POST creates or performs a non-idempotent action, PUT replaces, PATCH partially updates, DELETE removes/revokes. Return `201 Created` and `Location` where appropriate, `204 No Content` when deletion has no body. Return direct resource representations by default, without mandatory `{success,data}` wrappers. Keep `/auth/me` for identity/auth context and `/users/me` for profile; do not expose arbitrary users without explicit authorization.

The source endpoint inventory includes registration/login/refresh/logout/logout-all/me/sessions/revocation/email verification/resend/password recovery/change; user profile read/update; organization create/list/detail/update; members list/update/remove; invitation create/list/revoke/accept; ownership transfer and leave. Organization request/response DTOs, permissions, side effects, and status codes must be specified concretely during implementation.

Organization lifecycle contracts are defined in [Multi-tenancy](multi-tenancy.md): create/list/detail/update plus explicit suspend/archive/activate actions. Create returns `201` with the organization and initial OWNER membership; reads, updates, and lifecycle actions return `200`. Cross-organization IDs are concealed with `404`.

M014 adds `/organizations/{organizationId}/members` list, role update and removal; `/organizations/{organizationId}/leave`; `/organizations/{organizationId}/ownership-transfer`; invitation create/list/revoke under `/organizations/{organizationId}/invitations`; and authenticated `POST /invitations/accept`. Membership and invitation administration uses `members:read`, `members:invite`, `members:remove`, and `members:roles:update`. Only owners may grant ADMIN, and OWNER can only change through ownership transfer. Invitations last seven days, store SHA-256 digests of random opaque tokens, and require a signed-in account with a verified matching normalized email. Create returns only invitation metadata; the token is delivered through the configured email adapter.

## Pagination, filtering, and idempotency

Use cursor pagination for large tenant datasets. Query parameters: `limit`, `cursor`, `sort`, `order`. Default limit 20, maximum 100. Return `{items, pageInfo:{hasNextPage,nextCursor}}`. Cursors are opaque, validated, bound to query context and tenant; stable order includes a unique tie-breaker such as `(created_at,id)`. Offset may be separate for simple admin tables.

Allowlist sortable/searchable fields per endpoint; reject unsupported fields and invalid pagination. Never interpolate untrusted identifiers into SQL; use Drizzle query construction and bound values.

For selected critical operations, support `Idempotency-Key`, scoped by organization and actor, request fingerprint, duplicate detection, atomic result recording, configurable retention, and rejection of same key with different payload. Do not require it on every POST.

## Errors

Use RFC 9457 Problem Details with content type `application/problem+json`, stable `type`, `title`, `status`, `code`, `requestId`, optional safe detail, and validation issue paths/codes/messages. Minimum codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `SESSION_REVOKED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `RESOURCE_CONFLICT`, `ORGANIZATION_ACCESS_DENIED`, `MEMBERSHIP_REQUIRED`, `INVITATION_EXPIRED`, `INVITATION_INVALID`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`. Sanitize unexpected exceptions; never return stack traces or raw SQL errors in production. Authorization status behavior is in [Authorization](authorization.md).

The shared HTTP filter emits this shape for Nest exceptions, while the Fastify adapter emits the same safe shape for parser and body-limit failures that happen before controller execution. Every response carries `X-Request-ID`; syntactically valid incoming IDs (1–128 ASCII letters, digits, `.`, `_`, `:`, or `-`) are propagated, and other values are replaced with a generated `req_<UUID>` ID. Validation issues retain only path, Zod code, and safe message.

## Zod and OpenAPI contracts

Zod is the source of truth for input and output schemas, connected to Nest controllers and OpenAPI via the selected integration. `ZodValidationPipe` parses body, path, and query values and returns the schema output, including normalization, defaults, and coercion. Define strict public write schemas, bound strings, validate UUIDs/enums, and normalize where appropriate. Fastify rejects request bodies larger than 1 MiB. Keep separate create/update/response schemas; response types must be derived from public response schemas rather than persistence records. Never expose DB records directly; TypeScript types alone do not validate external data. Validation failures use a stable `VALIDATION_ERROR` code and safe issue paths/codes/messages; M007 will map these into the complete Problem Details response. Do not add class-validator.

`configureApiRouting` applies `/api/v1` to business routes and reserves `/health`, `/health/live`, and `/health/ready` outside the prefix. Health controllers are introduced with observability work; the exclusions are established here.

Generate OpenAPI from real routes and shared schemas. Document every public endpoint, auth requirements, JSON body, success/error responses, pagination, bearer auth and cookie refresh, stable operation IDs, feature tags. OpenAPI 3.1 is the target. Validate the generated document's declared version and schema behavior, including nullability, before labeling it 3.1. If the selected generator cannot emit a valid 3.1 document, accurately label the supported output and record the limitation; do not claim conformance. Produce `artifacts/openapi.json` and `.yaml`, serve `/docs` and `/openapi.json`, disable or gate interactive docs in production by configuration while retaining CI artifact. Enable typed frontend client generation (openapi-typescript or Orval) without duplicate handwritten DTOs, and check generation/breaking changes in CI.

## Frontend integration

Document cookie topology, bearer access token behavior, CORS and CSRF controls. The generated contract is the frontend's API type source; avoid manual DTO duplication.
