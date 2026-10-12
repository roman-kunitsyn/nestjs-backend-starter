# M010 — User Credentials and Account Lifecycle

**Stage:** 04 — Identity and Sessions
**Status:** blocked
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

## Implementation notes

- Added Argon2id password hashing, strict account request schemas, account registration, single-use verification and reset token flows, verification resend, account recovery, credential verification, and confirmation-based password change logic in the application service.
- Added a runtime-injected email port with development console and deterministic in-memory adapters. Production startup currently fails until M015 supplies a production sender.
- The HTTP routes currently cover registration, verification, resend, recovery, and reset. Authenticated `/auth/me`, `/users/me`, and password-change HTTP routes still depend on M011's JWT/session authentication and must be completed before this milestone can pass acceptance.
- Delivery occurs after commit and is not durable before M015. The account-flow E2E and PostgreSQL integration paths have not yet verified the complete lifecycle.
- The existing Testcontainers integration suite could not start because this environment has no working container runtime. The current account contract needs dedicated PostgreSQL integration coverage before completion.
- **Blocker:** The contract requires authenticated `/auth/me`, `/users/me`, and password-change HTTP routes. Their JWT guard depends on M011's login/session work, but M011 depends on M010. This sequencing conflict must be resolved without skipping either milestone. PostgreSQL lifecycle integration verification also needs a working container runtime.
