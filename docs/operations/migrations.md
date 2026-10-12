# Database migrations

## Configuration

Set `DATABASE_URL` to the PostgreSQL database that should be managed. The application creates one `postgres.js` client and typed Drizzle instance for its lifetime. `DB_POOL_MAX` defaults to 10 and must be budgeted across all replicas and operational clients. Connect and idle timeouts are controlled by `DB_CONNECT_TIMEOUT_SECONDS` and `DB_IDLE_TIMEOUT_SECONDS`. Prepared statements are disabled to support transaction-pooling proxies.

## Workflow

```bash
pnpm infra:up
pnpm db:generate
pnpm db:check
pnpm db:migrate
```

`pnpm db:generate` creates a versioned migration from the Drizzle schemas under `src/infrastructure/database/schema`. Review generated SQL before applying it. `pnpm db:check` validates migration ordering and metadata consistency. `pnpm db:migrate` applies pending migrations to the explicitly configured database and closes its one-connection client on completion. The application never runs migrations on startup; deploy them once as a controlled release step before rolling out compatible application replicas.

M008 establishes tooling and connection lifecycle; M009 introduces core tables and the first business schema. Do not edit a migration after it has been deployed. Use expand/contract changes for rolling releases and keep rollback planning separate from application rollback.
