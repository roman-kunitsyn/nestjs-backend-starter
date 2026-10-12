import { randomUUID } from 'node:crypto';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { defaultProblemCode, problemTitle } from './problem-details.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(value: unknown): string {
  if (typeof value === 'string' && REQUEST_ID_PATTERN.test(value)) return value;
  return `req_${randomUUID()}`;
}

export function createHttpAdapter(bodyLimit: number): FastifyAdapter {
  return new FastifyAdapter({
    bodyLimit,
    genReqId: (request: FastifyRequest['raw']) =>
      resolveRequestId(request.headers['x-request-id']),
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
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
  });
}

export function configureRequestCorrelation(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('X-Request-ID', request.id);
    done();
  });
}

/** Install after Nest initialization so the adapter keeps this root error handler. */
export function configureAdapterProblemDetails(
  app: NestFastifyApplication,
): void {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.setErrorHandler((error, request, reply) => {
    const httpError = error as Error & { statusCode?: number };
    const status =
      httpError.statusCode &&
      httpError.statusCode >= 400 &&
      httpError.statusCode < 600
        ? httpError.statusCode
        : 500;
    const code = defaultProblemCode(status);
    request.log.error(
      { err: httpError, requestId: request.id, status },
      'HTTP adapter error',
    );
    void reply
      .header('X-Request-ID', request.id)
      .type('application/problem+json; charset=utf-8')
      .code(status)
      .send({
        type: `https://api.example.com/problems/${code.toLowerCase()}`,
        title: problemTitle(status),
        status,
        code,
        requestId: request.id,
      });
  });
}
