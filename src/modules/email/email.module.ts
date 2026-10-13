import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../../config/environment.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  ConsoleEmailSender,
  EMAIL_SENDER,
  SmtpEmailSender,
} from './email-sender.js';
import {
  AuditEventService,
  EmailOutboxRunner,
  EmailOutboxService,
} from './email-outbox.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    EmailOutboxService,
    EmailOutboxRunner,
    AuditEventService,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig>) => {
        const environment = config.getOrThrow('NODE_ENV', { infer: true });
        if (environment !== 'production') return new ConsoleEmailSender();
        return new SmtpEmailSender({
          host: config.getOrThrow('SMTP_HOST', { infer: true }),
          port: config.getOrThrow('SMTP_PORT', { infer: true }),
          secure: config.getOrThrow('SMTP_SECURE', { infer: true }),
          user: config.getOrThrow('SMTP_USER', { infer: true }),
          password: config.getOrThrow('SMTP_PASSWORD', { infer: true }),
          from: config.getOrThrow('SMTP_FROM', { infer: true }),
          timeoutMs: config.getOrThrow('SMTP_TIMEOUT_MS', { infer: true }),
          ...(config.get('SMTP_CA_PEM', { infer: true })
            ? { ca: config.getOrThrow('SMTP_CA_PEM', { infer: true }) }
            : {}),
        });
      },
    },
  ],
  exports: [EmailOutboxService, AuditEventService, EMAIL_SENDER],
})
export class EmailModule {}
