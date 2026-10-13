import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationService } from './organization.service.js';
import { MembershipService } from './membership.service.js';
import { MembershipController } from './membership.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OrganizationsController, MembershipController],
  providers: [OrganizationService, MembershipService],
  exports: [OrganizationService, MembershipService],
})
export class OrganizationsModule {}
