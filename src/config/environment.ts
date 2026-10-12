import { z } from 'zod';

const EnvironmentInputSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_NAME: z.string().trim().min(1).max(80).default('nestjs-backend-starter'),
  APP_HOST: z.string().trim().min(1).default('127.0.0.1'),
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
});

export const EnvironmentSchema = EnvironmentInputSchema.transform((config) => ({
  ...config,
  API_DOCS_ENABLED: config.API_DOCS_ENABLED ?? config.NODE_ENV !== 'production',
}));

export type EnvironmentConfig = z.output<typeof EnvironmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentConfig {
  const parsed = EnvironmentSchema.safeParse(config);
  if (parsed.success) return parsed.data;

  const fields = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration: ${fields.join('; ')}`);
}
