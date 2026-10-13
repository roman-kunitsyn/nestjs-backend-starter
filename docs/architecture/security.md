# Security

**Source:** Original specification §13 and security controls throughout §§5–12, 14, 18–19.

## Required controls

| Area | Requirement |
| --- | --- |
| Passwords | Argon2id, documented parameter tuning; reasonable minimum, allow passphrases/long values, avoid arbitrary complexity, check common/compromised passwords when practical, timing-safe verification, rehash outdated parameters, never log raw passwords. |
| JWT/session | Strict pinned algorithm and claim validation, key rotation, hashed opaque refresh tokens, rotation/replay detection/revocation. |
| HTTP | Fastify-compatible Helmet/security headers; explicit CORS origin allowlist; no wildcard with credentials. |
| CSRF | Protect cookie-authorized state-changing operations; validate Origin, configure SameSite, require CSRF token/equivalent when topology requires, reject unsupported cross-origin requests, scope cookies intentionally. |
| Throttling | Global and endpoint-specific protection; distributed/edge strategy, not merely per-process in-memory counters. |
| Validation/database | Zod at boundaries, bounded body size, parameterized Drizzle queries, DB constraints. |
| Tenancy/recovery | Membership and tenant-scoped access, single-use expiring reset credentials. |
| Secrets/logging | Externalized secrets; redact credentials and sensitive fields; sanitized production errors. |
| Supply chain | Vulnerability scanning, reproducible builds, image scanning. |

## Rate limiting

Use separate policies for general API, login, registration, password reset, verification resend, refresh, ownership transfer, and invitation creation. Starting defaults (tune from tests/traffic): general API 120/min/IP; login 5/min/IP and normalized account; registration 3/hour/IP; recovery/resend 3/hour/IP and normalized account; refresh 20/min/IP; sensitive actions 5/10 min/IP. These are configurable starting points, not guarantees. Kubernetes replicas mean the Fastify in-memory store is per pod, not cluster-wide: require coarse ingress/API-gateway limits and retain an extension point for a shared limiter when needed. Avoid account lockout designs that let attackers deny service to legitimate users.

Runtime variables are `HTTP_RATE_LIMIT_MAX`, `HTTP_RATE_LIMIT_WINDOW_MS`, `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_REGISTER_RATE_LIMIT_MAX`, `AUTH_RECOVERY_RATE_LIMIT_MAX`, `AUTH_REFRESH_RATE_LIMIT_MAX`, and `AUTH_SENSITIVE_RATE_LIMIT_MAX`. Apply an edge limit in addition to these per-pod counters.

## Browser origins and refresh CSRF

`HTTP_CORS_ORIGINS` is an explicit comma-separated list of exact HTTPS origins (HTTP localhost is allowed for local development). Wildcards are rejected. Credentialed CORS is enabled only when the list is non-empty. The refresh cookie uses `SameSite=Lax` by default; `AUTH_REFRESH_COOKIE_SAME_SITE` can be set to `strict`. A request carrying the refresh cookie must include an exact allowlisted `Origin`. Cross-site cookie deployment (`SameSite=None`) is intentionally unsupported; use a same-site browser topology. Cookies remain host-only and scoped to `/api/v1/auth`.

## Trusted proxies

Fastify proxy trust is disabled by default. Set `HTTP_TRUSTED_PROXY_CIDRS` to comma-separated, narrowly scoped ingress addresses or CIDRs only when traffic is guaranteed to arrive through those proxies. Fastify then resolves `request.ip` from forwarded headers only across those trusted hops. Never use `*`, broad public ranges, or client-supplied forwarding headers as trusted addresses.

## Proxy and IP handling

Trust only known reverse proxies or a controlled ingress path. Never blindly accept client-supplied `X-Forwarded-For` for rate limits or logs. Configure Fastify proxy trust explicitly.

## Sensitive operations and audit

Require recent auth or password confirmation for password/email change, ownership transfer, global session revocation, and privileged membership administration. Define freshness interval and method. Audit sensitive actions without credentials; include required records atomically with state changes where needed. See [Authentication](authentication.md), [Database](database.md), and [Observability](observability.md).

## Deployment security

Production secrets use external managers/secret references and rotate. Containers run non-root, drop capabilities, disallow privilege escalation, use default seccomp and read-only root FS when supported, restrict service accounts and network policies, and scan images/dependencies. Production external traffic uses TLS. See [Deployment](deployment.md).
