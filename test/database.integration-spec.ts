import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('PostgreSQL database infrastructure', () => {
  it('connects to PostgreSQL and supports a Drizzle transaction', async () => {
    const container = await new PostgreSqlContainer(
      'postgres:18.6-alpine',
    ).start();
    const migrationsFolder = await mkdtemp(
      path.join(tmpdir(), 'm008-migrations-'),
    );
    const client = postgres(container.getConnectionUri(), {
      max: 2,
      connect_timeout: 10,
      prepare: false,
    });

    try {
      await mkdir(path.join(migrationsFolder, 'meta'));
      await writeFile(
        path.join(migrationsFolder, 'meta', '_journal.json'),
        JSON.stringify({
          version: '7',
          dialect: 'postgresql',
          entries: [
            {
              idx: 0,
              version: '7',
              when: Date.now(),
              tag: '0000_m008_probe',
              breakpoints: true,
            },
          ],
        }),
      );
      await writeFile(
        path.join(migrationsFolder, '0000_m008_probe.sql'),
        'CREATE TABLE m008_migration_probe (id integer PRIMARY KEY);',
      );
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
      await rm(migrationsFolder, { recursive: true, force: true });
    }
  });
});
