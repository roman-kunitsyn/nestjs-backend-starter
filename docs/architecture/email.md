# Email delivery

**Source:** Original specification §12 and associated token/invitation requirements in §§5–6, 8.

## Provider boundary

All application email goes through an application-owned `EmailSender` interface, injected by runtime token such as `EMAIL_SENDER` (interfaces do not exist at runtime). Input contains recipient, subject, text, optional HTML; result indicates accepted and optional message ID. Authentication services must not depend on a provider vendor.

Required adapters: development console (redact or restrict token-bearing links to development-only output), production-capable authenticated SMTP with TLS validation/timeouts/error handling, and in-memory deterministic test adapter. Future managed providers must be swappable without auth-service changes.

The production SMTP adapter authenticates with configured credentials, validates server certificates, requires STARTTLS unless implicit TLS is selected, and applies connection, greeting, and socket timeouts. See [email operations](../operations/email.md) for configuration and failure handling.

## Templates

Implement text and HTML versions for `verify-email`, `reset-password`, `organization-invitation`, `password-changed`, and `security-session-revoked`. Use consistent layout; safely HTML-escape user input.

## Minimal transactional outbox

Do not add BullMQ, Redis, or general-purpose queues. Use PostgreSQL `email_outbox` with ID, template, recipient, JSON payload, status, attempt count, next-attempt time, created/sent timestamps, and last error. Insert business change and message in one transaction; commit; deliver after commit. Retry transient failures with bounded exponential backoff, record permanent failures for operations, claim with lease semantics across multiple dispatchers, and tolerate at-least-once delivery. Optionally deploy a one-shot Kubernetes CronJob at a documented interval. If an endpoint requires synchronous delivery, define its behavior and failure semantics explicitly.

This is intentionally narrow reliability infrastructure for verification, password recovery, and invitations, not generic job execution. Never expose token secrets in logs or console output beyond guarded local development.

The API process polls batches of 25 every five seconds and delivers with a maximum of five concurrent provider calls. Claims use `FOR UPDATE SKIP LOCKED` and a 15-minute lease, exceeding the configured two-minute maximum SMTP timeout while avoiding serial batch delays. Delivery is at least once. Retries use exponential backoff from one minute to six hours and mark an item permanently failed after eight claims, including when its final lease expires after a worker crash. The provider exception text and message contents are never persisted as error details. Business state and email rows share a transaction; delivery runs after commit.

Password-change/reset and explicit session-revocation notifications use the same outbox. Audit events for password, session, and organization administration actions are committed with the state mutation when required. The application does not require a separate queue or CronJob.
