# M011 — JWT Sessions and Refresh Rotation

**Stage:** 04 — Identity and Sessions
**Status:** completed
**Dependencies:** M010

## Objective

Complete JWT access validation and server-backed device sessions with atomic opaque refresh rotation, replay detection, and revocation.

## Scope

- Asymmetric JWT signing/validation, issuer/audience/subject/session/token claims, pinned algorithm and `kid` rotation.
- Login password verification and creation of authenticated server-side sessions/access credentials.
- Authenticated `/auth/me`, `/users/me`, and password-change HTTP routes using the session-bound JWT guard; `/auth/me` identity and `/users/me` profile remain distinct.
- Secure refresh cookie, refresh idle/maximum lifetime, atomic session rotation/history, bounded concurrency handling and replay response.
- Logout, logout-all, session enumeration/revocation, revoked session enforcement and cookie clearing.
- Persist the refresh-token replay security event using the prepared audit schema; M015 centralizes the reusable audit service.
- Organization identity remains resolved per request; no trust in client org claims.

## Out of scope

- Organization permissions/membership (M012–M014), CSRF/rate-limit hardening beyond required cookie baseline (M017).

## Architecture references

- [Authentication](../../architecture/authentication.md), [database](../../architecture/database.md), [security](../../architecture/security.md); source §§5.4, 6.

## Deliverables

- Session use cases, persistence transitions, guards/strategies, cookie behavior, concurrency and replay tests.

## Acceptance criteria

- [x] JWT uses EdDSA and validates pinned algorithm, signature, issuer, audience, expiry, UUID claim types, user status and session revocation.
- [x] Login verifies credentials safely, uses uniform invalid-credential responses, and issues a session-bound short-lived JWT.
- [x] Authenticated `/auth/me`, `/users/me`, and password-change routes require a valid session-bound JWT; password changes and logout-all require current-password confirmation.
- [x] Refresh tokens are opaque, high-entropy and stored only as digest; rotation is atomic and tokens are cookie-only.
- [x] Concurrent refresh retries are idempotent for two seconds; late consumed-token replay revokes the session and writes its audit event atomically.
- [x] Current logout, logout-all, session listing/revocation, idle/absolute expiry, password-driven revocation and cookie clearing are implemented.
- [x] Cookie defaults and active/retiring `kid` rotation configuration are documented and tested.

## Verification

Run JWT tests, PostgreSQL concurrent refresh/replay tests, Fastify E2E for token expiry/revocation/logout/cookies, lint/typecheck/build.

## Completion checklist

- [x] Auth docs reflect implementation; replay/security evidence and staged diff reviewed.

## Implementation notes

- Added EdDSA JWT signing with `jose`, configured issuer/audience/kid, production PEM validation, retiring public-key map support, and a guard that checks both account state and the backing session on each request.
- Added login, refresh, identity/profile, password change, logout, logout-all, and session list/revoke endpoints. Refresh credentials are set in an HttpOnly, SameSite=Lax cookie, scoped to `/api/v1/auth`, with Secure enabled in production.
- Refresh rotation locks the current session row and uses a keyed deterministic next token to support idempotent retries for two seconds. The production refresh key is shared across replicas; reuse outside the retry window revokes the session and records an audit event in the same transaction.
- Password reset and password change revoke all sessions atomically with the credential update. Logout-all requires current-password confirmation.
- No database migration was required; M009 had already provisioned session, history, and audit tables.

## Verification record

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test`: passed (22 tests across 8 suites).
- `pnpm test:e2e`: passed (16 tests across 2 suites), including login, HttpOnly cookie, refresh, authenticated identity, and logout revocation.
- `pnpm test:integration`: passed (8 tests across 2 suites), including concurrent idempotent refresh, late replay revocation/audit, and reset/change session revocation against PostgreSQL 18.
- `pnpm build`, `pnpm openapi:generate`, and `pnpm openapi:check`: passed.
- Progress validation and staged diff checks: passed.
