import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';
import { IdempotencyService } from './idempotency.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, IdempotencyService],
  exports: [ResourcesService, IdempotencyService],
})
export class ResourcesModule {}
