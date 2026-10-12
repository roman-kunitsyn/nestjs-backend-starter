import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/** Database types are extended with application tables in M009. */
export const databaseSchema = {};
export type Database = PostgresJsDatabase<typeof databaseSchema>;

export const DATABASE = Symbol('DATABASE');
export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');
export const DATABASE_RESOURCES = Symbol('DATABASE_RESOURCES');
