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

The Helm chart's pre-install/pre-upgrade hook runs `node scripts/migrate.mjs` exactly once before changing application replicas. The production image includes only the migration runner and versioned migration SQL needed for this separate Job; the API container entrypoint remains `node dist/main.js`. A migration Job failure prevents the application rollout. App rollback never implicitly rolls back database schema; use backward-compatible expand/contract changes and review schema recovery separately. See [Kubernetes operations](kubernetes.md).

M008 establishes tooling and connection lifecycle; M009 introduces core tables and the first business schema. Do not edit a migration after it has been deployed. Use expand/contract changes for rolling releases and keep rollback planning separate from application rollback.

## Backup, restore verification, and troubleshooting

### Prerequisites

- PostgreSQL client tools (`psql`, `pg_dump`, `createdb`, `pg_restore`) with access to a disposable or isolated recovery database.
- `DATABASE_URL` supplied by the approved secret manager or shell environment. Do not print credentials or put them in command history.
- A reviewed backup identifier and permission to restore into an isolated database. Never overwrite production during a rehearsal.

For a custom-format dump, use the provider's documented point-in-time restore into a new isolated database first. For a local or self-managed PostgreSQL target, the sequence is:

```bash
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file=./recovery-check.dump
createdb --maintenance-db="$DATABASE_URL" recovery_check
pg_restore --no-owner --dbname="$RECOVERY_DATABASE_URL" ./recovery-check.dump
psql "$RECOVERY_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c 'SELECT count(*) AS migration_count FROM drizzle.__drizzle_migrations;'
```

`RECOVERY_DATABASE_URL` must point to the isolated restored database. Expected: each command exits zero; `pg_restore` completes; the migration query returns the expected migration count without errors. For a provider PITR rehearsal, record the restore point, observed RPO/RTO, database version, and sanitized verification output. Securely remove the rehearsal database after verification. The repository does not define a universal RPO/RTO target.

### Verify migrations after deployment

```bash
pnpm db:check
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c 'SELECT count(*) AS migration_count FROM drizzle.__drizzle_migrations;'
```

Expected: `pnpm db:check` exits zero and the query returns the expected journal row count. In Kubernetes, verify the migration Job before assessing the application rollout:

```bash
kubectl get jobs -n NAMESPACE \
  -l app.kubernetes.io/instance=RELEASE,app.kubernetes.io/component=migration
kubectl describe job JOB_NAME -n NAMESPACE
kubectl logs job/JOB_NAME -n NAMESPACE
```

Expected: the newest migration Job completes successfully and logs contain no SQL or connection error. Do not rerun a failed migration blindly; determine whether it committed partial work and inspect migration metadata first.

### Troubleshooting and manual verification

- Connection refused or timeout: verify intended host, port, TLS mode, network policy/security group, and secret-manager value without printing the URL.
- Authentication failure: confirm the database role and rotated credential in the approved secret manager, then update the environment secret; do not copy credentials into Helm values.
- Migration consistency fails locally: inspect generated SQL and journal order, run `pnpm db:check`, and add a forward migration. Never edit a migration already applied in a shared environment.
- Kubernetes migration Job fails: inspect its description and logs, confirm the `DATABASE_URL` Secret reference and database reachability, then inspect journal state before retrying deployment.
- Restore fails: confirm dump format, PostgreSQL major-version compatibility, available storage, and that the destination database is empty and isolated. Preserve the source backup; do not retry into a live database.

Manually verify restore completion, expected migration count, synthetic marker/data checks, application readiness against the restored database, and recorded restore timing. M022 requires actual managed-service PITR evidence; a local dump/restore rehearsal does not substitute for it. See [Kubernetes deployment and rollback](kubernetes.md#deployment-and-application-rollback-quick-procedure).
