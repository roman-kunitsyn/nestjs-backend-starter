import {
  CanActivate,
  BadRequestException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC, REQUIRED_PERMISSIONS } from './access-control.js';
import { JwtService } from './jwt.service.js';
import { PermissionService } from './permission.service.js';
import { SessionService } from './session.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: { userId: string; sessionId: string };
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly permissions: PermissionService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'A valid access token is required',
      });
    const identity = await this.jwt.verify(header.slice(7));
    await this.sessions.validate(identity.userId, identity.sessionId);
    request.identity = identity;
    const required = this.reflector.getAllAndOverride<readonly string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (required?.length) {
      const params = request.params as Record<string, unknown>;
      const organizationId = params.organizationId ?? params.orgId;
      if (typeof organizationId !== 'string') {
        throw new BadRequestException({
          code: 'ORGANIZATION_CONTEXT_REQUIRED',
          message: 'A valid organization context is required',
        });
      }
      await this.permissions.assertAll(
        identity.userId,
        organizationId,
        required,
      );
    }
    return true;
  }
}
