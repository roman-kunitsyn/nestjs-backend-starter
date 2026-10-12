# Account operations (M010)

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

Credential verification, profile projection, and password-change confirmation are available in the application service. Login/session guards and the HTTP routes for `/auth/me`, `/users/me`, and password change require M011's JWT session capability and remain incomplete. Do not treat account flows as production-ready until the M010 contract is completed and M015 configures durable delivery.
