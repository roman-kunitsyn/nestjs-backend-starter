import type { Sql } from 'postgres';
import { DatabaseLifecycle } from './database.lifecycle.js';

describe('DatabaseLifecycle', () => {
  it('closes the application-lifetime client on shutdown', async () => {
    let endOptions: unknown;
    const end = async (options: unknown): Promise<void> => {
      endOptions = options;
    };
    const lifecycle = new DatabaseLifecycle({ end } as unknown as Sql);

    await lifecycle.onApplicationShutdown();

    expect(endOptions).toEqual({ timeout: 5 });
  });
});
