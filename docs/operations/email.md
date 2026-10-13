# Email delivery and audit

## Providers

Development uses the console adapter. It can print account and invitation token links, so use it only on a trusted local terminal. Production requires authenticated SMTP configuration (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`). SMTP certificate verification is always enabled; set `SMTP_SECURE=true` for implicit TLS (typically port 465), or leave it false to require STARTTLS (typically port 587). Connection, greeting, and socket timeouts share `SMTP_TIMEOUT_MS`. `SMTP_CA_PEM` may provide a trusted private CA certificate. Never disable certificate validation.

The in-memory sender is available for deterministic tests. Templates produce text and HTML for verification, password reset, organization invitations, password changes, and session revocation notices. User supplied names and organization names are escaped for HTML.

## Transactional outbox

Registration, verification resend, password recovery, invitation creation, and explicit saved-session revocation insert their token/notice row in the same PostgreSQL transaction as the business state. Password reset/change notices and the corresponding audit events commit in the same transaction as credential/session updates. A mail provider outage therefore does not undo the security-sensitive state change.

The application polls the outbox every five seconds and claims up to 25 eligible rows in a short transaction using `FOR UPDATE SKIP LOCKED`. It sends at most five claimed messages concurrently. Each claim has a 15-minute lease, allowing multiple replicas to dispatch without concurrently claiming the same row while exceeding SMTP's maximum two-minute timeout. Provider calls run after commit. A process crash after provider acceptance can cause a duplicate when the lease expires; delivery is at least once, so messages must remain safe to repeat.

Failed attempts use exponential delays beginning at one minute, capped at six hours. After eight claims, an item is marked `failed`; a worker crash during the final leased attempt is also closed as failed when that lease expires. The row ID and safe error class are logged, while provider error text and message payload are not. Inspect permanent failures directly in the restricted database operations workflow and resolve provider configuration before manually returning an item to `pending`. Do not log or copy token payloads into tickets.

## Audit records

Authentication password reset/change, session revocation and refresh-token replay, plus organization creation/update/status changes, invitation and membership changes, and ownership transfer write audit rows transactionally with their associated state changes. Metadata contains safe identifiers and role/status facts only. Passwords, tokens, authorization headers, and raw provider errors are excluded.

The runner is part of each API process; PostgreSQL leases coordinate replicas. No separate queue, broker, or Kubernetes CronJob is required.
