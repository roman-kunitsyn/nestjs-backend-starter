# NestJS Backend Starter Architecture — 2026

Production-ready technical specification · Version 1.0 · October 13, 2026

Suggested filename: `nestjs-backend-starter-architecture-2026.md`

## 1. Project overview

### 1.1 Objective

Build a reusable, production-ready backend starter template based on NestJS, TypeScript, PostgreSQL, and REST APIs.

The starter must support consumer-facing web applications, SaaS products, administrative dashboards, mobile applications, and multi-organization platforms.

It must provide the complete technical foundation necessary to implement business-specific features without redesigning authentication, authorization, tenancy, database infrastructure, API conventions, deployment, or testing.

The deliverable is an executable, tested, deployable application—not merely a repository skeleton.

### 1.2 Technology decisions

| Area                               | Selected technology                                          |
| ---------------------------------- | ------------------------------------------------------------ |
| Runtime                            | Node.js 24 LTS                                               |
| Language                           | TypeScript with strict mode                                  |
| Application framework              | NestJS                                                       |
| HTTP server                        | Fastify                                                      |
| API                                | REST, JSON, OpenAPI 3.1                                      |
| Database                           | PostgreSQL                                                   |
| ORM / query builder                | Drizzle ORM                                                  |
| Database driver                    | `postgres.js`                                                |
| Migrations                         | Drizzle Kit                                                  |
| Input and configuration validation | Zod                                                          |
| Authentication                     | JWT access tokens + opaque rotating refresh tokens           |
| Password hashing                   | Argon2id                                                     |
| Authorization                      | RBAC + resource ownership                                    |
| Multi-tenancy                      | Shared database, shared schema, organization-based isolation |
| Email                              | Provider interface + swappable implementations               |
| Logging                            | Pino                                                         |
| API docs                           | Swagger / OpenAPI                                            |
| Testing                            | Jest + Fastify injection + Testcontainers                    |
| Package manager                    | pnpm                                                         |
| Containers                         | Docker                                                       |
| Orchestration                      | Kubernetes                                                   |
| Deployment templates               | Helm                                                         |
| CI/CD                              | GitHub Actions                                               |
| Background jobs                    | Deferred                                                     |
| Cache                              | Deferred                                                     |

Use current compatible stable package versions when bootstrapping. Pin exact versions in `pnpm-lock.yaml`, avoid floating production dependencies, and document any deliberate use of release candidates.

As of the current NestJS documentation, Drizzle integration supports both established Drizzle versions and the newer v1 release-candidate API. Choose one compatible version line, implement it consistently, and avoid mixing relational API examples from different major versions.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.nestjs.com&sz=32)

NestJS - A progressive Node.js framework

+1

### 1.3 Architecture principles

1. Modular monolith first. One deployable backend application with well-defined module boundaries.
2. REST-first and contract-first. Every public API operation must have documented request and response contracts.
3. Tenant isolation by design. Every organization-owned record must be protected against cross-organization access.
4. Secure by default. Authentication, authorization, validation, and auditability must not be optional conventions.
5. Database constraints enforce invariants. Do not rely on application validation alone for uniqueness and referential integrity.
6. Stateless application replicas. All Kubernetes pods must be independently replaceable.
7. Explicit dependencies. Modules must use dependency injection rather than hidden global state.
8. No unnecessary abstraction. Avoid creating generic frameworks before real requirements exist.
9. Production and local parity. Development, testing, and deployment should use similar infrastructure and configuration patterns.
10. Business logic independence. Business modules should not depend directly on HTTP transports, JWT implementations, or email vendors.

### 1.4 Scope

The first release must include identity, account management, organization management, memberships, roles, permissions, refresh-token sessions, email verification, password recovery, API validation, structured logging, health checks, database migrations, testing, and Kubernetes deployment.

A demonstrative tenant-scoped resource module must also be implemented to establish patterns that future business features will follow.

### 1.5 Explicitly out of scope

The initial starter must not implement microservices, Kafka, GraphQL, event sourcing, full CQRS architecture, a distributed cache, a general-purpose workflow engine, or a complex job-processing platform.

Social OAuth, enterprise SSO, billing, subscriptions, file storage, and external API keys are future extensions. Maintain extension points only where they add immediate architectural value.

# 2. System architecture

## 2.1 High-level architecture

### 2.2 Application layering

Each feature module should follow this logical separation:

| Layer               | Responsibility                                                  |
| ------------------- | --------------------------------------------------------------- |
| Controller          | HTTP routes, DTOs, response status, OpenAPI metadata            |
| Application service | Use-case orchestration and transactions                         |
| Domain / policy     | Business invariants, permissions, ownership rules               |
| Repository          | Tenant-scoped database operations using Drizzle                 |
| Infrastructure      | Database, cryptography, email, configuration, external services |

Not every module needs five physical directories. Simple modules can use flat files. Complex modules may introduce deeper structure without changing the architectural contract.

### 2.3 Dependency rules

- Controllers call application services.
- Application services use repositories, policy services, and infrastructure interfaces.
- Repositories use Drizzle and PostgreSQL.
- Business modules must not import another module's repository directly.
- Cross-module operations must go through exported services or explicitly defined interfaces.
- Do not use `forwardRef()` as a routine way to resolve circular dependencies.
- Database schemas may be shared for typing, but database writes must respect module ownership.

# 3. Repository and directory structure

```
nestjs-backend-starter/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── bootstrap/
│   │   ├── fastify.config.ts
│   │   ├── openapi.config.ts
│   │   ├── security.config.ts
│   │   └── validation.config.ts
│   │
│   ├── config/
│   │   ├── env.schema.ts
│   │   ├── env.ts
│   │   └── config.module.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── permissions.decorator.ts
│   │   ├── guards/
│   │   ├── filters/
│   │   │   └── problem-details.filter.ts
│   │   ├── interceptors/
│   │   ├── errors/
│   │   │   ├── application.error.ts
│   │   │   └── error-codes.ts
│   │   ├── pagination/
│   │   ├── validation/
│   │   └── types/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── database.provider.ts
│   │   │   ├── database.types.ts
│   │   │   ├── schema/
│   │   │   │   ├── users.schema.ts
│   │   │   │   ├── organizations.schema.ts
│   │   │   │   ├── memberships.schema.ts
│   │   │   │   ├── roles.schema.ts
│   │   │   │   ├── permissions.schema.ts
│   │   │   │   ├── sessions.schema.ts
│   │   │   │   ├── tokens.schema.ts
│   │   │   │   ├── invitations.schema.ts
│   │   │   │   ├── audit.schema.ts
│   │   │   │   └── index.ts
│   │   │   └── seeds/
│   │   ├── cryptography/
│   │   ├── email/
│   │   │   ├── email.port.ts
│   │   │   ├── console-email.adapter.ts
│   │   │   ├── smtp-email.adapter.ts
│   │   │   ├── email.module.ts
│   │   │   └── templates/
│   │   ├── logging/
│   │   ├── telemetry/
│   │   └── time/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── users/
│   │   ├── sessions/
│   │   ├── organizations/
│   │   ├── memberships/
│   │   ├── invitations/
│   │   ├── authorization/
│   │   ├── audit/
│   │   ├── health/
│   │   └── example-resources/
│   │
│   └── contracts/
│       ├── problem-details.ts
│       └── pagination.ts
│
├── drizzle/
│   ├── migrations/
│   └── meta/
│
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   ├── factories/
│   └── helpers/
│
├── deploy/
│   └── helm/
│       └── backend/
│           ├── Chart.yaml
│           ├── values.yaml
│           ├── values-staging.yaml
│           ├── values-production.yaml
│           └── templates/
│               ├── deployment.yaml
│               ├── service.yaml
│               ├── ingress.yaml
│               ├── serviceaccount.yaml
│               ├── configmap.yaml
│               ├── hpa.yaml
│               ├── pdb.yaml
│               ├── migration-job.yaml
│               └── networkpolicy.yaml
│
├── scripts/
│   ├── seed.ts
│   ├── bootstrap-admin.ts
│   └── check-openapi.ts
│
├── docs/
│   ├── architecture.md
│   ├── api-conventions.md
│   ├── authentication.md
│   ├── authorization.md
│   ├── multi-tenancy.md
│   ├── database.md
│   ├── deployment.md
│   ├── security.md
│   └── development.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── deploy.yml
│
├── .env.example
├── .dockerignore
├── .gitignore
├── .npmrc
├── .prettierrc
├── compose.yaml
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

### Structure requirements

`src/modules` contains functional application modules.

`src/infrastructure` contains adapters and platform integrations.

`src/common` contains reusable technical constructs that do not belong to one feature.

`src/contracts` contains shared HTTP contract definitions, not internal database models.

`drizzle/migrations` contains committed, immutable migration files after they have been deployed.

`deploy/helm` contains deployable Kubernetes manifests and values.

Do not introduce a catch-all `shared.service.ts`, `base.repository.ts`, or `utils.ts` as a dumping ground for unrelated functionality.

# 4. Dependencies and package management

## 4.1 Runtime dependencies

The developer agent should evaluate current compatible releases of these packages:

| Purpose           | Dependencies                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| NestJS            | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-fastify`            |
| Configuration     | `@nestjs/config`, `zod`                                                 |
| PostgreSQL        | `drizzle-orm`, `pg`                                                     |
| Authentication    | `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `argon2` |
| Cookies           | `@fastify/cookie`                                                       |
| Security          | `@fastify/helmet`, `@nestjs/throttler`                                  |
| API documentation | `@nestjs/swagger`, `nestjs-zod`                                         |
| Logging           | `nestjs-pino`, `pino`                                                   |
| Health            | `@nestjs/terminus`                                                      |
| Utilities         | `uuid` where needed                                                     |

Use Node.js built-in `crypto` for secure random tokens, hashes, and other standard cryptographic primitives when appropriate.

Select the email transport only when configuring the concrete provider adapter.

## 4.2 Development dependencies

```
typescript
@types/node
@types/pg
@types/passport-jwt
@nestjs/cli
@nestjs/testing

drizzle-kit
tsx

jest
ts-jest
@types/jest
testcontainers
@testcontainers/postgresql

eslint
typescript-eslint
prettier
```

Additional dependencies may be introduced when genuinely required.

### Package rules

- Use pnpm with Corepack.
- Commit the lockfile.
- Use `pnpm install --frozen-lockfile` in CI.
- Enable TypeScript strict mode.
- Avoid duplicate libraries performing the same responsibility.
- Use consistent import conventions.
- Do not install Express-only middleware in the Fastify application.
- Do not introduce unnecessary NestJS wrappers for libraries that can be integrated with a simple provider.

## 4.3 TypeScript configuration

Required compiler settings:

```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmitOnError": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

This is a target baseline, not a blindly copyable complete configuration.

Verify compatibility between NestJS's compiler/build system, ESM output, Jest configuration, and the selected library versions. Choose one module system consistently. Prefer native ESM if the selected toolchain supports it cleanly; otherwise use a coherent CommonJS configuration rather than mixing the two.

# 5. Database architecture

## 5.1 PostgreSQL decisions

Use one PostgreSQL database with a shared schema across organizations.

Global entities include users, organizations, sessions, and authentication tokens.

Tenant-owned entities reference an organization.

Use:

- UUID primary keys.
- `timestamptz` for timestamps.
- UTC for all stored instants.
- `snake_case` SQL columns.
- `camelCase` TypeScript properties.
- Database-level foreign keys and unique constraints.
- Check constraints for appropriate invariants.
- Explicit migrations.
- Bounded connection pools.
- Database transactions for multi-step operations.

Avoid application-generated timestamps where database-generated timestamps provide stronger consistency.

## 5.2 Tenant model

The application supports many organizations, and each user may belong to multiple organizations.

A user's authorization may differ across organizations.

For example:

### Tenant isolation rules

1. Each organization-owned table must contain `organization_id NOT NULL`.
2. Every tenant-scoped read, update, and delete must constrain the organization.
3. A resource ID alone is never sufficient to authorize access.
4. All nested writes must validate organization consistency.
5. Tenant context must be derived from validated authentication and membership information.
6. Users cannot self-assign arbitrary organization roles.
7. Organization administrators may manage only memberships and resources permitted by their policies.
8. Cross-organization access must fail even if the requested UUID exists.
9. User-owned and organization-owned resources must be distinguished explicitly.
10. Tests must establish isolation across at least two organizations.

The initial isolation boundary is enforced through repository conventions, service policies, composite constraints, and integration tests.

For stronger defense in depth, consider PostgreSQL Row Level Security (RLS). It is not required for the initial starter, but the specification must explain when and how RLS could be introduced.

If RLS is later used, tenant identity must be set safely per database transaction, and pooled connections must not leak tenant context between requests.

## 5.3 Drizzle conventions

Use Drizzle schema definitions in TypeScript. Keep indexes, foreign keys, checks, and constraints in schema definitions or explicit SQL migrations.

The database provider must:

- Own the PostgreSQL connection pool.
- Expose a typed Drizzle database instance.
- Provide transaction support.
- Close connections on application shutdown.
- Allow tests to substitute isolated database connections.

Do not create a new pool per request.

For straightforward integration, use a NestJS custom provider exporting a `DATABASE` injection token. A Drizzle NestJS integration module is also acceptable if it meets the same lifecycle and type-safety requirements.

Migration commands must use Drizzle Kit. Drizzle documents both SQL migration generation and execution, which should form the foundation of the deployment process.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.nestjs.com&sz=32)

NestJS - A progressive Node.js framework

+1

## 5.4 Core database schema

Implement the following tables before business-specific modules.

### `users`

Global user identities.

| Column              | Type        | Constraints                             |
| ------------------- | ----------- | --------------------------------------- |
| `id`                | UUID        | PK                                      |
| `email`             | text        | Required                                |
| `email_normalized`  | text        | Required, unique                        |
| `password_hash`     | text        | Nullable for future external identities |
| `display_name`      | text        | Nullable                                |
| `email_verified_at` | timestamptz | Nullable                                |
| `status`            | enum        | `active`, `suspended`, `disabled`       |
| `created_at`        | timestamptz | Required                                |
| `updated_at`        | timestamptz | Required                                |

Normalize email addresses consistently before lookup or uniqueness checks. Define a documented, conservative normalization strategy rather than applying provider-specific transformations, such as stripping Gmail dots.

Never return `password_hash` to API clients.

### `organizations`

| Column               | Type         | Constraints                       |
| -------------------- | ------------ | --------------------------------- |
| `id`                 | UUID         | PK                                |
| `name`               | varchar(200) | Required                          |
| `slug`               | varchar(100) | Unique                            |
| `status`             | enum         | `active`, `suspended`, `archived` |
| `created_by_user_id` | UUID         | FK to users                       |
| `created_at`         | timestamptz  | Required                          |
| `updated_at`         | timestamptz  | Required                          |

Organization slugs must be normalized and validated.

Reserve platform-specific slugs such as `admin`, `system`, and `api`.

Use stable UUIDs internally even if public URLs use slugs.

### `organization_memberships`

| Column            | Type        | Constraints           |
| ----------------- | ----------- | --------------------- |
| `id`              | UUID        | PK                    |
| `organization_id` | UUID        | FK                    |
| `user_id`         | UUID        | FK                    |
| `status`          | enum        | `active`, `suspended` |
| `joined_at`       | timestamptz | Required              |
| `created_at`      | timestamptz | Required              |
| `updated_at`      | timestamptz | Required              |

Constraints:

- Unique `(organization_id, user_id)`.
- Composite unique `(id, organization_id)` to support tenant-consistent foreign keys.
- Index `(user_id, status)`.
- Index `(organization_id, status)`.

Do not delete membership records casually if they are referenced by audit history.

### `roles`

Use globally defined role templates for the starter.

| Column        | Type         | Constraints  |
| ------------- | ------------ | ------------ |
| `id`          | UUID         | PK           |
| `key`         | varchar(100) | Unique       |
| `name`        | varchar(100) | Required     |
| `description` | text         | Nullable     |
| `is_system`   | boolean      | Default true |

Initial roles:

| Role     | Purpose                                                    |
| -------- | ---------------------------------------------------------- |
| `OWNER`  | Organization ownership and critical administrative actions |
| `ADMIN`  | Organization administration                                |
| `MEMBER` | Regular organization participation                         |
| `VIEWER` | Read-only organization access                              |

These are organization roles, not global platform roles.

Platform administration must use a separate, explicitly audited mechanism rather than pretending that an organization owner is a platform administrator.

### `permissions`

| Column        | Type         | Constraints |
| ------------- | ------------ | ----------- |
| `id`          | UUID         | PK          |
| `key`         | varchar(150) | Unique      |
| `description` | text         | Nullable    |

Use colon-separated permission names:

```
organization:read
organization:update
organization:delete

members:read
members:invite
members:remove
members:roles:update

resources:create
resources:read
resources:update
resources:delete

audit:read
```

### `role_permissions`

Join table:

```
role_id
permission_id
```

Primary key: `(role_id, permission_id)`.

### `membership_roles`

Join table:

```
membership_id
role_id
```

Primary key: `(membership_id, role_id)`.

Initially assign one organization role per membership. The join table allows additional roles in future without redesigning the schema.

Enforce the one-role invariant in the database or transactionally until multiple-role support is explicitly enabled.

### `auth_sessions`

Represent authenticated devices or browser sessions.

| Column                    | Type        | Constraints |
| ------------------------- | ----------- | ----------- |
| `id`                      | UUID        | PK          |
| `user_id`                 | UUID        | FK          |
| `refresh_token_hash`      | text        | Required    |
| `refresh_token_family_id` | UUID        | Required    |
| `created_at`              | timestamptz | Required    |
| `last_used_at`            | timestamptz | Nullable    |
| `expires_at`              | timestamptz | Required    |
| `revoked_at`              | timestamptz | Nullable    |
| `revocation_reason`       | text        | Nullable    |
| `user_agent`              | text        | Nullable    |
| `ip_address`              | inet        | Nullable    |

Use a cryptographically random opaque refresh token, not a JWT.

Store a deterministic cryptographic digest of the high-entropy token for indexed lookup or constant-time comparison, with a suitable server-side keyed construction if required by the threat model.

Do not store raw refresh tokens.

Implement session rotation atomically.

### `refresh_token_history`

Maintain the minimum information required to detect reuse of rotated tokens.

```
id
session_id
token_hash
rotated_at
expires_at
reuse_detected_at
```

Index token hashes uniquely.

Retain consumed-token history for a defined security window and delete it according to the retention policy.

For concurrent refresh requests, use row locking or an equivalent atomic compare-and-swap strategy. Define a narrowly bounded grace/retry policy without allowing replay to mint unlimited sessions.

### `email_verification_tokens`

```
id
user_id
token_hash
expires_at
consumed_at
created_at
```

### `password_reset_tokens`

```
id
user_id
token_hash
expires_at
consumed_at
created_at
```

Security requirements:

- Cryptographically random single-use tokens.
- Store token hashes, not plaintext tokens.
- Enforce expiry and consumption atomically.
- Limit attempts and token generation frequency.
- Invalidate applicable existing credentials or sessions after password reset, according to the defined security policy.

### `organization_invitations`

```
id
organization_id
email_normalized
role_id
token_hash
invited_by_user_id
expires_at
accepted_at
revoked_at
created_at
```

Constraints and behavior:

- Invitation tokens must be single-use.
- The invitee must authenticate and prove ownership of the invited email address.
- Accepting an invitation creates or activates membership transactionally.
- Acceptance must reject expired, revoked, or previously consumed invitations.
- Role assignment is validated against the inviter's authority.
- Define a database constraint or transactional rule preventing conflicting active invitations.

### `audit_events`

```
id
organization_id nullable
actor_user_id nullable
actor_session_id nullable
action
resource_type
resource_id nullable
metadata jsonb
request_id
ip_address
created_at
```

Audit events must cover security-sensitive actions and administrative changes.

Do not include passwords, raw tokens, full authorization headers, or other credentials in audit metadata.

For the initial starter, insert security-critical audit events within the same database transaction as the corresponding state change when atomicity is required.

### `example_resources`

Create a demonstration resource to prove tenant isolation, ownership policies, CRUD, and pagination.

```
id
organization_id
created_by_membership_id
title
description
status
created_at
updated_at
```

Add a composite foreign key:

```
(created_by_membership_id, organization_id)
    -> organization_memberships(id, organization_id)
```

This prevents a resource from referencing a membership belonging to another organization.

## 5.5 Additional database rules

Use the following conventions for every future tenant-owned table:

```
id UUID PRIMARY KEY
organization_id UUID NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Require relevant composite indexes, such as:

```
(organization_id, created_at, id)
(organization_id, status)
```

Do not index every column without evidence of a query pattern.

Define `ON DELETE` behavior explicitly. Prefer restrictive deletion of organizations and memberships where historical integrity must be preserved.

### Transaction requirements

The following must be transactional:

- Create an organization and its owner membership.
- Accept an invitation and create membership.
- Change organization ownership.
- Remove a member while preserving the last-owner invariant.
- Rotate a refresh token.
- Consume a password-reset token and update the password.
- Perform privileged actions and store their required audit records.

## 5.6 Organization ownership invariant

An active organization must have at least one active owner.

The starter must prevent:

- Removing its last owner.
- Demoting its last owner.
- Suspending its last owner without another owner.
- Transferring ownership to an unauthorized or inactive membership.

Concurrent operations must not violate this invariant.

Use explicit transaction locking, serializable transactions with retries, or an equivalent database-safe mechanism.

Ordinary application-level count checks outside a transaction are insufficient.

# 6. Authentication specification

## 6.1 Authentication model

Use two credentials:

Access token: Short-lived JWT, 10 minutes by default.

Refresh token: Long-lived opaque credential associated with a revocable server-side session.

The browser frontend should keep access tokens in application memory and receive refresh credentials in secure cookies.

Never store refresh tokens in localStorage.

## 6.2 JWT specification

Use asymmetric signing, preferably Ed25519 (`EdDSA`) if supported reliably throughout the selected JWT toolchain.

RS256 is an acceptable alternative for environments where it offers better interoperability.

Define:

```
{
  "iss": "https://api.example.com",
  "aud": "example-web-api",
  "sub": "user-uuid",
  "sid": "session-uuid",
  "jti": "token-uuid",
  "iat": 1791800000,
  "exp": 1791800600
}
```

Required validation:

- Allowed signing algorithm, explicitly pinned.
- Signature verification.
- Issuer.
- Audience.
- Expiration.
- Token structure and types.
- User status.
- Session revocation where the security policy requires immediate invalidation.

Support `kid` for signing-key rotation.

Never accept the signing algorithm solely because the token header requests it.

### Organization context

Do not treat a frontend-supplied organization ID as proof of membership.

For organization routes, derive organization context from the path and verify active membership.

For example:

```
GET /api/v1/organizations/:organizationId/resources
```

The request pipeline must:

1. Verify the JWT.
2. Resolve the user.
3. Resolve organization membership.
4. Verify membership status.
5. Evaluate the required permission.
6. Evaluate resource ownership when applicable.
7. Execute tenant-scoped data access.

Prefer resolving current permissions from server-side membership state rather than relying exclusively on long-lived role claims embedded in JWTs.

## 6.3 Refresh token lifecycle

Default configuration:

| Setting                       | Default    |
| ----------------------------- | ---------- |
| Access token lifetime         | 10 minutes |
| Refresh idle lifetime         | 14 days    |
| Maximum session lifetime      | 30 days    |
| Password reset token lifetime | 30 minutes |
| Email verification lifetime   | 24 hours   |
| Invitation lifetime           | 7 days     |

The values must be configurable and documented.

Refresh flow:

```
Client sends refresh cookie
         |
         v
Validate token and locate session
         |
         v
Lock session / enforce atomic rotation
         |
         v
Check expiry, revocation, token state
         |
         v
Generate new refresh token
         |
         v
Persist new hash and rotation history
         |
         v
Issue new access token and refresh cookie
```

If a consumed token is reused outside any permitted concurrency policy, revoke the affected session or token family, record a security event, and require reauthentication.

For logout, revoke the session and clear the cookie.

For logout-all, revoke all sessions belonging to the user.

## 6.4 Cookie configuration

Recommended production defaults:

```
HttpOnly: true
Secure: true
SameSite: Lax
Path: /api/v1/auth
Domain: host-only unless explicitly required
```

Use `__Secure-` naming where suitable for a path-limited cookie. A `__Host-` cookie requires `Path=/` and no `Domain` attribute.

The frontend and API deployment topology must be documented.

If the frontend and API are truly cross-site and `SameSite=None` is necessary, add explicit cross-site cookie support and stronger CSRF controls.

Never configure wildcard CORS together with credentialed requests.

## 6.5 Required authentication functionality

- Account registration.
- Email verification.
- Login using email and password.
- Token refresh.
- Current-user retrieval.
- Current-session logout.
- Global logout.
- Session enumeration.
- Session revocation.
- Forgot password.
- Reset password.
- Password change.
- Password confirmation for sensitive actions.
- Suspended-account rejection.
- Rate limiting.
- Audit events.

### Authentication error handling

Public login and recovery operations must not reveal whether an email address is registered.

Use generic client-facing responses while retaining structured internal diagnostics without leaking secrets.

# 7. Authorization specification

## 7.1 RBAC

Use a permission-based implementation underneath role definitions.

A role is a collection of permissions.

A request is authorized only when the user has the required permission in the target organization.

Suggested decorator:

```
@RequirePermissions('members:invite')
```

However, decorators alone must not be the complete authorization system.

Application services must enforce sensitive policies independently.

## 7.2 Ownership policies

Ownership is evaluated in addition to RBAC.

Example:

```
canUpdateResource(
  actor: AuthenticatedActor,
  resource: Resource,
): boolean
```

The policy should consider:

- Organization membership.
- Organization status.
- Relevant permissions.
- Resource organization.
- Resource creator or owner.
- Resource state where applicable.

The example policy may allow:

- Owners and administrators with the update permission to update any resource in their organization.
- Members with the update permission to update only resources they created.
- Viewers to read but not modify resources.

These rules must be represented by central policy functions and tested.

## 7.3 Global authentication guard

Configure a global authentication guard, with explicit public-route exemptions.

Public endpoints include:

```
GET  /health/live
GET  /health/ready
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
```

Health endpoints are public only within the intended infrastructure exposure boundary.

Protect infrastructure diagnostics and sensitive administrative endpoints separately.

## 7.4 Authorization failure semantics

Use:

- `401 Unauthorized` for invalid or missing authentication.
- `403 Forbidden` for explicitly disallowed operations when resource visibility is permitted.
- `404 Not Found` when resource existence should not be disclosed across tenant boundaries.

Do not expose another organization's resource existence through different response messages or timing-sensitive lookup behavior where avoidable.

## 7.5 Platform administrators

Do not give platform staff unrestricted implicit access to every organization.

If a platform administrator role is introduced later, require distinct authorization checks, explicit tenant selection, access justification where appropriate, and additional audit events.

# 8. Organization management

## 8.1 Required capabilities

The starter must support:

- Create organization.
- List current user's organizations.
- View organization details.
- Update organization settings.
- List members.
- Invite members by email.
- List pending invitations.
- Revoke invitations.
- Accept invitations.
- Change member roles.
- Remove members.
- Leave organization.
- Transfer ownership.
- Suspend or archive organizations through explicitly authorized operations.

## 8.2 Initial organization creation

Registration and organization creation are independent operations.

A user can register without immediately creating an organization.

The backend must support the following onboarding scenarios:

```
New user
  -> Register
  -> Verify email
  -> Create organization
  -> Become OWNER
```

And:

```
Invited user
  -> Register or log in
  -> Verify invited email
  -> Accept invitation
  -> Join existing organization
```

Do not automatically create a personal organization unless a product-specific configuration explicitly enables it.

## 8.3 Organization switching

Organization switching should primarily be a frontend context decision.

Since organization IDs are part of tenant-scoped URLs, an authenticated user can switch organizations without requiring a new login session.

The backend must not rely on a mutable global active-organization variable.

If the application later needs an active-organization preference, store it as user preference rather than treating it as an authorization boundary.

# 9. REST API specification

## 9.1 API base path

All business and authentication endpoints use:

```
/api/v1
```

Health endpoints stay outside the versioned business API namespace.

## 9.2 Resource conventions

Use plural nouns.

Examples:

```
GET    /api/v1/organizations
POST   /api/v1/organizations

GET    /api/v1/organizations/:organizationId
PATCH  /api/v1/organizations/:organizationId

GET    /api/v1/organizations/:organizationId/members
POST   /api/v1/organizations/:organizationId/invitations

GET    /api/v1/organizations/:organizationId/resources
POST   /api/v1/organizations/:organizationId/resources

GET    /api/v1/organizations/:organizationId/resources/:resourceId
PATCH  /api/v1/organizations/:organizationId/resources/:resourceId
DELETE /api/v1/organizations/:organizationId/resources/:resourceId
```

### HTTP method conventions

| Method | Meaning                                   |
| ------ | ----------------------------------------- |
| GET    | Retrieve                                  |
| POST   | Create or perform a non-idempotent action |
| PUT    | Replace a resource                        |
| PATCH  | Partially update                          |
| DELETE | Delete or revoke                          |

Return `201 Created` for successful resource creation, with a `Location` header when appropriate.

Return `204 No Content` for successful deletion when no response body is needed.

## 9.3 Authentication endpoints

| Method | Endpoint                    |
| ------ | --------------------------- |
| POST   | `/auth/register`            |
| POST   | `/auth/login`               |
| POST   | `/auth/refresh`             |
| POST   | `/auth/logout`              |
| POST   | `/auth/logout-all`          |
| GET    | `/auth/me`                  |
| GET    | `/auth/sessions`            |
| DELETE | `/auth/sessions/:sessionId` |
| POST   | `/auth/verify-email`        |
| POST   | `/auth/resend-verification` |
| POST   | `/auth/forgot-password`     |
| POST   | `/auth/reset-password`      |
| POST   | `/auth/change-password`     |

All paths above have the `/api/v1` prefix.

## 9.4 User endpoints

```
GET   /api/v1/users/me
PATCH /api/v1/users/me
```

Keep `/auth/me` focused on identity and authentication context.

Use `/users/me` for user profile management.

Avoid general-purpose endpoints that expose arbitrary users without explicit authorization.

## 9.5 Organization and membership endpoints

```
POST   /api/v1/organizations
GET    /api/v1/organizations
GET    /api/v1/organizations/:organizationId
PATCH  /api/v1/organizations/:organizationId

GET    /api/v1/organizations/:organizationId/members
PATCH  /api/v1/organizations/:organizationId/members/:membershipId
DELETE /api/v1/organizations/:organizationId/members/:membershipId

POST   /api/v1/organizations/:organizationId/invitations
GET    /api/v1/organizations/:organizationId/invitations
DELETE /api/v1/organizations/:organizationId/invitations/:invitationId

POST   /api/v1/invitations/accept

POST   /api/v1/organizations/:organizationId/ownership-transfers
POST   /api/v1/organizations/:organizationId/leave
```

The agent must define concrete request and response DTOs, permissions, side effects, and status codes for each operation.

## 9.6 Standard successful responses

Use direct resource representations by default.

Example:

```
{
  "id": "b972c2d0-164d-4a74-bbda-84f12dbe0f3f",
  "name": "Example Organization",
  "slug": "example-organization",
  "status": "active",
  "createdAt": "2026-10-13T00:00:00.000Z"
}
```

Do not require redundant wrappers such as:

```
{
  "success": true,
  "data": {}
}
```

## 9.7 Pagination

Use cursor pagination for tenant-scoped resources where datasets may grow substantially.

Query parameters:

```
limit
cursor
sort
order
```

Example:

```
GET /api/v1/organizations/:organizationId/resources?limit=20
```

Response:

```
{
  "items": [],
  "pageInfo": {
    "hasNextPage": false,
    "nextCursor": null
  }
}
```

Default limit: 20.

Maximum limit: 100.

Cursors must be opaque to clients, bound to the expected query context, and validated to prevent invalid traversal or cross-tenant access.

For stable pagination, include a unique tie-breaker such as `(created_at, id)`.

Offset pagination may be offered separately for simple administration tables.

## 9.8 Filtering and sorting

Define an allowlist of searchable and sortable fields per endpoint.

Never interpolate untrusted field names into SQL.

Use Drizzle query construction and parameterized values.

The API must reject unsupported sort fields and invalid pagination parameters.

## 9.9 Error format

Use RFC 9457 Problem Details.

Response content type:

```
application/problem+json
```

Example:

```
{
  "type": "https://api.example.com/problems/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to perform this operation.",
  "code": "FORBIDDEN",
  "requestId": "req_01JABC"
}
```

For validation errors:

```
{
  "type": "https://api.example.com/problems/validation",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "requestId": "req_01JABC",
  "errors": [
    {
      "path": "email",
      "code": "invalid_format",
      "message": "Invalid email address"
    }
  ]
}
```

Minimum error codes:

```
VALIDATION_ERROR
UNAUTHENTICATED
INVALID_CREDENTIALS
TOKEN_EXPIRED
SESSION_REVOKED
FORBIDDEN
RESOURCE_NOT_FOUND
RESOURCE_CONFLICT
ORGANIZATION_ACCESS_DENIED
MEMBERSHIP_REQUIRED
INVITATION_EXPIRED
INVITATION_INVALID
RATE_LIMIT_EXCEEDED
INTERNAL_ERROR
SERVICE_UNAVAILABLE
```

Sanitize all unexpected exceptions. Never include stack traces or raw SQL errors in production responses.

## 9.10 Idempotency

Support idempotency keys for operations where duplicate requests could create incorrect state.

The initial reusable mechanism should support:

- `Idempotency-Key` request header.
- Organization and actor scoping.
- A request fingerprint.
- Duplicate detection.
- Atomic recording of completed operations.
- Configurable retention.
- Rejection of key reuse with a different request payload.

It is sufficient to apply this mechanism to selected critical endpoints rather than all POST requests.

# 10. Zod validation and OpenAPI

## 10.1 Schema-first DTO design

Use Zod as the source of truth for input and output validation.

Example:

```
import { z } from 'zod';

export const CreateOrganizationSchema = z.strictObject({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type CreateOrganizationInput =
  z.infer<typeof CreateOrganizationSchema>;
```

Use the selected Zod/NestJS integration to connect DTO validation to controllers and OpenAPI metadata.

Do not introduce `class-validator` alongside Zod.

## 10.2 Validation rules

- Validate body, path parameters, and query parameters.
- Reject unknown object properties for public write DTOs unless explicitly permitted.
- Define maximum string lengths.
- Validate UUIDs and enum values.
- Normalize string values where appropriate.
- Enforce request body size limits.
- Avoid exposing database entities directly as response DTOs.
- Define separate create, update, and response schemas.
- Avoid leaking internal fields during response serialization.

Runtime TypeScript types are not validation. Every external boundary must validate untrusted data.

## 10.3 OpenAPI generation

Generate an OpenAPI document from actual routes and shared Zod schemas.

Requirements:

- OpenAPI 3.1 target, subject to verified library support.
- Document every public endpoint.
- Document authorization requirements.
- Document JSON request bodies.
- Document success and error schemas.
- Define standard pagination schemas.
- Define bearer authentication.
- Define cookie refresh behavior.
- Include stable operation IDs.
- Use tags grouped by feature module.

If the chosen NestJS/Swagger/Zod integration cannot correctly generate OpenAPI 3.1, do not falsely label a 3.0 document as 3.1. Use a compatible documented version until the toolchain supports the desired output.

## 10.4 OpenAPI output

Build scripts should generate:

```
artifacts/openapi.json
artifacts/openapi.yaml
```

Expose interactive API documentation at:

```
/docs
```

Expose the machine-readable contract at:

```
/openapi.json
```

In production, documentation endpoints must be disabled or access-controlled by configuration.

The OpenAPI JSON should remain available as a CI artifact even when live production documentation is disabled.

## 10.5 Frontend integration

The generated OpenAPI contract must support creation of a typed TypeScript client for the React SPA.

Recommended client tooling:

- `openapi-typescript` for type generation.
- Orval when generated React Query integration is desired.

The backend must not require the frontend to manually duplicate API DTO definitions.

Add a contract validation step in CI to detect schema generation failures and breaking changes.

# 11. Application configuration

## 11.1 Environment validation

Validate environment configuration with Zod at application startup.

If required values are absent or malformed, fail startup with a clear error that does not expose secret values.

Example environment contract:

```
# Application
NODE_ENV=development
APP_NAME=nestjs-backend-starter
APP_HOST=0.0.0.0
APP_PORT=3000
PUBLIC_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://app:password@localhost:5432/app
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT_MS=5000

# Authentication
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=example-web-api
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
JWT_KEY_ID=development-key-1
ACCESS_TOKEN_TTL_SECONDS=600
REFRESH_TOKEN_IDLE_TTL_DAYS=14
REFRESH_TOKEN_MAX_TTL_DAYS=30

# Cookies
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_DOMAIN=

# Email
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@example.com
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=

# Security
CORS_ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY=false

# Observability
LOG_LEVEL=debug
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=
```

`.env.example` must use development-only placeholders and dummy credentials.

Actual secrets must never be committed.

## 11.2 Configuration requirements

- Separate development, test, staging, and production behavior.
- Validate URL formats and numeric ranges.
- Check key material at startup.
- Disallow development signing keys in production.
- Configure CORS through explicit allowlists.
- Support environment variable overrides.
- Avoid importing `process.env` directly throughout business modules.
- Inject typed configuration through a dedicated configuration provider.
- Fail closed when security-critical configuration is invalid.

## 11.3 Production secrets

Use Kubernetes-compatible secret delivery backed by an external secret manager, such as a managed cloud secrets service.

Do not store production credentials directly in Helm values.

The deployment specification must support rotation of database credentials, JWT signing keys, email credentials, and other provider secrets.

Secrets must be excluded from logs, crash reports, health endpoints, and diagnostic output.

# 12. Email delivery infrastructure

## 12.1 Provider interface

All email functionality must use an application-owned interface.

Example:

```
export interface EmailSender {
  send(input: SendEmailInput): Promise<EmailSendResult>;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSendResult {
  messageId?: string;
  accepted: boolean;
}
```

Use a NestJS injection token such as `EMAIL_SENDER`, since TypeScript interfaces do not exist at runtime.

## 12.2 Required implementations

Console adapter: For local development. Must redact or restrict sensitive token-bearing links to development-only output.

SMTP adapter: Production-capable adapter with authenticated transport, TLS validation, connection timeouts, and error handling.

Test adapter: Captures outgoing messages in memory for deterministic assertions.

Future integrations with managed providers must be possible without changing authentication services.

## 12.3 Email templates

Implement templates for:

```
verify-email
reset-password
organization-invitation
password-changed
security-session-revoked
```

Templates must use a consistent layout and support text and HTML versions.

All user-provided variables must be safely escaped in HTML templates.

## 12.4 Delivery reliability without a queue

Because background job infrastructure is deferred, do not add BullMQ or Redis.

However, avoid making security-sensitive database transactions depend on SMTP availability.

Use a small PostgreSQL transactional outbox for reliable email delivery.

Suggested `email_outbox` schema:

```
id
template
recipient
payload_json
status
attempt_count
next_attempt_at
created_at
sent_at
last_error
```

Required behavior:

1. Write the relevant business operation and outbox message in one transaction.
2. Commit the transaction.
3. Deliver messages outside the transaction.
4. Retry transient failures with bounded exponential backoff.
5. Record permanent failures and expose them for operational review.
6. Use lease/claim semantics so multiple dispatchers do not process the same item concurrently.
7. Ensure retries and provider handling tolerate at-least-once delivery.

Deploy an optional one-shot Kubernetes CronJob to dispatch pending messages at a documented interval.

This is intentionally not a general-purpose background job system. It is a minimal reliability mechanism for account verification, password recovery, and invitations.

If deferred delivery is unacceptable for a specific endpoint, explicitly define synchronous delivery behavior and its failure semantics.

# 13. Security requirements

## 13.1 Baseline security controls

Implement the following before production deployment:

| Control               | Requirement                                               |
| --------------------- | --------------------------------------------------------- |
| Password hashing      | Argon2id with documented parameter tuning                 |
| Access token security | Strict JWT validation and key rotation                    |
| Refresh tokens        | Hashing, rotation, replay detection, revocation           |
| HTTP headers          | Fastify-compatible Helmet configuration                   |
| CORS                  | Explicit origin allowlist                                 |
| CSRF                  | Protection for cookie-authorized state-changing endpoints |
| Rate limiting         | Global and endpoint-specific limits                       |
| Request validation    | Zod at external boundaries                                |
| SQL injection         | Parameterized Drizzle queries                             |
| Tenant isolation      | Membership checks and tenant-scoped repositories          |
| Password recovery     | Single-use expiring credentials                           |
| Secrets               | Externalized and protected                                |
| Logging               | Sensitive-field redaction                                 |
| Dependencies          | Vulnerability scanning                                    |
| Error handling        | Sanitized production responses                            |
| Supply chain          | Reproducible builds and image scanning                    |

## 13.2 Rate limiting

Configure separate throttling policies for:

```
General API requests
Login attempts
Registration
Password reset requests
Email verification resend
Refresh attempts
Invitation creation
```

For example, the initial configuration may use:

| Endpoint                  | Starting policy                            |
| ------------------------- | ------------------------------------------ |
| General authenticated API | 120 requests/minute per actor              |
| Login                     | 5 attempts/minute per IP/account dimension |
| Registration              | 3 attempts/hour per IP                     |
| Forgot password           | 3 requests/hour per account/IP             |
| Resend verification       | 3 requests/hour per account                |
| Refresh                   | 20 requests/minute per session/IP          |

These are configurable starting values, not universal security guarantees. Tune them through testing and observed traffic.

Because Kubernetes runs multiple application replicas, in-memory NestJS throttling alone cannot enforce globally consistent distributed limits.

Implement coarse edge-level throttling at the ingress or API gateway, and provide a documented extension point for distributed application-level rate limiting.

Do not assume a per-pod rate limit is a cluster-wide limit.

Account-based restrictions and login lockout behavior must not make it easy for attackers to deny legitimate users access.

## 13.3 CSRF protection

Even when access tokens are sent using bearer headers, refresh and logout endpoints can use browser cookies and require protection appropriate to their authentication behavior.

The starter must:

- Validate `Origin` for sensitive cookie-authenticated requests.
- Configure `SameSite` correctly.
- Require appropriate CSRF tokens or equivalent protections when the deployment topology requires them.
- Reject unsupported cross-origin requests.
- Verify that cookie scope is intentional.

## 13.4 Fastify proxy settings

The application will operate behind Kubernetes ingress.

Configure Fastify proxy trust explicitly.

Only trust forwarded headers from known reverse proxies or through a securely controlled ingress network path.

Never blindly trust client-provided `X-Forwarded-For` headers when deriving IP addresses for logging or rate limiting.

## 13.5 Password security

- Enforce a reasonable minimum password length.
- Permit passphrases and sufficiently long passwords.
- Avoid arbitrary complexity requirements that reduce usability.
- Prevent common or compromised passwords when an appropriate checking mechanism is available.
- Do not log raw passwords.
- Use timing-safe credential verification patterns.
- Rehash passwords when stored hashing parameters become outdated.
- Invalidate appropriate sessions after password changes.

## 13.6 Security-sensitive actions

Require recent authentication or password confirmation for especially sensitive operations such as:

- Changing a password.
- Changing an account email.
- Transferring organization ownership.
- Revoking all sessions.
- Managing privileged organization membership.

Document the freshness window and the authentication method used.

# 14. Logging, metrics, and observability

## 14.1 Structured logging

Use Pino with NestJS integration.

Every application log entry should support:

```
timestamp
level
service
environment
requestId
traceId
userId
organizationId
operation
durationMs
message
```

Fields may be absent when their context is unavailable.

Do not place raw personal data, credentials, or request bodies in logs indiscriminately.

## 14.2 Request correlation

Each request must receive or propagate a trusted request identifier.

Expose the identifier through:

```
X-Request-ID
```

Include it in:

- Request logs.
- Error logs.
- Problem Details responses.
- Relevant audit records.
- Distributed traces, when enabled.

## 14.3 Required metrics

Expose or export metrics for:

```
http_requests_total
http_request_duration_seconds
http_inflight_requests
database_pool_active_connections
database_pool_idle_connections
authentication_failures_total
refresh_token_reuse_total
email_delivery_failures_total
```

Use standard metric naming conventions and avoid unbounded label cardinality.

Do not include raw user IDs, organization IDs, tokens, or email addresses as Prometheus metric labels.

## 14.4 Distributed tracing

OpenTelemetry should be optional but supported through configuration.

Instrument:

- Incoming HTTP requests.
- PostgreSQL operations.
- Outbound email provider calls where instrumentation is available.

Avoid mandatory vendor-specific instrumentation in the base architecture.

## 14.5 Health endpoints

Implement:

```
GET /health/live
GET /health/ready
GET /health/startup
```

Behavior:

| Endpoint          | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `/health/live`    | Whether the application process is alive and capable of running |
| `/health/ready`   | Whether the application can accept traffic                      |
| `/health/startup` | Whether startup initialization has completed                    |

Readiness should check database connectivity with a short timeout.

Liveness should not fail merely because PostgreSQL is temporarily unavailable, as that can cause unnecessary restart storms.

During shutdown, readiness must fail before the process stops serving traffic.

NestJS Terminus supports health indicators and shutdown integration suitable for Kubernetes environments.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.nestjs.com&sz=32)

NestJS - A progressive Node.js framework

# 15. Testing specification

## 15.1 Testing categories

| Category         | Purpose                                       | Infrastructure                |
| ---------------- | --------------------------------------------- | ----------------------------- |
| Unit             | Pure domain and service behavior              | Mocks/fakes                   |
| Integration      | SQL queries, constraints, transactions        | Real PostgreSQL               |
| E2E              | Full HTTP functionality                       | NestJS + Fastify + PostgreSQL |
| Contract         | OpenAPI correctness                           | Generated schema              |
| Security         | Authentication, permissions, tenant isolation | E2E/integration               |
| Deployment smoke | Startup, health, migrations                   | Kubernetes staging            |

## 15.2 Unit tests

Minimum coverage:

- Password hashing and verification.
- JWT claim validation helpers.
- Refresh-token validation and rotation decisions.
- Permission resolution.
- Ownership policies.
- Zod validation schemas.
- Pagination utilities.
- Organization ownership rules.
- Email template rendering.
- Application error mapping.

Use dependency injection and test doubles for infrastructure boundaries.

## 15.3 Integration tests

Use Testcontainers with a real PostgreSQL version matching production's supported major version.

Verify:

- Migrations apply to an empty database.
- Unique and foreign-key constraints work.
- Transaction rollback works.
- Tenant-scoped queries cannot retrieve other organizations' records.
- Membership role changes persist correctly.
- Last-owner protection holds under concurrent requests.
- Refresh rotation is atomic.
- Duplicate invitation acceptance does not duplicate memberships.
- Outbox claims do not produce concurrent processing of the same message.

Avoid using SQLite as a substitute for PostgreSQL integration tests.

## 15.4 E2E tests

Use Fastify's injection mechanism or another Fastify-compatible HTTP testing approach.

Required test scenarios:

### Authentication

```
Register -> verify email -> login -> authenticated request
Login with invalid password
Login with disabled user
Refresh access token
Refresh token replay detection
Logout current session
Logout all sessions
Expired access token
Revoked session
Password recovery
Password change
```

### Multi-tenancy

```
User belongs to organization A and B
User belongs only to organization A
User requests organization B resource
User attempts organization B update
User uses valid UUID from another organization
User loses membership during active session
User attempts unauthorized role escalation
```

### Membership and invitations

```
Create organization
Invite existing user
Invite new user
Accept invitation
Accept expired invitation
Reuse invitation
Revoke invitation
Remove member
Demote owner
Attempt to remove last owner
Transfer organization ownership
```

### API behavior

```
Invalid request body
Unknown DTO property
Malformed UUID
Unsupported sort field
Invalid cursor
Pagination across duplicate timestamps
Uncaught application error
Database temporarily unavailable
```

## 15.5 Tenant isolation test matrix

Every tenant-owned business module must run a standardized authorization matrix.

| Scenario                                             | Expected                     |
| ---------------------------------------------------- | ---------------------------- |
| Member reads resource in own organization            | Allowed if permission exists |
| Member reads other tenant's resource                 | Denied, normally 404         |
| Member modifies other tenant's resource              | Denied                       |
| Viewer attempts write                                | Denied                       |
| Removed member uses old access token                 | Denied                       |
| Inactive organization receives write                 | Denied                       |
| Cross-tenant foreign key is supplied                 | Rejected                     |
| Invalid organization ID is supplied                  | Rejected                     |
| Valid resource ID with wrong organization ID         | Denied                       |
| User with multiple memberships switches organization | Correct permissions resolved |

This test suite should be reusable by future business modules.

## 15.6 Coverage gates

Initial CI thresholds:

```
Statements: 80%
Branches: 75%
Functions: 80%
Lines: 80%
```

Security-sensitive policies, cryptographic helpers, session state transitions, and tenancy controls should have more comprehensive behavioral coverage than generic utility code.

Coverage is a secondary metric; meaningful failure-path tests are mandatory.

# 16. Developer experience and scripts

## 16.1 Package scripts

Implement scripts providing these commands:

```
# Development
pnpm dev
pnpm build
pnpm start:prod

# Code quality
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm typecheck

# Testing
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:integration
pnpm test:e2e

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
pnpm db:seed

# API contract
pnpm openapi:generate
pnpm openapi:check

# Local infrastructure
pnpm infra:up
pnpm infra:down

# Deployment validation
pnpm helm:lint
```

Every script must be implemented and functional.

Avoid adding package scripts that are merely placeholders.

## 16.2 Local development

Use Docker Compose for local dependencies:

```
postgres
```

Add a local email capture service, such as Mailpit, where it improves development and testing.

The NestJS server may run outside Docker for fast hot reload.

Document these setup steps:

1. Install Node.js and pnpm.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL.
4. Generate or configure development-only signing keys.
5. Apply migrations.
6. Seed predefined roles and permissions.
7. Start the NestJS application.
8. Open the generated API documentation.
9. Run test suites.

## 16.3 Database seed strategy

Distinguish between:

Reference seeds: Required system roles, permissions, and static configuration. These must be idempotent and safe for controlled production use.

Development seeds: Example users, organizations, memberships, and test resources. These must never run automatically in production.

Do not create default production administrator credentials.

Provide a secure, auditable administrator bootstrap procedure if platform administration is implemented.

## 16.4 Documentation requirements

The repository README must contain:

- Project purpose.
- Architectural overview.
- Technology stack.
- Prerequisites.
- Installation instructions.
- Environment configuration.
- Development commands.
- Database workflow.
- Testing instructions.
- Authentication behavior.
- Multi-tenancy rules.
- API documentation location.
- Kubernetes deployment workflow.
- Security considerations.
- Troubleshooting guidance.

Each nontrivial design choice must be documented in the relevant `docs/` file.

# 17. Docker specification

## 17.1 Docker image

Create a multi-stage Dockerfile.

Build stages:

1. Dependency installation.
2. TypeScript compilation.
3. Production runtime image.

Requirements:

- Use a pinned supported Node.js runtime image or pinned digest.
- Use a non-root runtime user.
- Include only production runtime artifacts.
- Minimize image size.
- Do not include `.env` files or development credentials.
- Handle signals correctly.
- Expose the application port.
- Support a read-only root filesystem.
- Use a writable temporary directory only where required.
- Set a predictable working directory.
- Include image metadata or OCI labels.

## 17.2 Runtime behavior

The container must:

- Start using the compiled application.
- Not run database migrations automatically.
- Stop cleanly on `SIGTERM`.
- Close database connections.
- Report readiness as failed during shutdown.
- Avoid long-lived in-memory state required by other replicas.
- Avoid using local container files for persistent application data.

Use a deployment-specific Kubernetes Job for migrations, not an application startup hook.

# 18. Kubernetes architecture

## 18.1 Deployment model

Run the backend as a stateless Kubernetes Deployment.

Use managed PostgreSQL outside the application workload whenever possible.

Application replicas must not depend on shared filesystem storage or process-local sessions.

## 18.2 Required Kubernetes resources

The Helm chart must support:

| Resource            | Purpose                          |
| ------------------- | -------------------------------- |
| Deployment          | Application pods                 |
| Service             | Internal service discovery       |
| Ingress             | External HTTP access             |
| ConfigMap           | Non-secret configuration         |
| Secret references   | External secrets                 |
| ServiceAccount      | Workload identity                |
| HPA                 | Autoscaling                      |
| PodDisruptionBudget | Availability during disruption   |
| NetworkPolicy       | Restrict traffic                 |
| Job                 | Database migrations              |
| CronJob             | Optional email outbox dispatcher |

Do not create an in-cluster PostgreSQL instance as part of the production application chart.

## 18.3 Initial replica configuration

Production defaults:

```
replicaCount: 2

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    memory: 512Mi
```

These are initial values to be calibrated through profiling and load testing.

A CPU limit is optional and should be evaluated against latency-sensitive workloads.

## 18.4 Probes

Example:

```
startupProbe:
  httpGet:
    path: /health/startup
    port: http
  periodSeconds: 5
  failureThreshold: 24

readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  periodSeconds: 5
  timeoutSeconds: 2

livenessProbe:
  httpGet:
    path: /health/live
    port: http
  periodSeconds: 10
  timeoutSeconds: 2
```

Tune these thresholds after deployment testing.

## 18.5 Deployment strategy

Use rolling updates.

Suggested configuration:

```
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

Set a documented `terminationGracePeriodSeconds` sufficient to drain in-flight requests.

Readiness must become unhealthy before the process terminates.

## 18.6 Horizontal scaling

Use an HPA with conservative initial limits:

```
Minimum replicas: 2
Maximum replicas: 10
Target CPU utilization: 70%
```

Enable autoscaling only when metrics infrastructure is available.

Calculate database connection budgets across the maximum possible replica count.

For example, 10 replicas with a pool maximum of 10 connections can create up to 100 application database connections, excluding migrations and operational tools.

Do not select database pool size without considering HPA scaling.

## 18.7 Kubernetes security

Require:

- Non-root execution.
- Dropped Linux capabilities.
- `allowPrivilegeEscalation: false`.
- Runtime default seccomp profile.
- Read-only root filesystem where supported.
- Restricted ServiceAccount permissions.
- No automatically mounted service account token unless required.
- Network policies limiting ingress and egress.
- Secret injection through approved mechanisms.
- Resource requests and limits.
- Container vulnerability scanning.

## 18.8 Ingress and TLS

Use TLS for all production external traffic.

The chart must support:

- Configurable hostname.
- Ingress class.
- TLS secret reference.
- Request body limits.
- Trusted proxy configuration.
- Appropriate request timeouts.
- Application-specific CORS policy.
- Rate limiting at the edge.

Do not enable unrestricted ingress access to internal operational endpoints.

## 18.9 Database migration deployment

Migrations must run once per release, before incompatible application changes depend on them.

Required approach:

1. Build and publish a versioned image.
2. Apply compatible database migrations through a separate Kubernetes Job or release step.
3. Verify migration success.
4. Roll out application replicas.
5. Run deployment smoke tests.

Do not run migrations independently from every application pod.

Drizzle's NestJS documentation explicitly warns about concurrent migration attempts when multiple instances start simultaneously.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.nestjs.com&sz=32)

NestJS - A progressive Node.js framework

Use backward-compatible expand-and-contract migrations for rolling deployments.

A failed deployment must not automatically assume that rolling back the application also reverses database schema changes.

## 18.10 Backup and recovery

Before declaring production readiness, define:

- PostgreSQL backup schedule.
- Point-in-time recovery support.
- Retention period.
- Encryption and access controls.
- Restoration procedures.
- Database migration recovery strategy.
- Recovery Point Objective (RPO).
- Recovery Time Objective (RTO).

Backup existence alone is not sufficient. Perform and document a successful restore test.

# 19. CI/CD specification

## 19.1 Pull request pipeline

Create `.github/workflows/ci.yml`.

Required stages:

Checkout + pnpm install

Lint / Format / Typecheck

Unit tests

PostgreSQL integration + E2E tests

Migration validation + OpenAPI check

Production build + Helm lint

Image build + vulnerability scan

The pipeline must fail when any required quality gate fails.

## 19.2 Release pipeline

Create `.github/workflows/release.yml`.

Required capabilities:

- Build from an immutable commit.
- Run required quality checks.
- Produce a production image.
- Tag with Git commit SHA and release version.
- Publish to the configured container registry.
- Generate a software bill of materials where supported.
- Scan dependencies and container artifacts.
- Avoid storing long-lived cloud credentials in GitHub secrets when workload identity or OIDC federation is available.

Prefer immutable image digests for deployments.

## 19.3 Deployment pipeline

Create `.github/workflows/deploy.yml`.

Pipeline:

```
Select image digest
       |
       v
Validate Helm chart
       |
       v
Acquire deployment concurrency control
       |
       v
Run database migration Job
       |
       v
Verify migration success
       |
       v
Deploy application with Helm
       |
       v
Wait for healthy rollout
       |
       v
Run smoke tests
       |
       v
Record deployed version
```

Avoid concurrent production deployments.

Production deployment should require approval through an appropriate protected environment.

## 19.4 Environments

Minimum environments:

```
local
test
staging
production
```

Staging should approximate production networking, Kubernetes configuration, and database version.

Use different signing keys, credentials, databases, and secrets between staging and production.

## 19.5 Release safety

The deployment process must support:

- Releasing a specific version.
- Inspecting rollout status.
- Rolling back application images.
- Diagnosing migration failures.
- Recovering from failed health checks.
- Identifying the exact image digest running in production.

Do not automatically roll back schema migrations as part of normal application rollback.

# 20. Implementation roadmap for developer agent

Implement the starter in the following order.

Each phase must produce working, testable deliverables before the next phase begins.

01

Project bootstrap

NestJS, Fastify, TypeScript, pnpm, linting, configuration, local Docker Compose.

02

HTTP and API foundation

Zod validation, exception handling, Problem Details, request IDs, logging, versioning, OpenAPI.

03

Database infrastructure

PostgreSQL, Drizzle, migrations, schema, connection lifecycle, seed scripts, Testcontainers.

04

Identity and sessions

Registration, passwords, login, JWT, refresh rotation, logout, email verification, recovery.

05

Organizations and authorization

Organizations, memberships, invitations, roles, permissions, owner invariants, tenant isolation.

06

Email and auditing

Provider adapters, templates, transactional outbox, dispatcher, audit events.

07

Example resource module

Complete tenant-scoped CRUD demonstrating pagination, ownership, validation, and OpenAPI.

08

Security and observability

Headers, CORS, CSRF, rate limits, metrics, tracing hooks, security tests.

09

Production deployment

Docker, Helm, probes, scaling, migration Job, CI/CD, secret integration, smoke tests.

10

Verification and documentation

Full test suite, OpenAPI generation, deployment validation, threat review, README, final acceptance checklist.

## 20.1 Phase acceptance criteria

| Phase | Definition of done                                                                                |
| ----- | ------------------------------------------------------------------------------------------------- |
| 1     | Clean install, application starts, `pnpm build` and `pnpm typecheck` pass                         |
| 2     | Validation, errors, logging, and generated OpenAPI demonstrably work                              |
| 3     | Fresh PostgreSQL database migrates and seeds successfully; database integration tests pass        |
| 4     | Complete authentication lifecycle passes E2E tests, including replay and concurrent refresh cases |
| 5     | Organization management works; cross-tenant and last-owner tests pass                             |
| 6     | Emails are delivered through adapters; retries and audit events are tested                        |
| 7     | Demonstration resource supports complete authorized CRUD with pagination                          |
| 8     | Security controls and observability behave correctly with multiple application instances          |
| 9     | Helm deployment, migration Job, probes, rolling updates, and shutdown succeed in staging          |
| 10    | All release gates pass; security and operational documentation is complete                        |

# 21. Coding standards and developer-agent constraints

## 21.1 General coding conventions

The developer agent must:

- Use strict TypeScript throughout.
- Prefer explicit types at public module boundaries.
- Avoid `any` unless justified and documented.
- Use `unknown` for untrusted values until validated.
- Use dependency injection for infrastructure services.
- Keep controllers thin.
- Centralize authorization policies.
- Keep SQL queries parameterized.
- Avoid unnecessary generic abstractions.
- Avoid circular module dependencies.
- Use explicit transaction boundaries.
- Prefer readable implementations over clever abstractions.

## 21.2 Module conventions

A typical new business module should look like:

```
modules/projects/
├── dto/
│   ├── create-project.schema.ts
│   ├── update-project.schema.ts
│   ├── list-projects.schema.ts
│   └── project-response.schema.ts
├── policies/
│   └── project.policy.ts
├── projects.controller.ts
├── projects.service.ts
├── projects.repository.ts
└── projects.module.ts
```

For each module:

1. Define the database schema and indexes.
2. Define request and response schemas.
3. Implement a tenant-scoped repository.
4. Implement application services.
5. Implement authorization policies.
6. Implement REST controllers.
7. Add OpenAPI documentation.
8. Add unit and integration tests.
9. Add E2E authorization and tenant isolation tests.
10. Update documentation.

## 21.3 Database access conventions

Repository methods handling organization resources must receive explicit tenant
