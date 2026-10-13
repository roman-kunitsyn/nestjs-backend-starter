# M015 — Email Delivery and Audit Outbox

**Stage:** 06 — Email and Audit
**Status:** completed
**Dependencies:** M014

## Objective

Complete provider-based mail delivery with a transactional outbox and security/audit event persistence.

## Scope

- EmailSender token, console/SMTP/test adapters, TLS/timeouts, safe HTML/text templates.
- Transactional `email_outbox`, atomic producer integration for verification/recovery/invitations, leased claims, bounded exponential retries, permanent failure review, at-least-once safety, optional documented CronJob mode.
- Security/admin audit event service and transaction coupling where required.

## Out of scope

- General-purpose queue/job infrastructure, Redis/Kafka, unrelated notification channels.

## Architecture references

- [Email](../../architecture/email.md), [database](../../architecture/database.md), [observability](../../architecture/observability.md); source §§5.4, 12, 14.

## Deliverables

- Adapters/templates/outbox dispatcher/claim operations/audit service, operational docs and tests.

## Acceptance criteria

- [x] Console adapter is development-only for token links; SMTP authenticates, validates TLS and times out; test adapter captures messages deterministically.
- [x] Required five templates include text/HTML and escape user input.
- [x] Business state and outbox item commit together; delivery occurs after commit, retry policy is bounded, permanent failures visible.
- [x] Lease/claim prevents concurrent dispatch of the same item while tolerating at-least-once provider delivery.
- [x] Verification, reset, and invitation flows use the outbox; SMTP outages do not roll back security-sensitive primary state.
- [x] Audit events capture sensitive/admin actions and exclude credentials; required records are transactionally consistent.

## Verification

Verified: template escaping and authenticated SMTP/TLS unit tests (26 unit tests total); PostgreSQL integration suite (10 tests) for account/outbox atomicity, provider failure persistence, bounded retries including expired final leases, exclusive claims, session-revocation notice/audit, and safe audit metadata; Fastify E2E suite (18 tests); lint, Prettier check, strict typecheck, build, Drizzle migration check, and OpenAPI artifact check passed.

## Completion checklist

- [x] Email and audit operations documented; failure behavior reviewed; staged diff checked.

## Implementation notes

- SMTP uses Nodemailer with authenticated SMTP, required STARTTLS or implicit TLS, certificate validation, optional private CA trust, and bounded connection/greeting/socket timeouts.
- The API process polls every five seconds, claims at most 25 rows with `SKIP LOCKED`, delivers at most five concurrently under a 15-minute lease, retries with capped exponential delay, and marks an item failed after eight attempts.
- Account registration, verification resend, password recovery, invitations, and explicit session revocation insert outbox rows in their business transaction. Password updates atomically write their notice and audit event. Organization administration and membership flows write audit events in their mutation transactions.
- Delivery has at-least-once semantics. Provider error text is excluded from logs and persistence; safe error classes remain visible for operations.
