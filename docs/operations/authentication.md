# Authentication and account operations (M010–M011)

## Sessions (M011)

`POST /api/v1/auth/login` accepts an email and password, verifies the account, creates a PostgreSQL session and returns a 10-minute EdDSA JWT. The opaque 256-bit refresh secret is only stored as a SHA-256 digest and is set in an HttpOnly cookie. `POST /api/v1/auth/refresh` consumes that cookie and rotates it transactionally. Concurrent calls serialize on the session row; retries within two seconds receive the same deterministic next token. `AUTH_REFRESH_TOKEN_KEY` must be a shared random base64url secret of at least 32 bytes across production replicas for this behavior. Reuse outside the retry window revokes the session and writes an `auth.refresh_reuse` audit event in the same transaction.

Access tokens pin `EdDSA`, issuer, audience and `kid`, and carry `sub`, `sid`, `jti`, `iat` and `exp`. The guard checks account status and the referenced session on every request, so logout and account suspension invalidate existing access tokens immediately. Production must set matching Ed25519 PKCS#8 private and SPKI public PEM values in `AUTH_JWT_PRIVATE_KEY` and `AUTH_JWT_PUBLIC_KEY`, plus a stable `AUTH_JWT_KID`. Development and tests may omit the key pair and get a process-local generated pair; this is unsuitable for multiple replicas. To create a production key pair, run `openssl genpkey -algorithm ED25519 -out jwt-private.pem` and `openssl pkey -in jwt-private.pem -pubout -out jwt-public.pem`, then provide the PEM contents through the deployment secret store. For rotation, publish the new active private/public pair and kid to all replicas, while supplying retiring public keys as a JSON object in `AUTH_JWT_PUBLIC_KEYS` keyed by their old `kid`. Remove retired keys after the longest access-token lifetime.

The refresh cookie is `refresh_token`, `HttpOnly`, `SameSite=Lax`, host-only and scoped to `/api/v1/auth`; it uses `Secure` automatically in production. `AUTH_REFRESH_COOKIE_SECURE` can explicitly override this behavior. Idle lifetime defaults to 14 days and absolute session lifetime to 30 days. Routes include `GET /auth/me`, `GET /users/me`, `POST /auth/change-password`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/sessions`, and `DELETE /auth/sessions/:id`. Password change and logout-all require current-password confirmation. Password changes and password resets revoke all sessions atomically.

Current identity and profile both use the public account projection today; they are separate routes so identity context and profile behavior can evolve independently.

M011 does not yet provide CSRF token/origin enforcement or endpoint throttling. Those controls are assigned to M017; browser deployments should keep the documented same-site topology until then.

M010 currently provides these public endpoints under `/api/v1`:

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/auth/register` | Creates an account and sends an email verification token. Returns a public user projection only. |
| POST | `/auth/verify-email` | Consumes a single-use token expiring after 24 hours. |
| POST | `/auth/resend-verification` | Returns the same accepted response whether an account exists or is eligible. |
| POST | `/auth/forgot-password` | Returns the same accepted response whether an account exists or is eligible. |
| POST | `/auth/reset-password` | Atomically consumes a token expiring after 30 minutes and updates the password. |

Email is trimmed and Unicode NFKC-normalized for display, with a lowercase NFKC value used for uniqueness and lookup. Passwords accept 12–256 characters and are hashed with Argon2id (19 MiB, two iterations, one lane). Verification and reset token values are 256-bit random base64url strings; only SHA-256 digests are persisted. Issuance is capped at three tokens per account in a rolling hour. Password verification runs against a fixed dummy Argon2id hash for unknown accounts to reduce timing-based account discovery.

Account writes commit before sending email. This means a provider failure can leave a committed account/token without delivery; M015 adds durable outbox delivery. The console sender is enabled only for development/test. Production startup fails until a production sender is supplied. The in-memory adapter is intended for deterministic service tests.

Credential verification, profile projection, and password-change confirmation are available in the application service. The bearer-authenticated `/auth/me`, `/users/me`, and password-change routes are assigned to M011, alongside its JWT session guard. Do not treat account flows as production-ready until M010 and M011 are completed and M015 configures durable delivery.
