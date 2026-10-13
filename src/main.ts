import './modules/observability/instrumentation.js';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { EnvironmentConfig } from './config/environment.js';
import { PinoLogger } from 'nestjs-pino';
import { createOpenApiDocument, setupOpenApi } from './common/openapi.js';
import {
  configureAdapterProblemDetails,
  configureRequestCorrelation,
  createHttpAdapter,
} from './common/http/request-id.js';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from './common/api-routing.js';
import { configureHttpSecurity } from './common/http/security.js';
import { parseTrustedProxyList } from './config/environment.js';
import {
  configureHttpMetrics,
  MetricsService,
} from './modules/observability/metrics.js';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  createHttpAdapter(
    API_BODY_LIMIT_BYTES,
    parseTrustedProxyList(process.env.HTTP_TRUSTED_PROXY_CIDRS ?? ''),
  ),
  { bufferLogs: true },
);
const config = app.get(ConfigService<EnvironmentConfig>);

configureApiRouting(app);
configureRequestCorrelation(app);
const metrics = app.get(MetricsService);
const fastify = app.getHttpAdapter().getInstance();
configureHttpMetrics(fastify, metrics);
app.useLogger(app.get(PinoLogger));
await configureHttpSecurity(app, config);
const openApi = createOpenApiDocument(app);
setupOpenApi(
  app,
  openApi,
  config.getOrThrow('API_DOCS_ENABLED', { infer: true }),
);
app.enableShutdownHooks();
await app.init();
configureAdapterProblemDetails(app);
await app.listen(
  config.getOrThrow('PORT', { infer: true }),
  config.getOrThrow('APP_HOST', { infer: true }),
);
