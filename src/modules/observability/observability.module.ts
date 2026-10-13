import { Global, Module } from '@nestjs/common';
import { HealthController } from './observability.controller.js';
import { HealthState } from './health.state.js';
import { MetricsService } from './metrics.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { TracingLifecycle } from './tracing.lifecycle.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthState, MetricsService, TracingLifecycle],
  exports: [HealthState, MetricsService],
})
export class ObservabilityModule {}
