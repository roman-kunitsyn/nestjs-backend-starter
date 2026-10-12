# M017 — Application Security Controls

**Stage:** 08 — Security and Observability
**Status:** pending
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

- [ ] Helmet and explicit origin allowlist run correctly with Fastify; credentialed wildcard CORS is impossible.
- [ ] Cookie-authenticated sensitive requests validate Origin and apply SameSite/CSRF token policy for configured topology.
- [ ] Global and per-endpoint rate limits exist; docs state per-pod limits are not cluster-wide and identify edge enforcement.
- [ ] Proxy trust is restricted to known ingress; spoofed forwarded IP is not trusted.
- [ ] Recent-auth/password confirmation protects sensitive actions; timing-safe password checks, rehash path, and session invalidation work.
- [ ] Security tests cover malformed origins, rate limits, spoofed headers, secrets/logs, and applicable auth abuse; dependency/image scanning hooks are ready.

## Verification

Run security E2E/config tests and dependency audit/scanner available in repo; lint/typecheck/build. Record scanner limitations.

## Completion checklist

- [ ] Threat review and operations docs updated; evidence and staged diff reviewed.
