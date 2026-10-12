# Database migrations

## Configuration

Set `DATABASE_URL` to the PostgreSQL database that should be managed. The application creates one `postgres.js` client and typed Drizzle instance for its lifetime. `DB_POOL_MAX` defaults to 10 and must be budgeted across all replicas and operational clients. Connect and idle timeouts are controlled by `DB_CONNECT_TIMEOUT_SECONDS` and `DB_IDLE_TIMEOUT_SECONDS`. Prepared statements are disabled to support transaction-pooling proxies.

## Workflow

```bash
pnpm infra:up
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:seed:reference
```

`pnpm db:generate` creates a versioned application migration from Drizzle schemas under `src/infrastructure/database/schema`. Review generated SQL before applying it. Before M009 adds those schemas, this command has no application schema to generate. M008 verifies generation and application separately with `pnpm db:generate:fixture`, which uses a probe schema under `test/fixtures/database`; its generated output defaults to `test/fixtures/migrations`, so remove that generated test output after a manual run. The automated Testcontainers test always directs output to a temporary directory and applies it to a fresh PostgreSQL instance. `pnpm db:check` validates migration ordering and metadata consistency. `pnpm db:migrate` applies pending application migrations to the explicitly configured database and closes its one-connection client on completion. The application never runs migrations on startup; deploy them once as a controlled release step before rolling out compatible application replicas.

`pnpm db:seed:reference` idempotently inserts the system organization roles, permissions, and role-permission mappings. Run it after migrations. `pnpm db:seed:dev` additionally creates a verified local developer account and local organization; it refuses to run with `NODE_ENV=production`. The fixture account has no password hash and cannot authenticate until a later account flow sets credentials. Neither seed creates a production administrator.

M008 establishes tooling and connection lifecycle; M009 introduces core tables and the first business schema. Do not edit a migration after it has been deployed. Use expand/contract changes for rolling releases and keep rollback planning separate from application rollback.
