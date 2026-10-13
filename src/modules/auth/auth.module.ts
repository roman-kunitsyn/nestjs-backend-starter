import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from './jwt.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PasswordHasher } from './password-hasher.js';
import { PermissionService } from './permission.service.js';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    PasswordHasher,
    JwtService,
    SessionService,
    SessionGuard,
    PermissionService,
  ],
  exports: [
    AuthService,
    PasswordHasher,
    SessionService,
    JwtService,
    SessionGuard,
    PermissionService,
  ],
})
export class AuthModule {}
