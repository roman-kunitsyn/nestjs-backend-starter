import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { EnvironmentConfig } from './config/environment.js';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ bodyLimit: 1024 * 1024 }),
  { bufferLogs: true },
);
const config = app.get(ConfigService<EnvironmentConfig>);

app.enableShutdownHooks();
await app.listen(
  config.getOrThrow('PORT', { infer: true }),
  config.getOrThrow('APP_HOST', { infer: true }),
);
