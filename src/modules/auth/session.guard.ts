import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtService } from './jwt.service.js';
import { SessionService } from './session.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: { userId: string; sessionId: string };
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}
  async canActivate(context: ExecutionContext) {
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
    return true;
  }
}
