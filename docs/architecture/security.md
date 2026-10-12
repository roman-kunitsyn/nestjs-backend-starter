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

Use separate policies for general API, login, registration, password reset, verification resend, refresh, and invitation creation. Starting examples (tune from tests/traffic): general authenticated API 120/min per actor; login 5/min per IP/account dimension; registration 3/hour/IP; forgot password 3/hour/account/IP; resend 3/hour/account; refresh 20/min/session/IP. These are configurable starting points, not guarantees. Kubernetes replicas mean in-memory Nest throttling is not cluster-wide: use coarse ingress/API-gateway throttling and document an extension point for distributed app limits. Avoid account lockout designs that let attackers deny service to legitimate users.

## Proxy and IP handling

Trust only known reverse proxies or a controlled ingress path. Never blindly accept client-supplied `X-Forwarded-For` for rate limits or logs. Configure Fastify proxy trust explicitly.

## Sensitive operations and audit

Require recent auth or password confirmation for password/email change, ownership transfer, global session revocation, and privileged membership administration. Define freshness interval and method. Audit sensitive actions without credentials; include required records atomically with state changes where needed. See [Authentication](authentication.md), [Database](database.md), and [Observability](observability.md).

## Deployment security

Production secrets use external managers/secret references and rotate. Containers run non-root, drop capabilities, disallow privilege escalation, use default seccomp and read-only root FS when supported, restrict service accounts and network policies, and scan images/dependencies. Production external traffic uses TLS. See [Deployment](deployment.md).
