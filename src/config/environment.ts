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
