import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { Sql } from 'postgres';
import { DATABASE_CLIENT } from './database.types.js';

@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CLIENT) private readonly client: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
