# Logging and observability

**Source:** Original specification §14 plus audit/request correlation requirements elsewhere.

## Structured logs and correlation

Use Pino through Nest integration. Support timestamp, level, service, environment, request ID, trace ID, user ID, organization ID, operation, duration, and message; omit unavailable context. Do not indiscriminately log personal data, credentials, request bodies, passwords, tokens, authorization headers, or secrets.

Assign or propagate a trusted request ID and expose `X-Request-ID`. Include it in request/error logs, Problem Details, relevant audit events, and traces when enabled.

The Fastify Pino logger assigns the ID and logs request completion. Nest uses `nestjs-pino` for application and exception logs. Redact authorization/cookie/API-key headers, password and token fields, and cookie response headers. Never log request bodies as a general logging feature. Interactive Swagger UI is disabled by default in production with `API_DOCS_ENABLED`; generated JSON/YAML remain available for contract tooling.

## Metrics and traces

Expose/export `http_requests_total`, `http_request_duration_seconds`, `http_inflight_requests`, database active/idle pool connections, `authentication_failures_total`, `refresh_token_reuse_total`, and `email_delivery_failures_total`. Avoid unbounded cardinality; never use raw user/org IDs, tokens, or emails as Prometheus labels.

Support optional OpenTelemetry through configuration; instrument incoming HTTP, PostgreSQL, and outbound email where available. Avoid mandatory vendor-specific instrumentation.

## Health and shutdown

Provide public-within-intended-exposure `/health/live`, `/health/ready`, `/health/startup`. Liveness reports process viability and must not fail solely because PostgreSQL is temporarily unavailable. Readiness checks DB with a short timeout and turns false before shutdown drains traffic. Startup indicates initialization completion. Configure Kubernetes probes accordingly; avoid exposing sensitive diagnostics.

## Audit

Audit records cover sensitive and administrative actions; they carry request correlation and safe actor/resource metadata, never credentials. Persist atomically with critical state transitions where required. See [Database](database.md).
