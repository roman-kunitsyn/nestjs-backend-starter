import { RequestMethod, type INestApplication } from '@nestjs/common';

export const API_PREFIX = 'api/v1';
export const API_BODY_LIMIT_BYTES = 1024 * 1024;

/** Apply the versioned business API prefix while reserving health URLs. */
export function configureApiRouting(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/live', method: RequestMethod.ALL },
      { path: 'health/ready', method: RequestMethod.ALL },
      { path: 'health/startup', method: RequestMethod.ALL },
      { path: 'health/metrics', method: RequestMethod.ALL },
    ],
  });
}
