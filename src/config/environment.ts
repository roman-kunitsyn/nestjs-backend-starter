import { z } from 'zod';
import { isIP } from 'node:net';

const EnvironmentInputSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_NAME: z.string().trim().min(1).max(80).default('nestjs-backend-starter'),
  APP_HOST: z.string().trim().min(1).default('127.0.0.1'),
  HTTP_CORS_ORIGINS: z.string().default(''),
  HTTP_TRUSTED_PROXY_CIDRS: z.string().default(''),
  HTTP_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100000).default(120),
  HTTP_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(3600000)
    .default(60000),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(5),
  AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(3),
  AUTH_RECOVERY_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(3),
  AUTH_REFRESH_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(20),
  AUTH_SENSITIVE_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(5),
  AUTH_REFRESH_COOKIE_SAME_SITE: z.enum(['lax', 'strict']).default('lax'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_DOCS_ENABLED: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  ),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://app:local_dev_only_change_me@localhost:5432/app'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_CONNECT_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),
  DB_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(0).max(600).default(20),
  AUTH_JWT_ISSUER: z.string().url().default('https://api.example.com'),
  AUTH_JWT_AUDIENCE: z.string().min(1).default('nestjs-backend-starter'),
  AUTH_JWT_KID: z.string().min(1).max(100).default('local-ed25519-1'),
  AUTH_JWT_PRIVATE_KEY: z.string().default(''),
  AUTH_JWT_PUBLIC_KEY: z.string().default(''),
  AUTH_JWT_PUBLIC_KEYS: z.string().default(''),
  AUTH_REFRESH_TOKEN_KEY: z.string().default(''),
  RESOURCE_CURSOR_SECRET: z
    .string()
    .min(32)
    .default('local-resource-cursor-secret-change-me'),
  RESOURCE_IDEMPOTENCY_RETENTION_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(720)
    .default(24),
  AUTH_REFRESH_COOKIE_SECURE: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  ),
  AUTH_REFRESH_IDLE_DAYS: z.coerce.number().int().min(1).max(30).default(14),
  AUTH_SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().default(false),
  ),
  SMTP_USER: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().trim().email().optional(),
  SMTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
  SMTP_CA_PEM: z.string().optional(),
});

export const EnvironmentSchema = EnvironmentInputSchema.transform((config) => ({
  ...config,
  API_DOCS_ENABLED: config.API_DOCS_ENABLED ?? config.NODE_ENV !== 'production',
}));

export type EnvironmentConfig = z.output<typeof EnvironmentSchema>;

export function parseOriginList(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const parsed = new URL(origin);
      if (
        parsed.origin !== origin ||
        (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost')
      ) {
        throw new Error(
          'HTTP_CORS_ORIGINS entries must be exact HTTPS origins (localhost may use HTTP)',
        );
      }
      return origin;
    });
}

export function parseTrustedProxyList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [address, prefix, ...rest] = entry.split('/');
      const version = address ? isIP(address) : 0;
      const bits = prefix === undefined ? undefined : Number(prefix);
      if (
        rest.length > 0 ||
        version === 0 ||
        (prefix !== undefined && !/^\d+$/.test(prefix)) ||
        (bits !== undefined &&
          (!Number.isInteger(bits) ||
            bits < 0 ||
            bits > (version === 4 ? 32 : 128)))
      ) {
        throw new Error(
          'HTTP_TRUSTED_PROXY_CIDRS entries must be IP addresses or valid CIDRs',
        );
      }
      return entry;
    });
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentConfig {
  const parsed = EnvironmentSchema.safeParse(config);
  if (parsed.success) {
    parseOriginList(parsed.data.HTTP_CORS_ORIGINS);
    parseTrustedProxyList(parsed.data.HTTP_TRUSTED_PROXY_CIDRS);
    if (
      parsed.data.NODE_ENV === 'production' &&
      (!parsed.data.AUTH_JWT_PRIVATE_KEY || !parsed.data.AUTH_JWT_PUBLIC_KEY)
    ) {
      throw new Error(
        'Invalid environment configuration: AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY are required in production',
      );
    }
    if (
      parsed.data.NODE_ENV === 'production' &&
      parsed.data.AUTH_REFRESH_TOKEN_KEY.length < 43
    ) {
      throw new Error(
        'Invalid environment configuration: AUTH_REFRESH_TOKEN_KEY must contain at least 43 base64url characters in production',
      );
    }
    if (
      parsed.data.NODE_ENV === 'production' &&
      parsed.data.RESOURCE_CURSOR_SECRET.length < 43
    ) {
      throw new Error(
        'Invalid environment configuration: RESOURCE_CURSOR_SECRET must contain at least 43 characters in production',
      );
    }
    if (
      parsed.data.NODE_ENV === 'production' &&
      (!parsed.data.SMTP_HOST ||
        !parsed.data.SMTP_USER ||
        !parsed.data.SMTP_PASSWORD ||
        !parsed.data.SMTP_FROM)
    ) {
      throw new Error(
        'Invalid environment configuration: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM are required in production',
      );
    }
    return parsed.data;
  }

  const fields = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration: ${fields.join('; ')}`);
}
