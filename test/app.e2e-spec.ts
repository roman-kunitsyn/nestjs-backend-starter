import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module.js';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from '../src/common/api-routing.js';
import {
  configureAdapterProblemDetails,
  createHttpAdapter,
  configureRequestCorrelation,
} from '../src/common/http/request-id.js';
import { createOpenApiDocument, setupOpenApi } from '../src/common/openapi.js';

describe('AppController (Fastify E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      createHttpAdapter(API_BODY_LIMIT_BYTES),
      { logger: false },
    );
    configureApiRouting(app);
    configureRequestCorrelation(app);
    setupOpenApi(app, createOpenApiDocument(app), true);
    await app.init();
    configureAdapterProblemDetails(app);
    await app.getHttpAdapter().getInstance().ready();
  });

  it('serves the starter route through Fastify injection', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Hello World!');
    expect(response.headers['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
  });

  it('serves an accurate OpenAPI 3.1 document for the real prefixed route', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      jsonSchemaDialect: 'https://spec.openapis.org/oas/3.1/dialect/base',
    });
    expect(response.json().paths['/api/v1']).toBeDefined();
    expect(
      response.json().paths['/api/v1'].get.responses['200'].headers[
        'X-Request-ID'
      ],
    ).toMatchObject({ schema: { type: 'string' } });
    expect(response.json().components.schemas.ProblemDetails).toBeDefined();
  });

  it('serves the interactive OpenAPI UI at /docs when enabled', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/docs',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Swagger UI');
  });

  it('serves the matching OpenAPI YAML document', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.yaml',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('openapi: 3.1.0');
    expect(response.body).toContain('ProblemDetails:');
  });

  it('publishes validated account endpoints in the OpenAPI contract', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.json',
    });
    const document = response.json();
    expect(document.paths['/api/v1/auth/register'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/verify-email'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/forgot-password'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/reset-password'].post).toBeDefined();
  });

  it('rejects malformed registration at the HTTP boundary before persistence', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'short' },
      });
    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
