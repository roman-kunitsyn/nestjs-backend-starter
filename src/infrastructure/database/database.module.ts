import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { EnvironmentConfig } from '../../config/environment.js';
import type { Database } from './database.types.js';
import {
  DATABASE,
  DATABASE_CLIENT,
  DATABASE_RESOURCES,
  databaseSchema,
} from './database.types.js';
import { DatabaseLifecycle } from './database.lifecycle.js';

@Module({
  providers: [
    {
      provide: DATABASE_RESOURCES,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig>) => {
        const client = postgres(
          config.getOrThrow('DATABASE_URL', { infer: true }),
          {
            max: config.getOrThrow('DB_POOL_MAX', { infer: true }),
            connect_timeout: config.getOrThrow('DB_CONNECT_TIMEOUT_SECONDS', {
              infer: true,
            }),
            idle_timeout: config.getOrThrow('DB_IDLE_TIMEOUT_SECONDS', {
              infer: true,
            }),
            // Safe with transaction-pooling proxies.
            prepare: false,
            onnotice: () => undefined,
          },
        );
        return {
          database: drizzle({ client, schema: databaseSchema }),
          client,
        };
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_RESOURCES],
      useFactory: (resources: { database: Database }) => resources.database,
    },
    {
      provide: DATABASE_CLIENT,
      inject: [DATABASE_RESOURCES],
      useFactory: (resources: { client: ReturnType<typeof postgres> }) =>
        resources.client,
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
