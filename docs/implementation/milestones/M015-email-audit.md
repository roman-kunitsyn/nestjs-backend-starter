# M015 — Email Delivery and Audit Outbox

**Stage:** 06 — Email and Audit
**Status:** pending
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

- [ ] Console adapter is development-only for token links; SMTP authenticates, validates TLS and times out; test adapter captures messages deterministically.
- [ ] Required five templates include text/HTML and escape user input.
- [ ] Business state and outbox item commit together; delivery occurs after commit, retry policy is bounded, permanent failures visible.
- [ ] Lease/claim prevents concurrent dispatch of the same item while tolerating at-least-once provider delivery.
- [ ] Verification, reset, and invitation flows use the outbox; SMTP outages do not roll back security-sensitive primary state.
- [ ] Audit events capture sensitive/admin actions and exclude credentials; required records are transactionally consistent.

## Verification

Run template escaping tests, fake SMTP behavior, PostgreSQL atomicity/retry/claim concurrency tests, audit transaction tests, lint/typecheck/build.

## Completion checklist

- [ ] Email and audit operations documented; failure behavior reviewed; staged diff checked.
