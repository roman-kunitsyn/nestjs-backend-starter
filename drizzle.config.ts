import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema/**/*.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://app:local_dev_only_change_me@localhost:5432/app',
  },
  strict: true,
  verbose: true,
});
