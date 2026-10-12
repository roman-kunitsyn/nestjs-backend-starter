import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
@ApiTags('Users')
@Controller('users')
@UseGuards(SessionGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly auth: AuthService) {}
  @Get('me') me(@Req() request: FastifyRequest) {
    return this.auth.profile(request.identity!.userId);
  }
}
