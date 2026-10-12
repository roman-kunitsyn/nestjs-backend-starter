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

Copy `.env.example` to `.env`. At startup, Zod validates application, API docs, database URL, and pool settings. Docs UI is enabled by default outside production and disabled by default in production; set `API_DOCS_ENABLED=true` only when interactive docs are intended to be public. Raw OpenAPI JSON/YAML endpoints remain available for clients and deployment checks. Invalid values stop startup with field names and safe issue messages; configuration values are not included in the error. PostgreSQL variables are read by Compose. The example password and connection URL are local development values only and must never be used for a deployed environment.

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

The E2E smoke test exercises the Nest application through Fastify's injection interface and does not require PostgreSQL. The unit test runner is Jest in native ESM mode. Type checking runs separately from Jest.

`pnpm openapi:generate` builds the application and writes `artifacts/openapi.json` and `artifacts/openapi.yaml`. `pnpm openapi:check` rebuilds the document and fails if the committed artifacts are stale or do not satisfy the OpenAPI 3.1 route/operation checks.

## Local database lifecycle

```bash
pnpm infra:up
docker compose ps
pnpm infra:down
```

Use `docker compose down -v` only when you intend to delete the local PostgreSQL volume. Run database migrations explicitly with `pnpm db:migrate`; application startup never migrates the database. See [Migrations](migrations.md) for the schema workflow.
