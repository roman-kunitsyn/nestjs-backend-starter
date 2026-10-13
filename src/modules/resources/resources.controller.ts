import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  applyDecorators,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiTags,
  type SchemaObject,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { organizationIdSchema } from '../organizations/organization.schemas.js';
import {
  createResourceSchema,
  idempotencyKeySchema,
  resourceIdSchema,
  resourceListQuerySchema,
  updateResourceSchema,
} from './resource.schemas.js';
import { ResourcesService } from './resources.service.js';

const resourceSchema: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'organizationId',
    'createdByMembershipId',
    'title',
    'description',
    'status',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    createdByMembershipId: { type: 'string', format: 'uuid' },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['active', 'archived'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const problemSchema = {
  $ref: '#/components/schemas/ProblemDetails',
} as const;
const resourceErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: 'Invalid request.',
      schema: problemSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication is required.',
      schema: problemSchema,
    }),
    ApiForbiddenResponse({
      description: 'The active organization role cannot perform this action.',
      schema: problemSchema,
    }),
    ApiNotFoundResponse({
      description: 'The resource does not exist in this organization.',
      schema: problemSchema,
    }),
  );

@ApiTags('Example resources')
@ApiBearerAuth()
@Controller('organizations/:organizationId/resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Post()
  @ApiOperation({
    operationId: 'createExampleResource',
    summary: 'Create a resource',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 200 },
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', nullable: true, maxLength: 10000 },
      },
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({ schema: resourceSchema })
  @ApiBadRequestResponse({
    description: 'Invalid body, organization, or Idempotency-Key.',
    schema: problemSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
    schema: problemSchema,
  })
  @ApiForbiddenResponse({
    description: 'Resource creation is not permitted.',
    schema: problemSchema,
  })
  @ApiConflictResponse({
    description: 'The idempotency key was used with a different request.',
    schema: problemSchema,
  })
  create(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
    @Body(new ZodValidationPipe(createResourceSchema))
    body: typeof createResourceSchema._output,
  ) {
    const value = request.headers['idempotency-key'];
    const key = new ZodValidationPipe(idempotencyKeySchema).transform(value);
    return this.resources.create(
      request.identity!.userId,
      organizationId,
      key,
      body,
    );
  }

  @Get()
  @ApiOperation({
    operationId: 'listExampleResources',
    summary: 'List tenant resources',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    schema: { type: 'string', maxLength: 2048 },
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    schema: { type: 'string', enum: ['createdAt'], default: 'createdAt' },
  })
  @ApiQuery({
    name: 'order',
    required: false,
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  })
  @ApiQuery({
    name: 'status',
    required: false,
    schema: { type: 'string', enum: ['active', 'archived'] },
  })
  @ApiQuery({
    name: 'q',
    required: false,
    schema: { type: 'string', maxLength: 200 },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['items', 'pageInfo'],
      properties: {
        items: { type: 'array', items: resourceSchema },
        pageInfo: {
          type: 'object',
          required: ['hasNextPage', 'nextCursor'],
          properties: {
            hasNextPage: { type: 'boolean' },
            nextCursor: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @resourceErrors()
  list(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
    @Query(new ZodValidationPipe(resourceListQuerySchema))
    query: typeof resourceListQuerySchema._output,
  ) {
    return this.resources.list(request.identity!.userId, organizationId, query);
  }

  @Get(':resourceId')
  @ApiOperation({
    operationId: 'getExampleResource',
    summary: 'Get a tenant resource',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({ name: 'resourceId', schema: { type: 'string', format: 'uuid' } })
  @ApiOkResponse({ schema: resourceSchema })
  @resourceErrors()
  get(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('resourceId', new ZodValidationPipe(resourceIdSchema)) id: string,
  ) {
    return this.resources.get(request.identity!.userId, orgId, id);
  }

  @Patch(':resourceId')
  @ApiOperation({
    operationId: 'updateExampleResource',
    summary: 'Update a tenant resource',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({ name: 'resourceId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({
    schema: {
      type: 'object',
      minProperties: 1,
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', nullable: true, maxLength: 10000 },
        status: { type: 'string', enum: ['active', 'archived'] },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse({ schema: resourceSchema })
  @resourceErrors()
  update(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('resourceId', new ZodValidationPipe(resourceIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateResourceSchema))
    body: typeof updateResourceSchema._output,
  ) {
    return this.resources.update(request.identity!.userId, orgId, id, body);
  }

  @Delete(':resourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'deleteExampleResource',
    summary: 'Delete a tenant resource',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({ name: 'resourceId', schema: { type: 'string', format: 'uuid' } })
  @ApiNoContentResponse()
  @resourceErrors()
  delete(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('resourceId', new ZodValidationPipe(resourceIdSchema)) id: string,
  ) {
    return this.resources.delete(request.identity!.userId, orgId, id);
  }
}
