import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema/index.js';

export const databaseSchema = schema;
export type Database = PostgresJsDatabase<typeof databaseSchema>;

export const DATABASE = Symbol('DATABASE');
export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');
export const DATABASE_RESOURCES = Symbol('DATABASE_RESOURCES');
