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
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { z } from 'zod';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from '../src/common/api-routing.js';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe.js';

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

@Module({ controllers: [ValidationProbeController, HealthProbeController] })
class RequestValidationTestModule {}

describe('Request validation (Fastify E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      RequestValidationTestModule,
      new FastifyAdapter({ bodyLimit: API_BODY_LIMIT_BYTES }),
      { logger: false },
    );
    configureApiRouting(app);
    await app.init();
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
      expect(response.json().code).toBe('VALIDATION_ERROR');
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
  });
});
