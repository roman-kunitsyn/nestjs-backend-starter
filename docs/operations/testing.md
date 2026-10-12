# Testing

Run fast checks with `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. PostgreSQL integration tests use Testcontainers and a real PostgreSQL 18 container:

```bash
pnpm test:integration
```

Docker must be available to run integration tests. They start an isolated container and stop it after each test suite; they do not use the developer's Compose database or SQLite. The database module's `DATABASE` provider can be replaced through Nest's testing module provider override for tests that do not need PostgreSQL.
