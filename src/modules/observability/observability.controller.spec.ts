import { ServiceUnavailableException } from '@nestjs/common';
import type { Sql } from 'postgres';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../../config/environment.js';
import { HealthState } from './health.state.js';
import { MetricsService } from './metrics.js';
import { HealthController } from './observability.controller.js';

describe('HealthController', () => {
  it('keeps liveness healthy during database failure and fails readiness', async () => {
    const failingClient = (() =>
      Promise.reject(new Error('database unavailable'))) as unknown as Sql;
    const state = new HealthState();
    state.onApplicationBootstrap();
    const config = {
      getOrThrow: () => 'starter',
    } as unknown as ConfigService<EnvironmentConfig>;
    const controller = new HealthController(
      failingClient,
      state,
      new MetricsService(),
      config,
    );

    expect(controller.live()).toEqual({ status: 'ok' });
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails readiness before attempting a check after shutdown begins', async () => {
    const client = (() => Promise.resolve([])) as unknown as Sql;
    const state = new HealthState();
    state.onApplicationBootstrap();
    state.beginShutdown();
    const config = {
      getOrThrow: () => 'starter',
    } as unknown as ConfigService<EnvironmentConfig>;
    const controller = new HealthController(
      client,
      state,
      new MetricsService(),
      config,
    );

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
