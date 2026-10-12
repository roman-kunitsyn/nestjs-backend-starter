import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './test/fixtures/database/schema.ts',
  out: process.env.M008_FIXTURE_OUTPUT_DIR ?? './test/fixtures/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://app:local_dev_only_change_me@localhost:5432/app',
  },
  strict: true,
  verbose: true,
});
