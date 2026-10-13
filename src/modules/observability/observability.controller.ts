import {
  Controller,
  Get,
  Header,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Sql } from 'postgres';
import { DATABASE_CLIENT } from '../../infrastructure/database/database.types.js';
import type { EnvironmentConfig } from '../../config/environment.js';
import { Public } from '../auth/access-control.js';
import { HealthState } from './health.state.js';
import { MetricsService } from './metrics.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: Sql,
    private readonly state: HealthState,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService<EnvironmentConfig>,
  ) {}

  @Get('live')
  @Public()
  live() {
    return { status: 'ok' };
  }

  @Get('startup')
  @Public()
  startup() {
    if (!this.state.startupComplete) throw new ServiceUnavailableException();
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async ready() {
    if (!this.state.startupComplete || this.state.isStopping)
      throw new ServiceUnavailableException();
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.client`select 1`,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('readiness timeout')),
            1500,
          );
          timeout.unref();
        }),
      ]);
      if (this.state.isStopping) throw new Error('shutting down');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  @Get('metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metricsText() {
    const appName = this.config.getOrThrow('APP_NAME', { infer: true });
    const instanceName = `${appName}:${process.env.HOSTNAME ?? process.pid}`;
    const poolMax = this.config.getOrThrow('DB_POOL_MAX', { infer: true });
    let sessions: { state: string; count: number }[] = [];
    try {
      sessions = await this.client<{ state: string; count: number }[]>`
        select state, count(*)::int as count from pg_stat_activity
        where datname = current_database() and application_name = ${instanceName}
        group by state`;
    } catch {
      /* metrics remain available during a DB outage */
    }
    return this.metrics.render(appName, poolMax, sessions);
  }
}
