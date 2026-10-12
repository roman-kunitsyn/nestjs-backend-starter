import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { z } from 'zod';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from '../src/common/api-routing.js';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe.js';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter.js';
import {
  configureAdapterProblemDetails,
  configureRequestCorrelation,
  createHttpAdapter,
} from '../src/common/http/request-id.js';

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    role: z.enum(['member', 'admin']),
  })
  .strict();
const idSchema = z.string().uuid();
const listSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

@Controller('validation-probe')
class ValidationProbeController {
  @Get('failure')
  fail(): never {
    throw new Error('SELECT password FROM private_users');
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createSchema))
    body: z.output<typeof createSchema>,
  ) {
    return body;
  }

  @Get(':id')
  get(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Query(new ZodValidationPipe(listSchema))
    query: z.output<typeof listSchema>,
  ) {
    return { id, ...query };
  }
}

@Controller('health')
class HealthProbeController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [LoggerModule.forRoot({ pinoHttp: { level: 'silent' } })],
  controllers: [ValidationProbeController, HealthProbeController],
  providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
})
class RequestValidationTestModule {}

describe('Request validation (Fastify E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      RequestValidationTestModule,
      createHttpAdapter(API_BODY_LIMIT_BYTES),
      { logger: false },
    );
    configureApiRouting(app);
    configureRequestCorrelation(app);
    await app.init();
    configureAdapterProblemDetails(app);
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('parses and normalizes valid body, path, and query input under /api/v1', async () => {
    const created = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/validation-probe',
        payload: { name: '  Sample  ', role: 'member' },
      });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual({ name: 'Sample', role: 'member' });

    const listed = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/validation-probe/550e8400-e29b-41d4-a716-446655440000?limit=25',
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      limit: 25,
    });
  });

  it('keeps health routes outside the versioned business API prefix', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('rejects malformed body fields, unknown properties, and invalid enums', async () => {
    for (const payload of [
      { name: 'Sample', role: 'owner' },
      { name: 'Sample', role: 'member', extra: true },
      { name: 'x'.repeat(81), role: 'member' },
    ]) {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: 'POST',
        url: '/api/v1/validation-probe',
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(response.json()).toMatchObject({
        status: 400,
        title: 'Bad Request',
        code: 'VALIDATION_ERROR',
        requestId: response.headers['x-request-id'],
      });
      expect(response.json().issues).toEqual(expect.any(Array));
    }
  });

  it('rejects malformed path and query values', async () => {
    for (const url of [
      '/api/v1/validation-probe/not-a-uuid',
      '/api/v1/validation-probe/550e8400-e29b-41d4-a716-446655440000?limit=101',
      '/api/v1/validation-probe/550e8400-e29b-41d4-a716-446655440000?unexpected=true',
    ]) {
      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({ method: 'GET', url });
      expect(response.statusCode).toBe(400);
    }
  });

  it('sanitizes unexpected exception details from Problem Details responses', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/validation-probe/failure',
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toMatchObject({
      title: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    });
    expect(response.body).not.toContain('SELECT password');
  });

  it('rejects request bodies larger than the configured limit', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/validation-probe',
        payload: { name: 'x'.repeat(API_BODY_LIMIT_BYTES + 1), role: 'member' },
      });
    expect(response.statusCode).toBe(413);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('propagates a syntactically valid supplied request ID and replaces invalid values', async () => {
    const supplied = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/validation-probe',
        headers: { 'x-request-id': 'client.trace-01' },
        payload: { name: '', role: 'member' },
      });
    expect(supplied.headers['x-request-id']).toBe('client.trace-01');
    expect(supplied.json().requestId).toBe('client.trace-01');

    const rejected = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/api/v1/validation-probe/not-a-uuid',
        headers: { 'x-request-id': 'bad id\nforged' },
      });
    expect(rejected.headers['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
  });
});
