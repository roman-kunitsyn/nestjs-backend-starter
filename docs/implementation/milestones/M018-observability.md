# M018 — Health and Observability

**Stage:** 08 — Security and Observability
**Status:** pending
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

- [ ] Liveness remains healthy during temporary DB outage; readiness fails with short timeout and fails before shutdown; startup reflects initialization.
- [ ] Request ID and trace context propagate; metrics include required families and avoid user/org/token/email labels.
- [ ] OTEL can be disabled and has no mandatory vendor dependency.
- [ ] Multiple instances do not rely on process-local state for correctness; logs redact secrets.

## Verification

Run health behavior, DB outage, graceful shutdown, metrics cardinality/redaction tests and multi-instance smoke where available; lint/typecheck/build.

## Completion checklist

- [ ] Operational observability documentation matches behavior and verification evidence is staged.
