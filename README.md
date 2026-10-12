# nestjs-backend-starter

**Production-ready NestJS backend starter with TypeScript, Fastify, PostgreSQL, Drizzle ORM, Zod, JWT authentication, organization-based multi-tenancy, and Kubernetes deployment.**

A modular, secure, and extensible foundation for building REST APIs for SaaS platforms, consumer applications, admin dashboards, and mobile backends.

> **Project status:** Starter template specification. Features described in this README represent the intended implementation and must be verified before marking the project production-ready.

## Overview

`nestjs-backend-starter` provides the infrastructure and architectural conventions needed to start implementing business logic without repeatedly rebuilding authentication, authorization, database access, multi-tenancy, API validation, security, logging, testing, and deployment pipelines.

The project follows a **modular monolith** architecture with clear separation between application modules, shared infrastructure, and cross-cutting concerns.

### Design principles

- **Production-first:** Security, testing, observability, and deployment are core requirements.
- **REST-first:** Predictable resource-oriented APIs documented using OpenAPI.
- **Type-safe:** Strict TypeScript, Drizzle ORM, and Zod validation.
- **Secure by default:** Authentication, authorization, and tenant isolation are enforced on the backend.
- **Multi-tenant:** Organization-based access with roles, permissions, and resource ownership.
- **Modular:** Independent business modules with explicit dependencies.
- **Cloud-native:** Stateless application instances designed for Kubernetes.
- **Developer-friendly:** Consistent conventions, local infrastructure, automated testing, and CI/CD.
- **Pragmatic:** Avoid unnecessary microservices, excessive abstractions, and premature infrastructure complexity.

## Technology stack

| Category             | Technology                                  |
| -------------------- | ------------------------------------------- |
| Runtime              | Node.js 24 LTS                              |
| Language             | TypeScript (strict mode)                    |
| Framework            | NestJS                                      |
| HTTP adapter         | Fastify                                     |
| API                  | REST                                        |
| API specification    | OpenAPI                                     |
| Database             | PostgreSQL                                  |
| ORM                  | Drizzle ORM                                 |
| Migrations           | Drizzle Kit                                 |
| Validation           | Zod                                         |
| Authentication       | JWT access tokens + rotating refresh tokens |
| Password hashing     | Argon2id                                    |
| Authorization        | RBAC + resource ownership policies          |
| Multi-tenancy        | Organization-based, shared schema           |
| Logging              | Pino                                        |
| Health checks        | NestJS Terminus                             |
| Metrics and tracing  | OpenTelemetry-compatible                    |
| Testing              | Jest, Fastify injection, Testcontainers     |
| Package manager      | pnpm                                        |
| Local infrastructure | Docker Compose                              |
| Containerization     | Docker                                      |
| Orchestration        | Kubernetes                                  |
| Deployment packaging | Helm                                        |
| CI/CD                | GitHub Actions                              |

Dependency versions are pinned in `pnpm-lock.yaml`.

## Features

### API foundation

- RESTful API with `/api/v1` prefix.
- URI-based API versioning.
- Zod request and response schemas.
- Automatic OpenAPI documentation generation.
- Standardized errors using RFC 9457 Problem Details.
- Cursor-based pagination.
- Filtering and sorting conventions.
- Request ID generation and propagation.
- Fastify security headers and CORS configuration.
- Configurable rate limiting.
- Typed environment configuration.
- Graceful application shutdown.

### Authentication

- Email and password registration.
- Email verification.
- JWT access tokens.
- Opaque rotating refresh tokens.
- Database-backed sessions.
- Multiple device sessions.
- Session enumeration and revocation.
- Logout and logout-all.
- Password reset and password change.
- Refresh-token replay detection.
- Password hashing with Argon2id.
- Authentication rate limiting.
- Secure HttpOnly refresh-token cookies.

### Authorization

- Role-based access control (RBAC).
- Permission-based policies.
- Organization membership validation.
- Resource ownership policies.
- Reusable authorization guards and decorators.
- Deny-by-default authorization.
- Protection against cross-organization access.
- Explicit organization ownership rules.

Default organization roles:

| Role     | Description                                        |
| -------- | -------------------------------------------------- |
| `OWNER`  | Organization ownership and critical administration |
| `ADMIN`  | Organization management                            |
| `MEMBER` | Standard organization member                       |
| `VIEWER` | Read-only access                                   |

Permissions use names such as `members:invite`, `organization:update`, and `resources:read`.

### Multi-tenancy

The application uses a **shared PostgreSQL database and schema**, with tenant-owned resources associated with organizations.

- Users can belong to multiple organizations.
- Memberships carry organization-specific roles.
- Organization IDs identify tenant context.
- Every tenant-owned resource includes `organization_id`.
- Tenant-scoped queries require organization context.
- Membership and authorization checks are enforced server-side.
- Cross-organization resource references are prohibited.
- Organization invitations and ownership transfers are supported.

An authenticated user does not automatically have access to every organization.

### Email

- Injectable email provider interface.
- Console adapter for development.
- SMTP adapter for production.
- Test adapter for automated tests.
- Reusable HTML and text templates.
- Verification, recovery, invitation, and security notifications.
- PostgreSQL transactional email outbox.
- Retry and failure handling without requiring Redis or a general-purpose queue.

### Operations and deployment

- Structured JSON logging with Pino.
- Sensitive-data redaction.
- Health and readiness endpoints.
- Metrics and optional distributed tracing.
- Multi-stage production Docker image.
- Kubernetes Deployment and Service.
- Ingress and TLS configuration.
- Kubernetes startup, readiness, and liveness probes.
- Horizontal Pod Autoscaler support.
- Pod disruption and network policies.
- Separate database migration Job.
- Helm charts for staging and production.
- GitHub Actions for CI, release, and deployment.

## Architecture

```text
                    Client Applications
                React SPA / Mobile / Admin
                            |
                            v
                  Kubernetes Ingress
                            |
                            v
                    NestJS + Fastify
                            |
              REST Controllers / Zod
                            |
              Authentication / RBAC
                            |
                 Application Services
                            |
                  Policies / Repositories
                            |
                   Drizzle ORM
                            |
                       PostgreSQL
```

The application is designed as a modular monolith.

Each feature module owns its controllers, application services, authorization policies, and database-access logic.

Shared infrastructure provides database connections, email delivery, logging, configuration, cryptography, and observability.

Business logic should not directly depend on HTTP transports or external service providers.

## Project structure

```text
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
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── errors/
│   │   ├── pagination/
│   │   └── validation/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── schema/
│   │   │   ├── seeds/
│   │   │   ├── database.module.ts
│   │   │   └── database.provider.ts
│   │   ├── cryptography/
│   │   ├── email/
│   │   ├── logging/
│   │   ├── telemetry/
│   │   └── time/
│   │
│   ├── modules/
│   │   ├── auth/
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
│
├── drizzle/
│   └── migrations/
│
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── factories/
│   ├── fixtures/
│   └── helpers/
│
├── deploy/
│   └── helm/backend/
│
├── scripts/
├── docs/
├── .github/workflows/
│
├── .env.example
├── compose.yaml
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

For complete architecture decisions, see [docs/architecture/overview.md](docs/architecture/overview.md).

## Getting started

### Prerequisites

Install:

- Node.js 24 LTS.
- pnpm via Corepack.
- Docker and Docker Compose.
- Git.

For Kubernetes deployment, also install `kubectl`, Helm, and access to a configured Kubernetes cluster.

### 1. Clone the repository

```bash
git clone <repository-url>
cd nestjs-backend-starter
```

Replace `<repository-url>` with the actual repository address.

### 2. Install dependencies

```bash
corepack enable
pnpm install --frozen-lockfile
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

`.env.example` contains local-only PostgreSQL credentials and the application defaults. Startup currently validates `NODE_ENV`, `APP_NAME`, `APP_HOST`, and `PORT`; later milestones add feature-specific settings and validation. Do not use the example database password outside local development.

### 4. Start local infrastructure

```bash
pnpm infra:up
```

This starts the local PostgreSQL service configured in `compose.yaml`. The app does not connect to the database yet; Drizzle and migration support are introduced in later milestones.

### 5. Start the development server

```bash
pnpm start:dev
```

The current smoke endpoint is `GET http://127.0.0.1:3000/` and returns `Hello World!`.

For the complete current setup, see [Local development](docs/operations/local-development.md).

The following API and health URLs are planned and are not available in this bootstrap milestone:

| Resource          | URL                                    |
| ----------------- | -------------------------------------- |
| REST API          | `http://localhost:3000/api/v1`         |
| API documentation | `http://localhost:3000/docs`           |
| OpenAPI document  | `http://localhost:3000/openapi.json`   |
| Liveness          | `http://localhost:3000/health/live`    |
| Readiness         | `http://localhost:3000/health/ready`   |
| Startup           | `http://localhost:3000/health/startup` |

## Environment configuration

The bootstrap currently validates `NODE_ENV`, `APP_NAME`, `APP_HOST`, and `PORT` with Zod. Database, authentication, email, and observability settings will be added with their implementation milestones.

Never commit `.env` files or production credentials.

In Kubernetes, production secrets should come from an approved secret-management integration.

## API conventions

### Base URL

All versioned endpoints use:

```text
/api/v1
```

### Resource naming

Use plural nouns and standard HTTP methods.

```http
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:organizationId
PATCH  /api/v1/organizations/:organizationId
```

### Successful responses

Return resource representations directly.

Example:

```json
{
  "id": "b972c2d0-164d-4a74-bbda-84f12dbe0f3f",
  "name": "Example Organization",
  "slug": "example-organization",
  "status": "active"
}
```

### Error responses

Errors follow RFC 9457 Problem Details.

```json
{
  "type": "https://api.example.com/problems/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to perform this operation.",
  "code": "FORBIDDEN",
  "requestId": "req_01JABC"
}
```

Errors use the `application/problem+json` media type.

### Pagination

Collection endpoints support cursor pagination where appropriate.

```http
GET /api/v1/organizations/:organizationId/resources?limit=20
```

Example response:

```json
{
  "items": [],
  "pageInfo": {
    "hasNextPage": false,
    "nextCursor": null
  }
}
```

Default page size: 20. Maximum page size: 100.

### API documentation

OpenAPI is generated from NestJS route definitions and Zod schemas.

```bash
pnpm openapi:generate
pnpm openapi:check
```

The generated contract can be consumed by frontend tooling such as `openapi-typescript` or Orval to create typed API clients.

## Authentication

The project uses short-lived access tokens and rotating refresh sessions.

### Access tokens

- JWT format.
- Asymmetric signature.
- Short lifetime (10 minutes by default).
- Sent through the `Authorization` header.
- Intended to be kept in frontend memory rather than browser localStorage.

Example:

```http
Authorization: Bearer <access-token>
```

### Refresh tokens

- Cryptographically random opaque tokens.
- Stored as hashes in PostgreSQL.
- Rotated after successful refresh.
- Associated with revocable sessions.
- Sent through secure HttpOnly cookies.
- Protected against replay.
- Subject to idle and absolute expiration.

### Authentication endpoints

All paths below use the `/api/v1` prefix.

| Method | Endpoint                    | Description                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/auth/register`            | Create account                 |
| POST   | `/auth/login`               | Authenticate                   |
| POST   | `/auth/refresh`             | Refresh session                |
| POST   | `/auth/logout`              | Revoke current session         |
| POST   | `/auth/logout-all`          | Revoke all sessions            |
| GET    | `/auth/me`                  | Current authenticated identity |
| GET    | `/auth/sessions`            | List sessions                  |
| DELETE | `/auth/sessions/:sessionId` | Revoke session                 |
| POST   | `/auth/verify-email`        | Verify email                   |
| POST   | `/auth/resend-verification` | Resend verification            |
| POST   | `/auth/forgot-password`     | Request password reset         |
| POST   | `/auth/reset-password`      | Complete password reset        |
| POST   | `/auth/change-password`     | Change password                |

### Browser integration

A typical SPA authentication flow:

1. Submit credentials to `/auth/login`.
2. Receive an access token and secure refresh cookie.
3. Keep the access token in memory.
4. Attach the access token to authenticated API requests.
5. Refresh the session when appropriate.
6. Retry eligible requests after a successful refresh.
7. Clear local authentication state after logout or unrecoverable session expiry.

The backend must enforce appropriate CORS, cookie, origin, and CSRF rules for the deployment topology.

See `docs/architecture/authentication.md`.

## Organizations and multi-tenancy

A user may belong to multiple organizations with different roles.

Example:

```text
User A
├── Organization Alpha
│   └── Role: OWNER
└── Organization Beta
    └── Role: MEMBER
```

Tenant resources use explicit organization-scoped URLs:

```http
GET /api/v1/organizations/:organizationId/resources
```

The backend verifies:

1. The user's authentication.
2. Organization existence and status.
3. Active organization membership.
4. Required permissions.
5. Resource ownership policies, where applicable.
6. Tenant-scoped database conditions.

**Never rely on a client-provided organization ID alone to authorize access.**

### Organization endpoints

```http
GET    /api/v1/organizations
POST   /api/v1/organizations

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

Every active organization must retain at least one active owner.

See `docs/architecture/multi-tenancy.md` and `docs/architecture/authorization.md`.

## Database

The application uses PostgreSQL with Drizzle ORM.

### Core tables

| Table                       | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `users`                     | Global identities                        |
| `organizations`             | Tenant organizations                     |
| `organization_memberships`  | User memberships                         |
| `roles`                     | Organization role definitions            |
| `permissions`               | Individual permissions                   |
| `role_permissions`          | Role-to-permission assignments           |
| `membership_roles`          | Membership role assignments              |
| `auth_sessions`             | Revocable authentication sessions        |
| `refresh_token_history`     | Refresh-token rotation history           |
| `email_verification_tokens` | Email verification                       |
| `password_reset_tokens`     | Password recovery                        |
| `organization_invitations`  | Organization invitation lifecycle        |
| `audit_events`              | Security and administrative audit events |
| `email_outbox`              | Reliable email delivery                  |
| `example_resources`         | Demonstration tenant-scoped CRUD         |

### Database conventions

- UUID primary keys.
- UTC timestamps stored as `timestamptz`.
- Snake_case SQL columns.
- CamelCase TypeScript properties.
- Foreign keys and unique constraints.
- Tenant-scoped compound indexes.
- Explicit transactions.
- Version-controlled migrations.
- No automatic schema synchronization in production.

### Database commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
pnpm db:seed
```

Do not run schema-destructive development commands against production databases.

Production migrations execute through a dedicated deployment step, not during application startup.

See `docs/architecture/database.md`.

## Creating business modules

All business modules follow feature-first organization.

Example:

```text
src/modules/projects/
├── dto/
│   ├── create-project.schema.ts
│   ├── update-project.schema.ts
│   └── project-response.schema.ts
├── policies/
│   └── project.policy.ts
├── projects.controller.ts
├── projects.service.ts
├── projects.repository.ts
└── projects.module.ts
```

### Recommended workflow

1. Define the database table in the Drizzle schema.
2. Generate the database migration.
3. Define Zod request and response schemas.
4. Implement tenant-scoped repository operations.
5. Implement application services.
6. Define required permissions and ownership policies.
7. Implement REST endpoints.
8. Add OpenAPI descriptions.
9. Add unit and integration tests.
10. Add tenant-isolation E2E tests.

### Tenant-safe repository access

Prefer:

```ts
findById(
  organizationId: string,
  resourceId: string,
): Promise<Resource | null>
```

Avoid tenant-owned resource methods that retrieve records using only their resource ID.

Every update and delete must also enforce tenant scope.

## Testing

The project uses Jest with real PostgreSQL integration tests.

### Unit tests

```bash
pnpm test
```

### Integration tests

```bash
pnpm test:integration
```

Integration tests use Testcontainers to verify actual PostgreSQL behavior, constraints, and transactions.

### End-to-end tests

```bash
pnpm test:e2e
```

E2E tests cover:

- Authentication.
- Session rotation.
- Password recovery.
- Authorization.
- Organization management.
- Invitations.
- Tenant isolation.
- REST validation.
- Error behavior.

### Coverage

```bash
pnpm test:coverage
```

Initial coverage targets:

| Metric     | Target |
| ---------- | ------ |
| Statements | 80%    |
| Branches   | 75%    |
| Functions  | 80%    |
| Lines      | 80%    |

Security-critical components must have comprehensive behavioral testing regardless of aggregate coverage.

## Logging and observability

Structured logging uses Pino.

Typical log fields:

```json
{
  "level": "info",
  "service": "nestjs-backend-starter",
  "requestId": "req_01JABC",
  "operation": "organizations.create",
  "durationMs": 21,
  "message": "Request completed"
}
```

Sensitive data is redacted.

### Health endpoints

```http
GET /health/live
GET /health/ready
GET /health/startup
```

### Observability capabilities

- Request correlation IDs.
- Structured application logs.
- HTTP latency and error metrics.
- Database pool metrics.
- Authentication security metrics.
- Email delivery failure metrics.
- Optional OpenTelemetry tracing.

Production telemetry configuration depends on the chosen infrastructure provider.

## Security

The starter must follow secure development defaults.

Core requirements:

- Strict input validation.
- Argon2id password hashing.
- JWT signing-key protection and rotation.
- Refresh-token rotation and reuse detection.
- Rate limiting.
- CORS allowlists.
- Appropriate CSRF protection.
- Security headers.
- SQL parameterization.
- Server-enforced authorization.
- Organization-level data isolation.
- Sanitized error responses.
- Sensitive-data log redaction.
- Dependency and container image scanning.
- Secure secret delivery.
- Security-related audit logging.

Never expose database credentials, JWT private keys, refresh tokens, password hashes, or internal stack traces.

See `docs/architecture/security.md`.

## Docker

Build the application image:

```bash
docker build -t nestjs-backend-starter:local .
```

Run using the validated runtime environment configuration:

```bash
docker run --rm \
  --env-file .env \
  -p 3000:3000 \
  nestjs-backend-starter:local
```

When PostgreSQL runs in Docker Compose, ensure the application container can resolve and connect to its database host. `localhost` inside a container is not the host machine.

The production Dockerfile must use a multi-stage build, a non-root user, minimal runtime dependencies, and graceful shutdown handling.

## Kubernetes deployment

The project includes a Helm chart under:

```text
deploy/helm/backend/
```

### Validate the chart

```bash
helm lint ./deploy/helm/backend
```

### Deploy to staging

```bash
helm upgrade --install nestjs-backend-starter \
  ./deploy/helm/backend \
  --namespace staging \
  --create-namespace \
  -f ./deploy/helm/backend/values-staging.yaml
```

This command assumes the cluster, ingress controller, container registry access, secrets, database, and required migrations have been provisioned.

### Deploy to production

Production releases must run through the deployment pipeline after approval and migration validation.

The pipeline must:

1. Select an immutable image digest.
2. Validate the Helm chart.
3. Execute the migration Job.
4. Verify migration success.
5. Deploy application replicas.
6. Check rollout readiness.
7. Execute smoke tests.
8. Record the deployed version.

Do not run database migrations independently in each application pod.

### Kubernetes requirements

- At least two application replicas in production by default.
- Startup, readiness, and liveness probes.
- Rolling updates.
- Graceful termination.
- Horizontal scaling support.
- Resource requests and limits.
- Network policies.
- Restricted ServiceAccount permissions.
- External secrets integration.
- TLS-enabled ingress.
- Managed PostgreSQL.

See `docs/architecture/deployment.md`.

## CI/CD

GitHub Actions workflows:

```text
.github/workflows/
├── ci.yml
├── release.yml
└── deploy.yml
```

### Continuous integration

Pull requests must pass:

- Dependency installation.
- Lint and formatting checks.
- TypeScript checking.
- Unit tests.
- PostgreSQL integration tests.
- E2E tests.
- Migration validation.
- OpenAPI contract validation.
- Production build.
- Helm validation.
- Dependency and container security checks.

### Continuous deployment

Releases use immutable images and controlled Kubernetes deployments.

Production releases require deployment permissions and environment approval.

Database migrations must be compatible with rolling application updates.

## Development commands

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `pnpm start:dev`        | Start the Fastify-backed Nest application |
| `pnpm build`            | Build application                |
| `pnpm start:prod`       | Start compiled application       |
| `pnpm lint`             | Run ESLint                       |
| `pnpm lint:fix`         | Fix supported lint issues        |
| `pnpm format`           | Format code                      |
| `pnpm format:check`     | Check formatting                 |
| `pnpm typecheck`        | Check TypeScript types           |
| `pnpm test`             | Unit tests                       |
| `pnpm test:e2e`         | End-to-end tests                 |
| `pnpm infra:up`         | Start local infrastructure       |
| `pnpm infra:down`       | Stop local infrastructure        |

Database migrations and other planned scripts will be added with their milestones. The project-status notice remains until final acceptance verifies the full command set.

## Documentation

| Document                  | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `docs/architecture/overview.md` | System architecture and module boundaries |
| `docs/architecture/api-conventions.md` | REST conventions, errors, and pagination |
| `docs/architecture/authentication.md` | Authentication and session lifecycle |
| `docs/architecture/authorization.md` | RBAC and ownership policies |
| `docs/architecture/multi-tenancy.md` | Organization-based tenant isolation |
| `docs/architecture/database.md` | Drizzle, schemas, migrations, transactions |
| `docs/architecture/deployment.md` | Docker, Kubernetes, Helm, CI/CD |
| `docs/architecture/security.md` | Security requirements and threat considerations |
| `docs/operations/local-development.md` | Current local development setup |

The complete source specification is preserved at `docs/reference/nestjs-backend-starter-architecture-2026.md`.

## Planned extensions

The core intentionally excludes features that should be introduced when product requirements justify them.

Potential extensions:

- Social login and OpenID Connect.
- Passkeys and multi-factor authentication.
- Enterprise SSO.
- Organization billing and subscriptions.
- S3-compatible file storage.
- Distributed caching.
- Background job infrastructure.
- API key authentication.
- WebSockets or Server-Sent Events.
- PostgreSQL Row Level Security.
- Complex attribute-based authorization.
- GraphQL endpoints.
- Advanced full-text search.
- Microservice extraction.

The architectural boundaries should allow these capabilities to be introduced without major rewrites.

## Production readiness

Before deploying a real product, verify:

- [ ] All required authentication flows are implemented and tested.
- [ ] Refresh-token rotation and session revocation are secure.
- [ ] Organization membership and authorization checks are enforced.
- [ ] Cross-tenant isolation tests pass.
- [ ] Database migrations and transaction constraints are verified.
- [ ] Secrets are managed securely.
- [ ] Email verification and password recovery work.
- [ ] Rate limiting and CSRF protections are configured.
- [ ] Sensitive logging fields are redacted.
- [ ] OpenAPI matches actual endpoint behavior.
- [ ] Unit, integration, and E2E tests pass.
- [ ] Docker image builds securely.
- [ ] Kubernetes deployment and probes work.
- [ ] Migration Job runs separately from application startup.
- [ ] Rolling deployments and graceful shutdown are verified.
- [ ] Database backups and restoration have been tested.
- [ ] CI/CD and vulnerability scanning pass.
- [ ] Operational monitoring and incident procedures are documented.

**Production-ready is a verified state, not a description of an untested starter template.**

## Contributing

Contributions should follow the project's architectural conventions.

Before submitting changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Changes to public API contracts must update OpenAPI schemas and associated tests.

Changes to tenant-scoped modules must include authorization and cross-tenant isolation tests.

Database schema changes must include versioned migrations.

Avoid introducing new infrastructure dependencies without documenting the operational need and tradeoffs.

## License

License to be determined by the repository owner.

---

**nestjs-backend-starter** — A secure, type-safe, modular NestJS foundation for building production REST APIs.
