# M018 — Health and Observability

**Stage:** 08 — Security and Observability
**Status:** completed
**Dependencies:** M017

## Objective

Provide production-usable health behavior, safe metrics, optional tracing, and graceful shutdown across stateless replicas.

## Scope

- `/health/live`, `/health/ready`, `/health/startup`; database readiness timeout and shutdown transition.
- Metrics for HTTP, DB pool, auth failures/reuse, email delivery failures with bounded labels.
- Configurable OpenTelemetry instrumentation for HTTP, PostgreSQL, email where supported.

## Out of scope

- Vendor-specific telemetry backend, sensitive admin diagnostics, unrelated monitoring platform setup.

## Architecture references

- [Observability](../../architecture/observability.md), [deployment](../../architecture/deployment.md); source §14.

## Deliverables

- Health module, metrics/tracing integration and dashboards/operational descriptions as appropriate.

## Acceptance criteria

- [x] Liveness remains healthy during temporary DB outage; readiness fails with short timeout and fails before shutdown; startup reflects initialization.
- [x] Request ID and trace context propagate; metrics include required families and avoid user/org/token/email labels.
- [x] OTEL can be disabled and has no mandatory vendor dependency.
- [x] Multiple instances do not rely on process-local state for correctness; logs redact secrets.

## Verification

Health behavior, database failure, shutdown readiness, metric cardinality, redaction and probe routes are covered by unit/E2E checks. Optional OTEL startup/shutdown was smoke checked with an OTLP endpoint configured. A Kubernetes multi-instance smoke is not available before M020; correctness state remains database-backed, and deployment validation is assigned to M020. Lint, typecheck, formatting, build, OpenAPI, Drizzle, integration, E2E, unit and progress checks passed.

## Completion checklist

- [x] Operational observability documentation matches behavior and verification evidence is staged.
