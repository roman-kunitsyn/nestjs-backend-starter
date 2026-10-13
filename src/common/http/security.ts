import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { EnvironmentConfig } from '../../config/environment.js';
import { parseOriginList } from '../../config/environment.js';

const problem = (requestId: string) => ({
  type: 'https://api.example.com/problems/rate-limited',
  title: 'Too Many Requests',
  status: 429,
  code: 'RATE_LIMITED',
  requestId,
});

/** Install HTTP protections before Nest initializes and registers controllers. */
export async function configureHttpSecurity(
  app: NestFastifyApplication,
  config: ConfigService<EnvironmentConfig>,
): Promise<void> {
  const fastify = app.getHttpAdapter().getInstance();
  const origins = parseOriginList(
    config.getOrThrow('HTTP_CORS_ORIGINS', { infer: true }),
  );
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });
  await fastify.register(cors, {
    origin: origins,
    credentials: origins.length > 0,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-ID',
      'Idempotency-Key',
    ],
    maxAge: 600,
  });
  await fastify.register(rateLimit, {
    global: true,
    hook: 'onRequest',
    max: config.getOrThrow('HTTP_RATE_LIMIT_MAX', { infer: true }),
    timeWindow: config.getOrThrow('HTTP_RATE_LIMIT_WINDOW_MS', {
      infer: true,
    }),
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (request) => problem(request.id),
  });
  const endpointLimiters = new Map<
    string,
    ReturnType<typeof fastify.createRateLimit>
  >();

  // Cookie authority is used only by refresh. SameSite=Lax is paired with a
  // mandatory exact Origin check; deployments must allow their browser origin.
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.url !== '/api/v1/auth/refresh') return;
    if (!request.headers.cookie?.includes('refresh_token=')) return;
    const origin = request.headers.origin;
    const sameOrigin = `${request.protocol}://${request.headers.host}`;
    const allowed =
      typeof origin === 'string' &&
      (origins.includes(origin) ||
        (origins.length === 0 && origin === new URL(sameOrigin).origin));
    if (!allowed) {
      await reply
        .code(403)
        .type('application/problem+json; charset=utf-8')
        .send({
          type: 'https://api.example.com/problems/forbidden',
          title: 'Forbidden',
          status: 403,
          code: 'CSRF_ORIGIN_REJECTED',
          requestId: request.id,
        });
    }
  });

  fastify.addHook('preHandler', async (request, reply) => {
    const policy = endpointPolicy(request.routeOptions.url);
    if (!policy) return;
    let checkLimit = endpointLimiters.get(policy.group);
    if (!checkLimit) {
      checkLimit = fastify.createRateLimit({
        max: policy.max(config),
        timeWindow: policy.windowMs,
        keyGenerator: (candidate) =>
          `${policy.group}:${(policy.keyGenerator ?? ((item) => item.ip))(candidate)}`,
      });
      endpointLimiters.set(policy.group, checkLimit);
    }
    const result = await checkLimit(request);
    if (!result.isAllowed && result.isExceeded) {
      await reply
        .header('retry-after', result.ttlInSeconds)
        .code(429)
        .type('application/problem+json; charset=utf-8')
        .send(problem(request.id));
    }
  });
}

type RatePolicy = {
  group: string;
  windowMs: number;
  max: (config: ConfigService<EnvironmentConfig>) => number;
  keyGenerator?: (request: FastifyRequest) => string;
};

const accountIpKey = (request: FastifyRequest) => {
  const body = request.body;
  const email =
    typeof body === 'object' &&
    body !== null &&
    'email' in body &&
    typeof body.email === 'string'
      ? body.email.trim().normalize('NFKC').toLowerCase()
      : '';
  const account = createHash('sha256').update(email).digest('hex');
  return `${request.ip}:${account}`;
};

const endpointPolicy = (route: string | undefined): RatePolicy | undefined => {
  const policies: Record<string, RatePolicy> = {
    'POST /api/v1/auth/login': {
      group: 'login',
      windowMs: 60_000,
      max: (config) =>
        config.getOrThrow('AUTH_LOGIN_RATE_LIMIT_MAX', { infer: true }),
      keyGenerator: accountIpKey,
    },
    'POST /api/v1/auth/register': {
      group: 'registration',
      windowMs: 3_600_000,
      max: (config) =>
        config.getOrThrow('AUTH_REGISTER_RATE_LIMIT_MAX', { infer: true }),
    },
    'POST /api/v1/auth/forgot-password': {
      group: 'account-recovery',
      windowMs: 3_600_000,
      max: (config) =>
        config.getOrThrow('AUTH_RECOVERY_RATE_LIMIT_MAX', { infer: true }),
      keyGenerator: accountIpKey,
    },
    'POST /api/v1/auth/resend-verification': {
      group: 'account-recovery',
      windowMs: 3_600_000,
      max: (config) =>
        config.getOrThrow('AUTH_RECOVERY_RATE_LIMIT_MAX', { infer: true }),
      keyGenerator: accountIpKey,
    },
    'POST /api/v1/auth/refresh': {
      group: 'refresh',
      windowMs: 60_000,
      max: (config) =>
        config.getOrThrow('AUTH_REFRESH_RATE_LIMIT_MAX', { infer: true }),
    },
  };
  if (!route) return undefined;
  const policy = policies[`POST ${route}`];
  if (policy) return policy;
  if (route.endsWith('/ownership-transfer')) {
    return {
      group: 'sensitive-actions',
      windowMs: 600_000,
      max: (config) =>
        config.getOrThrow('AUTH_SENSITIVE_RATE_LIMIT_MAX', { infer: true }),
    };
  }
  if (route.endsWith('/invitations')) {
    return {
      group: 'invitation-creation',
      windowMs: 3_600_000,
      max: (config) =>
        config.getOrThrow('AUTH_RECOVERY_RATE_LIMIT_MAX', { infer: true }),
    };
  }
  return undefined;
};
