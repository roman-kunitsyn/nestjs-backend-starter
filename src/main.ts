import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { EnvironmentConfig } from './config/environment.js';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from './common/api-routing.js';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ bodyLimit: API_BODY_LIMIT_BYTES }),
  { bufferLogs: true },
);
const config = app.get(ConfigService<EnvironmentConfig>);

configureApiRouting(app);
app.enableShutdownHooks();
await app.listen(
  config.getOrThrow('PORT', { infer: true }),
  config.getOrThrow('APP_HOST', { infer: true }),
);
