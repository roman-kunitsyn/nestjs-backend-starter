import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/environment.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionGuard } from './modules/auth/session.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        genReqId: (request) => {
          const value = request.headers['x-request-id'];
          return typeof value === 'string' &&
            /^[A-Za-z0-9._:-]{1,128}$/.test(value)
            ? value
            : `req_${randomUUID()}`;
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.x-api-key',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.refreshToken',
            'req.body.accessToken',
            'req.body.token',
            'res.headers.set-cookie',
            'password',
            'refreshToken',
            'accessToken',
            'authorization',
            'token',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useExisting: SessionGuard },
  ],
})
export class AppModule {}
