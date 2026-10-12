import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../../config/environment.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { EMAIL_SENDER, ConsoleEmailSender } from '../email/email-sender.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from './jwt.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PasswordHasher } from './password-hasher.js';
import { PermissionService } from './permission.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    PasswordHasher,
    JwtService,
    SessionService,
    SessionGuard,
    PermissionService,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig>) => {
        if (config.getOrThrow('NODE_ENV', { infer: true }) === 'production')
          throw new Error(
            'A production EmailSender adapter must be configured before enabling account flows',
          );
        return new ConsoleEmailSender();
      },
    },
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
