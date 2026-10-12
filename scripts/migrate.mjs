import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to run database migrations');
}

const client = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  await migrate(drizzle({ client }), { migrationsFolder: './drizzle/migrations' });
} finally {
  await client.end({ timeout: 5 });
}
