import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('NestJS Backend Starter API')
    .setDescription('REST API contract for the NestJS backend starter.')
    .setVersion('1.0.0')
    .setOpenAPIVersion('3.1.0')
    .addBearerAuth()
    .build();
  Object.assign(config, {
    jsonSchemaDialect: 'https://spec.openapis.org/oas/3.1/dialect/base',
  });

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controller, method) => method,
  });
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ProblemDetails = {
    type: 'object',
    required: ['type', 'title', 'status', 'code', 'requestId'],
    properties: {
      type: { type: 'string', format: 'uri' },
      title: { type: 'string' },
      status: { type: 'integer' },
      code: { type: 'string' },
      requestId: { type: 'string' },
      detail: { type: 'string' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          required: ['path', 'code', 'message'],
          properties: {
            path: { type: 'array', items: { type: 'string' } },
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  };
  const httpMethods = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'options',
    'head',
    'trace',
  ] as const;
  for (const pathItem of Object.values(document.paths)) {
    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;
      for (const response of Object.values(operation.responses ?? {})) {
        if (!response || '$ref' in response) continue;
        response.headers ??= {};
        response.headers['X-Request-ID'] = {
          description: 'Request correlation identifier.',
          schema: { type: 'string' },
        };
      }
    }
  }
  return document;
}

export function setupOpenApi(
  app: INestApplication,
  document: OpenAPIObject,
  enableUi: boolean,
): void {
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: false,
    jsonDocumentUrl: '/openapi.json',
    yamlDocumentUrl: '/openapi.yaml',
    raw: ['json', 'yaml'],
    ui: enableUi,
    swaggerUiEnabled: enableUi,
    swaggerOptions: { persistAuthorization: false },
  });
}
