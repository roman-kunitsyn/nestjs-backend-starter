import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

// Infrastructure-only schema used to prove Drizzle Kit generation and migration
// application before M009 introduces the application's first business tables.
export const migrationProbe = pgTable('m008_migration_probe', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').notNull(),
});
