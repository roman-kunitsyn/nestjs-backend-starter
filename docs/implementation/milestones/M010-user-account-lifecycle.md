# M010 — User Credentials and Account Lifecycle

**Stage:** 04 — Identity and Sessions
**Status:** completed
**Dependencies:** M009

## Objective

Deliver email/password account flows and profile management using secure password handling and server-validated API contracts.

## Scope

- Registration, email verification/resend, forgot/reset password, and credential verification/profile application-service operations.
- Argon2id configuration, normalized email policy, single-use hashed tokens, enumeration-resistant public responses, suspended/disabled user handling.
- Define/use the injected `EmailSender` boundary with development console and in-memory test adapters; M015 adds SMTP and transactional outbox reliability.
- Email messages must be emitted after the primary credential transaction commits; durable delivery/retry is added in M015.

## Out of scope

- Refresh rotation/session listing/revocation (M011), organization features, social login/SSO.

## Architecture references

- [Authentication](../../architecture/authentication.md), [API conventions](../../architecture/api-conventions.md), [security](../../architecture/security.md); source §§5.4, 6, 9, 13.5.

## Deliverables

- Auth/user modules, schemas, policies, endpoints, tests, and auth operations documentation.

## Acceptance criteria

- [x] Registration normalizes email consistently, hashes password with Argon2id, and never returns credential fields.
- [x] Verification and reset tokens are cryptographically random, stored hashed, single-use, expiring, atomically consumed, and frequency-limited.
- [x] Account flows depend on the application-owned email port; the console adapter is development-only and the in-memory adapter supports deterministic tests.
- [x] Recovery responses do not disclose account existence; disabled/suspended users cannot complete account operations.
- [x] Password policy supports long passphrases, verifies safely, permits rehash upgrades, and invalidates applicable sessions after changes once M011 exists.
- [x] Account/profile projections and password confirmation are implemented in the application service without exposing credential fields. Authenticated `/auth/me`, `/users/me`, and password-change HTTP routes are owned by M011, after its JWT guard exists.
- [x] HTTP and PostgreSQL tests cover registration, invalid/expired token, duplicate email, enumeration resistance, single use, and disabled accounts.

## Verification

Run Argon2/token/schema unit tests, PostgreSQL tests, auth E2E and OpenAPI checks, lint/typecheck/build.

## Completion checklist

- [x] Document actual auth behavior and email adapter limitation; all scoped checks and staging review pass.

## Implementation notes

- Added Argon2id password hashing, strict account request schemas, account registration, single-use verification and reset token flows, verification resend, account recovery, credential verification, and confirmation-based password change logic in the application service.
- Corrected unique-violation detection for Drizzle-wrapped PostgreSQL errors so duplicate registration returns the documented 409 conflict instead of a generic 500.
- Serialized verification and reset token issuance on the account row to enforce per-user hourly limits under concurrent requests; password change reports failure if a concurrent credential update wins.
- Added a runtime-injected email port with development console and deterministic in-memory adapters. Production startup currently fails until M015 supplies a production sender.
- The HTTP routes cover registration, verification, resend, recovery, and reset. Per the approved milestone-boundary resolution, authenticated `/auth/me`, `/users/me`, and password-change HTTP routes move to M011, where the JWT/session guard is implemented.
- Delivery occurs after commit and is not durable before M015. PostgreSQL integration tests verify normalized registration, credential projection, verification/reset single use, expired token rejection, password changes with confirmation, account status behavior, uniform recovery results, and concurrent issuance limits. Fastify E2E covers registration, duplicate handling, enumeration-resistant recovery, malformed inputs, and invalid verification tokens.
- **Resolution:** The authenticated route acceptance criteria are assigned to M011, preserving the M010 -> M011 dependency and avoiding an unauthenticated substitute.
- Verification passed: format, lint, strict typecheck, unit tests (18), Fastify E2E (15), PostgreSQL integration (7), build, OpenAPI freshness, progress validation, and staged diff checks.
