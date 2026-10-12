import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/infrastructure/database/schema/index.js';
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
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let databaseClient: ReturnType<typeof postgres>;
  let originalDatabaseUrl: string | undefined;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    container = await new PostgreSqlContainer('postgres:18.6-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    databaseClient = postgres(container.getConnectionUri(), {
      max: 2,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => undefined,
    });
    await migrate(drizzle({ client: databaseClient, schema }), {
      migrationsFolder: './drizzle/migrations',
    });
    const { AppModule } = await import('../src/app.module.js');
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

  it('rejects an invalid email verification token with the public problem contract', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token: 'x'.repeat(32) },
      });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('registers accounts, omits credentials, rejects duplicates, and keeps recovery responses uniform', async () => {
    const server = app.getHttpAdapter().getInstance();
    const payload = {
      email: 'Account.User@example.com',
      password: 'correct horse battery staple',
      displayName: 'Account User',
    };
    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      user: {
        email: payload.email,
        displayName: payload.displayName,
      },
      emailVerificationRequired: true,
    });
    expect(created.body).not.toContain('passwordHash');
    expect(created.body).not.toContain(payload.password);

    const duplicate = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });
    expect(duplicate.statusCode).toBe(409);

    const existing = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: payload.email },
    });
    const missing = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'missing@example.com' },
    });
    expect(existing.statusCode).toBe(202);
    expect(missing.statusCode).toBe(202);
    expect(existing.json()).toEqual(missing.json());
  });

  afterAll(async () => {
    await app.close();
    await databaseClient.end({ timeout: 5 });
    await container.stop();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });
});
