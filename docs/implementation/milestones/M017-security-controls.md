# M017 — Application Security Controls

**Stage:** 08 — Security and Observability
**Status:** completed
**Dependencies:** M016

## Objective

Apply and verify the application's baseline HTTP, credential, CSRF, rate-limit, proxy, and sensitive-action protections.

## Scope

- Fastify-compatible Helmet, strict CORS allowlist, secure cookie/Origin/CSRF behavior, configurable global and endpoint throttles.
- Trusted proxy configuration; safe client IP handling; password checks/rehash/revocation and recent-auth enforcement.
- Security tests, threat review, dependency vulnerability process and secret redaction verification.

## Out of scope

- Vendor-specific WAF, distributed cache, new auth methods, production release.

## Architecture references

- [Security](../../architecture/security.md), [authentication](../../architecture/authentication.md), [deployment](../../architecture/deployment.md); source §§6, 13, 19.

## Deliverables

- Configurable security controls, abuse tests and security operations notes.

## Acceptance criteria

- [x] Helmet and explicit origin allowlist run correctly with Fastify; credentialed wildcard CORS is impossible.
- [x] Cookie-authenticated sensitive requests validate Origin and apply SameSite/CSRF token policy for configured topology.
- [x] Global and per-endpoint rate limits exist; docs state per-pod limits are not cluster-wide and identify edge enforcement.
- [x] Proxy trust is restricted to known ingress; spoofed forwarded IP is not trusted.
- [x] Recent-auth/password confirmation protects sensitive actions; timing-safe password checks, rehash path, and session invalidation work.
- [x] Security tests cover malformed origins, rate limits, spoofed headers, secrets/logs, and applicable auth abuse; dependency/image scanning hooks are ready.

## Verification

Security config and abuse tests, dependency audit, TypeScript, formatting, lint, build, OpenAPI, database migration consistency, and progress validation passed. The image-scan hook is installed; execution is deferred until M019 builds the image.

## Completion checklist

- [x] Threat review and operations docs updated; evidence and staged diff reviewed.

## Implementation notes

- Fastify Helmet, explicit-origin CORS, and process-local global/endpoint rate limits are installed. Login and recovery counters key by IP and a one-way hash of the normalized account value.
- Fastify proxy trust is disabled unless exact IP/CIDR hops are configured. Invalid ranges fail configuration validation.
- Refresh-cookie requests require an exact allowlisted Origin. `SameSite=Lax` is default; `Strict` is configurable, while cross-site `None` remains unsupported.
- Ownership transfer now confirms the current password. Existing password change and global logout also require password confirmation; Argon2id verification and opportunistic rehash were already in place.
- `pnpm security:audit` and the Trivy `pnpm security:scan-image` hook are available. The dependency audit reported no known production vulnerabilities; image scanning awaits the M019 image and an environment with Trivy installed.
