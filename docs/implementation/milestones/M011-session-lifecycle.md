# M011 — JWT Sessions and Refresh Rotation

**Stage:** 04 — Identity and Sessions
**Status:** pending
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

- [ ] JWT uses supported asymmetric signing and validates pinned algorithm, signature, issuer, audience, expiry, claim types, user status and configured session revocation policy.
- [ ] Login verifies credentials safely, rejects disabled/suspended accounts without account enumeration, and issues a session-bound short-lived JWT.
- [ ] Authenticated `/auth/me`, `/users/me`, and password-change routes require a valid session-bound JWT; sensitive password changes require current-password confirmation.
- [ ] Refresh tokens are opaque and high-entropy, stored only as digest, rotated in an atomic transaction, and never placed in localStorage.
- [ ] Concurrent refresh is safe with narrowly bounded retry policy; consumed-token replay revokes session/family and records a security event.
- [ ] Current logout, logout-all, list/revoke session, expiry, and cookie clearing behave correctly.
- [ ] Cookie defaults and `kid` key rotation behavior are documented and tested.

## Verification

Run JWT tests, PostgreSQL concurrent refresh/replay tests, Fastify E2E for token expiry/revocation/logout/cookies, lint/typecheck/build.

## Completion checklist

- [ ] Auth docs reflect implementation; replay/security evidence and staged diff reviewed.
