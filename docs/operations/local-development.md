# Local development

## Requirements

- Node.js 24 LTS.
- Corepack and pnpm 12.11.2 (the repository pins its package manager).
- Docker with the Compose plugin.

## First run

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm infra:up
pnpm start:dev
```

The API binds to `APP_HOST` and `PORT`. The starter route is `GET /api/v1` and returns the plain text `Hello World!`. Interactive Swagger UI is available at `/docs`; the JSON and YAML contracts are served at `/openapi.json` and `/openapi.yaml`. PostgreSQL is available on `POSTGRES_PORT` (5432 by default). The application uses `DATABASE_URL` and a bounded pool configured by `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_SECONDS`, and `DB_IDLE_TIMEOUT_SECONDS`. The Compose database uses a named volume and a development-only password. `pnpm infra:down` stops the service and keeps its data; remove the volume only when you intentionally want to discard the local database.

## Configuration

Copy `.env.example` to `.env`. At startup, Zod validates application, API docs, database URL, pool settings, resource cursor signing secret, and idempotency result retention. Keep `RESOURCE_CURSOR_SECRET` stable and identical across replicas; production requires at least 43 characters of random base64url data. `RESOURCE_IDEMPOTENCY_RETENTION_HOURS` defaults to 24 and accepts 1–720 hours. Docs UI is enabled by default outside production and disabled by default in production; set `API_DOCS_ENABLED=true` only when interactive docs are intended to be public. Raw OpenAPI JSON/YAML endpoints remain available for clients and deployment checks. Invalid values stop startup with field names and safe issue messages; configuration values are not included in the error. PostgreSQL variables are read by Compose. The example password, cursor secret, and connection URL are local development values only and must never be used for a deployed environment.

## Quality commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm openapi:generate
pnpm openapi:check
```

The E2E suite exercises the Nest application through Fastify's injection interface against PostgreSQL 18 Testcontainers and requires Docker. The unit test runner is Jest in native ESM mode. Type checking runs separately from Jest.

`pnpm openapi:generate` builds the application and writes `artifacts/openapi.json` and `artifacts/openapi.yaml`. `pnpm openapi:check` rebuilds the document and fails if the committed artifacts are stale or do not satisfy the OpenAPI 3.1 route/operation checks.

## Local database lifecycle

```bash
pnpm infra:up
docker compose ps
pnpm infra:down
```

Use `docker compose down -v` only when you intend to delete the local PostgreSQL volume. Run database migrations explicitly with `pnpm db:migrate`; application startup never migrates the database. See [Migrations](migrations.md) for the schema workflow.

## Production image

Build the multi-stage production image with the pinned Node 24 patch release and the committed pnpm lockfile:

```bash
pnpm image:build
```

The runtime stage contains `dist`, `package.json`, and production dependencies only. It runs as the unprivileged `node` user and starts `node dist/main.js`; it does not run migrations. Supply production configuration through your deployment's secret mechanism. Required production JWT, refresh, cursor, database, and SMTP settings are validated at startup. Never bake an env file or credentials into the image.

For a local container smoke check, start the disposable database and run the helper. It generates temporary production-format signing secrets in memory, binds an ephemeral localhost port, starts the container with `--read-only` and a small `/tmp` tmpfs, verifies readiness and the production-only runtime contents, and checks that SIGTERM exits cleanly. It never writes test secrets to disk. Set `IMAGE_SMOKE_DATABASE_URL` to override the default Docker Desktop host connection.

```bash
pnpm infra:up
pnpm image:smoke
pnpm infra:down
```

Inspect the image identity and runtime user with `docker image inspect nestjs-backend-starter:local --format '{{.Config.User}} {{json .Config.Labels}}'`. `pnpm image:build` supplies the UTC build time, Git revision (marked `-dirty` when tracked files differ from `HEAD`), and package version as OCI metadata; release automation can override these build arguments when building from a tagged source. Scan the built image using `pnpm image:scan`; this command requires Trivy installed on the build host and fails on HIGH or CRITICAL findings.
