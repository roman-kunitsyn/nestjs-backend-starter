# Authentication

**Source:** Original specification §6 and related token tables in §5.

## Credentials and token policy

Use two credentials: a short-lived JWT access token (10 minutes default) and a long-lived opaque refresh token bound to a revocable server-side session. Browser clients keep access tokens in memory and refresh credentials in secure cookies; never use localStorage for refresh tokens. Passwords use Argon2id. Values must be configurable and documented:

| Setting | Default |
| --- | --- |
| Access token | 10 minutes |
| Refresh idle lifetime | 14 days |
| Maximum session | 30 days |
| Password reset token | 30 minutes |
| Email verification token | 24 hours |
| Invitation | 7 days |

## JWT validation

Prefer asymmetric Ed25519/EdDSA if reliably supported end-to-end; RS256 is acceptable for better interoperability. Claims include issuer, audience, subject user UUID, session UUID (`sid`), token UUID (`jti`), issued-at, and expiry. Pin allowed algorithms and validate signature, issuer, audience, expiry, structure/types, user state, and session revocation when immediate invalidation is required. Support `kid` rotation; never trust the token header to choose an algorithm.

Do not treat client-supplied organization ID as membership proof. For organization routes derive requested context from path, then validate user, active membership, permission, resource ownership as applicable, and only then tenant-scoped access. Resolve current permissions from server membership state where possible instead of relying only on long-lived role claims.

## Refresh, session, and recovery lifecycle

Persist only a cryptographic digest of high-entropy opaque refresh tokens. Rotate atomically with row locking or equivalent CAS and store minimal consumed-token history to detect replay. Define narrow bounded concurrency grace; replay outside it revokes the session/family, records a security event, and requires reauthentication. Logout revokes the current session and clears cookie; logout-all revokes every user session. Enumerate and revoke sessions.

Registration, email verification, login, refresh, current identity, logout, logout-all, session listing/revocation, forgot/reset password, and password change are required. Require password confirmation for sensitive operations. Reject suspended users. Public login/recovery responses must not disclose account existence; log structured internal diagnostics without secrets. Single-use verification/reset tokens are random, hashed, expiring, consumed atomically and rate-limited. Define password-reset invalidation of credentials/sessions.

## Cookie contract

Production defaults: `HttpOnly`, `Secure`, `SameSite=Lax`, path `/api/v1/auth`, host-only domain unless required. Use `__Secure-` when appropriate; `__Host-` requires `Path=/` and no Domain. Document frontend/API topology. If cross-site deployment requires `SameSite=None`, explicitly add stronger CSRF controls. Never combine wildcard CORS with credentials. See [Security](security.md).

## Source references

Session storage shape and token history constraints are in [Database](database.md). Account and email endpoint contracts are in [API conventions](api-conventions.md); authorization checks are in [Authorization](authorization.md).
