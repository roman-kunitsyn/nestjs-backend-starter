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

The API binds to `APP_HOST` and `PORT`. The starter route is `GET /` and returns the plain text `Hello World!`. PostgreSQL is available on `POSTGRES_PORT` (5432 by default); database access, migrations, and seeds are added in later milestones. The Compose database uses a named volume and a development-only password. `pnpm infra:down` stops the service and keeps its data; remove the volume only when you intentionally want to discard the local database.

## Configuration

Copy `.env.example` to `.env`. At startup, Zod validates `NODE_ENV`, `APP_NAME`, `APP_HOST`, and `PORT`. Invalid values stop startup with field names and safe issue messages; configuration values are not included in the error. PostgreSQL variables are read by Compose. The example password and connection URL are local development values only and must never be used for a deployed environment.

## Quality commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

The E2E smoke test exercises the Nest application through Fastify's injection interface and does not require PostgreSQL. The unit test runner is Jest in native ESM mode. Type checking runs separately from Jest.

## Local database lifecycle

```bash
pnpm infra:up
docker compose ps
pnpm infra:down
```

Use `docker compose down -v` only when you intend to delete the local PostgreSQL volume. Database migration commands are introduced with the Drizzle infrastructure milestones.
