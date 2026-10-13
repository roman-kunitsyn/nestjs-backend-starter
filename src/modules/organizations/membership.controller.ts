import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { organizationIdSchema } from './organization.schemas.js';
import {
  invitationAcceptSchema,
  invitationCreateSchema,
  invitationIdSchema,
  memberIdSchema,
  memberRoleUpdateSchema,
  ownershipTransferSchema,
} from './membership.schemas.js';
import { MembershipService } from './membership.service.js';

@ApiTags('Organization memberships and invitations')
@ApiBearerAuth()
@Controller()
export class MembershipController {
  constructor(private readonly memberships: MembershipService) {}

  @Get('organizations/:organizationId/members')
  @ApiOperation({
    operationId: 'listOrganizationMembers',
    summary: 'List organization members',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse({
    description: 'Members visible to an authorized organization member.',
  })
  list(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
  ) {
    return this.memberships.list(req.identity!.userId, orgId);
  }

  @Patch('organizations/:organizationId/members/:membershipId')
  @ApiOperation({
    operationId: 'updateOrganizationMemberRole',
    summary: 'Change a member role',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'membershipId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse()
  updateRole(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('membershipId', new ZodValidationPipe(memberIdSchema)) id: string,
    @Body(new ZodValidationPipe(memberRoleUpdateSchema))
    body: typeof memberRoleUpdateSchema._output,
  ) {
    return this.memberships.updateRole(
      req.identity!.userId,
      orgId,
      id,
      body.role,
    );
  }

  @Delete('organizations/:organizationId/members/:membershipId')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'removeOrganizationMember',
    summary: 'Remove a member',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'membershipId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiNoContentResponse()
  async remove(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('membershipId', new ZodValidationPipe(memberIdSchema)) id: string,
  ) {
    await this.memberships.remove(req.identity!.userId, orgId, id);
  }

  @Post('organizations/:organizationId/leave')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'leaveOrganization',
    summary: 'Leave an organization',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse()
  leave(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
  ) {
    return this.memberships.leave(req.identity!.userId, orgId);
  }

  @Post('organizations/:organizationId/ownership-transfer')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'transferOrganizationOwnership',
    summary: 'Transfer organization ownership',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['membershipId'],
      properties: { membershipId: { type: 'string', format: 'uuid' } },
      additionalProperties: false,
    },
  })
  @ApiOkResponse()
  transfer(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Body(new ZodValidationPipe(ownershipTransferSchema))
    body: typeof ownershipTransferSchema._output,
  ) {
    return this.memberships.transferOwnership(
      req.identity!.userId,
      orgId,
      body.membershipId,
    );
  }

  @Post('organizations/:organizationId/invitations')
  @ApiOperation({
    operationId: 'createOrganizationInvitation',
    summary: 'Invite a person by email',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'role'],
      properties: {
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
      },
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse()
  invite(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Body(new ZodValidationPipe(invitationCreateSchema))
    body: typeof invitationCreateSchema._output,
  ) {
    return this.memberships.invite(req.identity!.userId, orgId, body);
  }

  @Get('organizations/:organizationId/invitations')
  @ApiOperation({
    operationId: 'listOrganizationInvitations',
    summary: 'List organization invitations',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOkResponse()
  listInvitations(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
  ) {
    return this.memberships.listInvitations(req.identity!.userId, orgId);
  }

  @Delete('organizations/:organizationId/invitations/:invitationId')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'revokeOrganizationInvitation',
    summary: 'Revoke an invitation',
  })
  @ApiParam({
    name: 'organizationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'invitationId',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiNoContentResponse()
  async revoke(
    @Req() req: FastifyRequest,
    @Param('organizationId', new ZodValidationPipe(organizationIdSchema))
    orgId: string,
    @Param('invitationId', new ZodValidationPipe(invitationIdSchema))
    id: string,
  ) {
    await this.memberships.revoke(req.identity!.userId, orgId, id);
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'acceptOrganizationInvitation',
    summary: 'Accept an invitation for the authenticated account',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: { token: { type: 'string', minLength: 32 } },
      additionalProperties: false,
    },
  })
  @ApiOkResponse()
  accept(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(invitationAcceptSchema))
    body: typeof invitationAcceptSchema._output,
  ) {
    return this.memberships.accept(req.identity!.userId, body.token);
  }
}
