import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../src/infrastructure/database/schema/index.js';
import { PermissionService } from '../src/modules/auth/permission.service.js';
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

  it('migrates the complete schema, seeds reference data idempotently, and enforces tenant foreign keys', async () => {
    const container = await new PostgreSqlContainer(
      'postgres:18.6-alpine',
    ).start();
    const client = postgres(container.getConnectionUri(), {
      max: 2,
      connect_timeout: 10,
      prepare: false,
    });
    try {
      await migrate(drizzle({ client }), {
        migrationsFolder: './drizzle/migrations',
      });
      execFileSync('node', ['scripts/seed.mjs', 'reference'], {
        env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
        stdio: 'pipe',
      });
      execFileSync('node', ['scripts/seed.mjs', 'reference'], {
        env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
        stdio: 'pipe',
      });
      execFileSync('node', ['scripts/seed.mjs', 'dev'], {
        env: {
          ...process.env,
          DATABASE_URL: container.getConnectionUri(),
          NODE_ENV: 'development',
        },
        stdio: 'pipe',
      });
      execFileSync('node', ['scripts/seed.mjs', 'dev'], {
        env: {
          ...process.env,
          DATABASE_URL: container.getConnectionUri(),
          NODE_ENV: 'development',
        },
        stdio: 'pipe',
      });
      expect(() =>
        execFileSync('node', ['scripts/seed.mjs', 'dev'], {
          env: {
            ...process.env,
            DATABASE_URL: container.getConnectionUri(),
            NODE_ENV: 'production',
          },
          stdio: 'pipe',
        }),
      ).toThrow();
      const counts =
        await client`select (select count(*)::int from roles) as roles, (select count(*)::int from permissions) as permissions, (select count(*)::int from role_permissions) as role_permissions`;
      expect(counts[0]).toEqual({
        roles: 4,
        permissions: 12,
        role_permissions: 31,
      });
      const fixtureCounts =
        await client`select (select count(*)::int from users where normalized_email='developer@example.test') as users, (select count(*)::int from organizations where normalized_slug='local-development') as organizations, (select count(*)::int from organization_memberships) as memberships`;
      expect(fixtureCounts[0]).toEqual({
        users: 1,
        organizations: 1,
        memberships: 1,
      });

      const permissions = new PermissionService(drizzle({ client, schema }));

      const userA = (
        await client`insert into users (email, normalized_email) values ('a@example.test','a@example.test') returning id`
      )[0];
      const userB = (
        await client`insert into users (email, normalized_email) values ('b@example.test','b@example.test') returning id`
      )[0];
      if (!userA || !userB)
        throw new Error('User fixture insert returned no rows');
      const orgA = (
        await client`insert into organizations (name,slug,normalized_slug,created_by_user_id) values ('A','org-a','org-a',${userA.id}) returning id`
      )[0];
      const orgB = (
        await client`insert into organizations (name,slug,normalized_slug,created_by_user_id) values ('B','org-b','org-b',${userB.id}) returning id`
      )[0];
      if (!orgA || !orgB)
        throw new Error('Organization fixture insert returned no rows');
      const memberA = (
        await client`insert into organization_memberships (organization_id,user_id) values (${orgA.id},${userA.id}) returning id`
      )[0];
      if (!memberA)
        throw new Error('Membership fixture insert returned no rows');
      const memberRole = (
        await client`select id from roles where key='MEMBER'`
      )[0];
      if (!memberRole) throw new Error('Reference MEMBER role is missing');
      await client`insert into membership_roles (membership_id,role_id) values (${memberA.id},${memberRole.id})`;
      await expect(
        permissions.hasPermission(userA.id, orgA.id, 'resources:read'),
      ).resolves.toBe(true);
      await expect(
        permissions.hasPermission(userA.id, orgA.id, 'members:invite'),
      ).resolves.toBe(false);
      await expect(
        permissions.assertPermission(userA.id, orgA.id, 'members:invite'),
      ).rejects.toMatchObject({
        status: 403,
        response: { code: 'FORBIDDEN' },
      });
      await expect(
        permissions.hasPermission(userA.id, orgB.id, 'resources:read'),
      ).resolves.toBe(false);
      await client`update organization_memberships set status='suspended' where id=${memberA.id}`;
      await expect(
        permissions.hasPermission(userA.id, orgA.id, 'resources:read'),
      ).resolves.toBe(false);
      await client`update organization_memberships set status='active' where id=${memberA.id}`;
      await client`update organizations set status='suspended' where id=${orgA.id}`;
      await expect(
        permissions.hasPermission(userA.id, orgA.id, 'resources:read'),
      ).resolves.toBe(false);
      await client`update organizations set status='active' where id=${orgA.id}`;
      await expect(
        client`insert into example_resources (organization_id,created_by_membership_id,title) values (${orgB.id},${memberA.id},'cross tenant')`,
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client`insert into organizations (name,slug,normalized_slug,created_by_user_id) values ('Reserved','admin','admin',${userA.id})`,
      ).rejects.toMatchObject({ code: '23514' });

      await expect(
        client.begin(async (transaction) => {
          await transaction`insert into users (email,normalized_email) values ('rollback@example.test','rollback@example.test')`;
          throw new Error('rollback');
        }),
      ).rejects.toThrow('rollback');
      const rollbackRows =
        await client`select id from users where normalized_email='rollback@example.test'`;
      expect(rollbackRows).toHaveLength(0);
      const indexes =
        await client`select indexname from pg_indexes where schemaname='public' and tablename='organization_memberships'`;
      expect(indexes.map((row) => row.indexname)).toEqual(
        expect.arrayContaining([
          'organization_memberships_user_status_idx',
          'organization_memberships_org_status_idx',
        ]),
      );
    } finally {
      await client.end({ timeout: 5 });
      await container.stop();
    }
  });
});
