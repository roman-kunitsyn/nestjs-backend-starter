import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationService } from './organization.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OrganizationsController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
