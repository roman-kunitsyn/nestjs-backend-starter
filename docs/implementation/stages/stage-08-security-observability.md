# Stage 08 — Security and Observability

**Objective:** Complete HTTP/application security controls, safe proxy behavior, health and shutdown behavior, metrics, and optional tracing.

**Prerequisites:** Stage 07. **Milestones:** M017–M018. **Outcome:** Controls and signals are usable in multiple stateless replicas.

## Exit criteria

- Helmet, explicit CORS, CSRF/origin checks, configurable rate limits, trusted proxy handling, and sensitive-action freshness are verified.
- Health/readiness/startup semantics and graceful shutdown are tested; metrics avoid sensitive/high-cardinality labels.
- Optional OpenTelemetry covers HTTP, PostgreSQL, and email where supported.
