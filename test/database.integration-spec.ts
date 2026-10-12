import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('PostgreSQL database infrastructure', () => {
  it('connects to PostgreSQL and supports a Drizzle transaction', async () => {
    const migrationsFolder = await mkdtemp(
      path.join(tmpdir(), 'm008-migrations-'),
    );
    try {
      execFileSync('pnpm', ['db:generate:fixture'], {
        cwd: process.cwd(),
        env: { ...process.env, M008_FIXTURE_OUTPUT_DIR: migrationsFolder },
        stdio: 'pipe',
      });
      const container = await new PostgreSqlContainer(
        'postgres:18.6-alpine',
      ).start();
      const client = postgres(container.getConnectionUri(), {
        max: 2,
        connect_timeout: 10,
        prepare: false,
      });

      try {
        const database = drizzle({ client });
        await migrate(database, { migrationsFolder });
        const result = await database.transaction(async (transaction) =>
          transaction.execute(sql`select 42 as answer`),
        );
        const migrationTable = await client`
          select to_regclass('public.m008_migration_probe') as name
        `;

        expect(result[0]?.answer).toBe(42);
        expect(migrationTable[0]?.name).toBe('m008_migration_probe');
      } finally {
        await client.end({ timeout: 5 });
        await container.stop();
      }
    } finally {
      await rm(migrationsFolder, { recursive: true, force: true });
    }
  });
});
