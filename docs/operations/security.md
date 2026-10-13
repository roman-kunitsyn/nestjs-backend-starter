# Security operations

## Browser and ingress configuration

- Set `HTTP_CORS_ORIGINS` to exact HTTPS browser origins, comma separated. For local development, `http://localhost` is accepted. An empty list allows only same-origin refresh requests. Do not use wildcard origins.
- Refresh-cookie requests require an exact allowlisted `Origin`; the cookie remains HttpOnly, host-only, path-scoped, and `SameSite=Lax` by default. `strict` can be configured where the browser flow permits it. Cross-site `SameSite=None` is unsupported.
- Leave `HTTP_TRUSTED_PROXY_CIDRS` empty unless Fastify receives traffic only through the listed ingress proxy IPs/CIDRs. Keep the list narrow and update it with ingress changes.
- Enforce an additional cluster-wide rate limit at the ingress or API gateway. Application limits use an in-memory store per pod and do not coordinate across replicas.

## Rate-limit defaults

Defaults are 120 requests/minute/IP globally, 5 login attempts/minute/IP/account, 3 registrations/hour/IP, 3 recovery or verification-resend attempts/hour/IP/account, 20 refreshes/minute/IP, and 5 sensitive actions per 10 minutes/IP. Configure these with the `HTTP_RATE_LIMIT_*` and `AUTH_*_RATE_LIMIT_MAX` variables in `.env.example`. Tune them against expected traffic and monitor 429 responses at the edge. Do not apply permanent account lockouts based on failed login attempts.

## Password and sensitive actions

Passwords use Argon2id (19 MiB memory, two iterations, one lane); successful logins rehash outdated parameters. Password change, global logout, and organization ownership transfer require the current password. Password changes and reset revoke existing sessions. Logs redact authorization, cookies, token values, passwords, and SMTP credentials.

## Dependency and image scanning

Run `pnpm security:audit` before release and resolve or explicitly triage reported advisories. Keep the lockfile frozen in builds. The `pnpm security:scan-image` hook uses Trivy against `nestjs-backend-starter:local`; install Trivy and run it after building that image in M019. Image scanning was not run in M017 because the production image does not exist, and Trivy is not available in the current environment. CI enforcement is scheduled in M021.
