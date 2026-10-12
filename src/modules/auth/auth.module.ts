import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../../config/environment.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { EMAIL_SENDER, ConsoleEmailSender } from '../email/email-sender.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig>) => {
        if (config.getOrThrow('NODE_ENV', { infer: true }) === 'production') {
          throw new Error(
            'A production EmailSender adapter must be configured before enabling account flows',
          );
        }
        return new ConsoleEmailSender();
      },
    },
  ],
  exports: [AuthService, PasswordHasher],
})
export class AuthModule {}
