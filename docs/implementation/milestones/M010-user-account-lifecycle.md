# M010 — User Credentials and Account Lifecycle

**Stage:** 04 — Identity and Sessions
**Status:** pending
**Dependencies:** M009

## Objective

Deliver email/password account flows and profile management using secure password handling and server-validated API contracts.

## Scope

- Registration, email verification/resend, forgot/reset password, password change/confirmation, current identity and profile endpoints.
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

- [ ] Registration normalizes email consistently, hashes password with Argon2id, and never returns credential fields.
- [ ] Verification and reset tokens are cryptographically random, stored hashed, single-use, expiring, atomically consumed, and frequency-limited.
- [ ] Account flows depend on the application-owned email port; the console adapter is development-only and the in-memory adapter supports deterministic tests.
- [ ] Recovery responses do not disclose account existence; disabled/suspended users cannot complete account operations.
- [ ] Password policy supports long passphrases, verifies safely, permits rehash upgrades, and invalidates applicable sessions after changes once M011 exists.
- [ ] `/auth/me` and `/users/me` contracts remain distinct; sensitive changes require password confirmation, with recent-auth freshness controls applied in M017 where required.
- [ ] E2E covers registration/profile, invalid/expired token, duplicate email, enumeration resistance, and disabled account.

## Verification

Run Argon2/token/schema unit tests, PostgreSQL tests, auth E2E and OpenAPI checks, lint/typecheck/build.

## Completion checklist

- [ ] Document actual auth behavior and email adapter limitation; all scoped checks and staging review pass.
