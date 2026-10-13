import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  type SchemaObject,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  createOrganizationSchema,
  organizationIdSchema,
  updateOrganizationSchema,
} from './organization.schemas.js';
import { OrganizationService } from './organization.service.js';

const organizationSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'name', 'slug', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', maxLength: 200 },
    slug: { type: 'string', maxLength: 100 },
    status: { type: 'string', enum: ['active', 'suspended', 'archived'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const membershipSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'role', 'status'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    role: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['active', 'suspended'] },
  },
};

const organizationCreateResponseSchema: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'name',
    'slug',
    'status',
    'createdAt',
    'updatedAt',
    'membership',
  ],
  properties: {
    ...organizationSchema.properties,
    membership: {
      ...membershipSchema,
      properties: {
        ...membershipSchema.properties,
        role: { type: 'string', enum: ['OWNER'] },
      },
    },
  },
};

const organizationListItemSchema: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'name',
    'slug',
    'status',
    'createdAt',
    'updatedAt',
    'membership',
  ],
  properties: {
    ...organizationSchema.properties,
    membership: membershipSchema,
  },
};

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationService) {}

  @Post()
  @ApiOperation({
    operationId: 'createOrganization',
    summary: 'Create an organization',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        name: { type: 'string', maxLength: 200 },
        slug: { type: 'string', maxLength: 100 },
      },
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    description: 'Organization and OWNER membership created atomically.',
    schema: organizationCreateResponseSchema,
  })
  create(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(createOrganizationSchema))
    body: typeof createOrganizationSchema._output,
  ) {
    return this.organizations.create(request.identity!.userId, body);
  }

  @Get()
  @ApiOperation({
    operationId: 'listOrganizations',
    summary: 'List the current user’s organizations',
  })
  @ApiOkResponse({
    description: 'Organizations the authenticated user belongs to.',
    schema: { type: 'array', items: organizationListItemSchema },
  })
  list(@Req() request: FastifyRequest) {
    return this.organizations.listForUser(request.identity!.userId);
  }

  @Get(':organizationId')
  @ApiOperation({
    operationId: 'getOrganization',
    summary: 'Get an organization',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({ schema: organizationSchema })
  get(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
  ) {
    return this.organizations.get(request.identity!.userId, organizationId);
  }

  @Patch(':organizationId')
  @ApiOperation({
    operationId: 'updateOrganization',
    summary: 'Update an organization',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 200 },
        slug: { type: 'string', maxLength: 100 },
      },
      minProperties: 1,
      additionalProperties: false,
    },
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({ schema: organizationSchema })
  update(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema))
    body: typeof updateOrganizationSchema._output,
  ) {
    return this.organizations.update(
      request.identity!.userId,
      organizationId,
      body,
    );
  }

  @Post(':organizationId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'suspendOrganization',
    summary: 'Suspend an organization',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({ schema: organizationSchema })
  suspend(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
  ) {
    return this.organizations.changeStatus(
      request.identity!.userId,
      organizationId,
      'suspend',
    );
  }

  @Post(':organizationId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'archiveOrganization',
    summary: 'Archive an organization',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({ schema: organizationSchema })
  archive(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
  ) {
    return this.organizations.changeStatus(
      request.identity!.userId,
      organizationId,
      'archive',
    );
  }

  @Post(':organizationId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'activateOrganization',
    summary: 'Reactivate a suspended organization',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({ schema: organizationSchema })
  activate(
    @Req() request: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    organizationId: string,
  ) {
    return this.organizations.changeStatus(
      request.identity!.userId,
      organizationId,
      'activate',
    );
  }
}
