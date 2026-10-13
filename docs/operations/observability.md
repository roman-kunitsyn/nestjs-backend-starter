# Health and observability

## Health probes

- `GET /health/live` checks that the process can serve requests. It does not depend on PostgreSQL.
- `GET /health/ready` requires completed application initialization and a successful PostgreSQL `SELECT 1`. The check has a 1.5 second response timeout and becomes unhealthy during shutdown.
- `GET /health/startup` reports healthy after Nest completes application bootstrap.

These endpoints return only `{ "status": "ok" }` when healthy and a sanitized Problem Details response when unhealthy. Keep health and metrics paths restricted to the intended internal network exposure at ingress.

## Metrics

`GET /health/metrics` returns Prometheus text format. HTTP metrics use a bounded method, Fastify route template, and status class. Database active/idle session counts are scoped by `APP_NAME` and the pod hostname (or local process ID); the configured `DB_POOL_MAX` is reported per instance. Authentication failure, refresh reuse, and email delivery failure counters are process local and reset on restart. Do not use the process counters for billing or durable audit.

The metrics query reads `pg_stat_activity`; PostgreSQL permissions may limit visible sessions. Metrics still return during database outage, with connection gauges reported as zero in that case.

## Tracing

Tracing is off by default. Set `OTEL_ENABLED=true` and configure `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, for example `http://otel-collector:4318/v1/traces`, to export traces over OTLP/HTTP. W3C trace context propagates through supported HTTP instrumentation. Request spans include the request ID. Email sends produce a span labeled only by the email template. postgres.js query spans are not available in the current instrumentation set. The SDK flushes during application shutdown.

Request IDs remain available as `X-Request-ID` independently of tracing. Keep request IDs and trace IDs out of metric labels.
