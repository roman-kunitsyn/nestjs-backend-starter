# Technology stack

**Source:** Original specification §§1.2, 4, and 11. This document records requirements, not an installed or verified dependency set.

## Selected technologies

| Area | Requirement |
| --- | --- |
| Runtime | Node.js 24 LTS |
| Language | TypeScript, strict mode |
| Framework / HTTP | NestJS / Fastify |
| API | REST, JSON, OpenAPI; target OpenAPI 3.1 subject to verified support |
| Database / access | PostgreSQL, Drizzle ORM, `postgres.js`, Drizzle Kit |
| Validation/configuration | Zod |
| Authentication/passwords | JWT access tokens, opaque rotating refresh tokens, Argon2id |
| Authorization/tenancy | Permission-based RBAC plus ownership; shared database and schema with organization isolation |
| Email | Application-owned provider interface and swappable adapters |
| Logging/docs | Pino; Swagger/OpenAPI |
| Tests | Jest, Fastify injection, Testcontainers |
| Package manager | pnpm with Corepack |
| Delivery | Docker, Kubernetes, Helm, GitHub Actions |
| Background jobs/cache | Deferred, except specified minimal email outbox dispatch |

Use compatible stable versions, exact lockfile resolution, and no floating production dependencies. Document any release candidate. The source calls out Drizzle API version differences: choose one compatible line and use it consistently. Use Node `crypto` for suitable secure primitives. Select an email transport only when configuring its concrete adapter.

Suggested runtime package families in the source include Nest common/core/Fastify, Nest config, Zod, Drizzle, `postgres.js`, Passport/JWT, Argon2, Fastify cookie/Helmet, Nest throttler/Swagger, `nestjs-zod`, Pino integration, Terminus, and UUID only where needed. Development suggestions include TypeScript, Nest CLI/testing, Drizzle Kit, `tsx`, Jest/ts-jest, Testcontainers PostgreSQL, ESLint/typescript-eslint, and Prettier. These are candidate packages; compatibility and project constraints require reconciliation before adoption.

Use pnpm, commit the lockfile, and run frozen-lockfile installation in CI. Avoid duplicate libraries for one responsibility, Express-only middleware, and unnecessary Nest wrappers. Additional dependencies require a genuine need.

## TypeScript baseline

Use strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `skipLibCheck`, `noEmitOnError`, `experimentalDecorators`, and `emitDecoratorMetadata`. The source baseline uses ES2022 and NodeNext module/resolution. It is not a complete configuration: verify Nest build, ESM, test-runner, and dependency compatibility and choose one module system consistently. Prefer native ESM if cleanly supported; otherwise use coherent CommonJS.

## Environment configuration

Validate configuration with Zod at startup and fail clearly without printing secret values. The source example covers `NODE_ENV`, app name/host/port, public API and frontend URLs; database URL, pool maximum and connection timeout; JWT issuer/audience/private and public keys/key ID and access/refresh TTLs; secure/SameSite/domain cookie settings; email provider/from and SMTP host/port/username/password; explicit CORS origins and proxy trust; log level and optional OTEL endpoint. `.env.example` uses development placeholders only.

Separate local, test, staging, and production behavior; validate URLs and numeric ranges and key material; reject development signing keys in production; inject typed configuration rather than reading `process.env` across business code; fail closed on invalid security settings. Production secrets come through Kubernetes-compatible external secret delivery, never Helm values or source control. Support credential/key rotation and exclude secrets from logs, diagnostics, health endpoints, and crash output.

## Source ambiguity

The repository currently has package and adapter choices that differ from this target (including Express and Vitest). `AGENTS.md` is higher authority for project constraints; record and resolve any concrete compatibility issue through M002/ADR before replacing dependencies.
