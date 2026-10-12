import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import {
  changePasswordSchema,
  confirmPasswordSchema,
  emailSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  tokenSchema,
} from './auth.schemas.js';
import { SessionService } from './session.service.js';
import { Public } from './access-control.js';

const COOKIE = 'refresh_token';
const cookieValue = (request: FastifyRequest) => {
  const header = request.headers.cookie;
  const value = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return value ? decodeURIComponent(value) : undefined;
};
const setCookie = (
  reply: FastifyReply,
  token: string | undefined,
  options: { secure: boolean; maxAge: number },
) => {
  const value = token
    ? `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${options.maxAge}; Path=/api/v1/auth; HttpOnly; SameSite=Lax${options.secure ? '; Secure' : ''}`
    : `${COOKIE}=; Max-Age=0; Path=/api/v1/auth; HttpOnly; SameSite=Lax${options.secure ? '; Secure' : ''}`;
  reply.header('set-cookie', value);
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}
  @Post('register')
  @Public()
  @ApiOperation({ operationId: 'registerUser', summary: 'Create an account' })
  register(
    @Body(new ZodValidationPipe(registerSchema))
    body: typeof registerSchema._output,
  ) {
    return this.auth.register(body);
  }
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  verifyEmail(
    @Body(new ZodValidationPipe(tokenSchema)) body: typeof tokenSchema._output,
  ) {
    return this.auth.verifyEmail(body.token);
  }
  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  resendVerification(
    @Body(new ZodValidationPipe(emailSchema)) body: typeof emailSchema._output,
  ) {
    return this.auth.resendVerification(body.email);
  }
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(
    @Body(new ZodValidationPipe(emailSchema)) body: typeof emailSchema._output,
  ) {
    return this.auth.forgotPassword(body.email);
  }
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body(new ZodValidationPipe(resetSchema)) body: typeof resetSchema._output,
  ) {
    return this.auth.resetPassword(body.token, body.password);
  }
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: typeof loginSchema._output,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.sessions.login(
      body.email,
      body.password,
      request.headers['user-agent'],
      request.ip,
    );
    setCookie(reply, result.refreshToken, this.sessions.cookieOptions());
    return {
      user: result.user,
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: 600,
    };
  }
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = cookieValue(request);
    if (!token) {
      setCookie(reply, undefined, this.sessions.cookieOptions());
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Refresh cookie is required',
      });
    }
    try {
      const result = await this.sessions.refresh(token);
      setCookie(reply, result.refreshToken, this.sessions.cookieOptions());
      return {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: 600,
      };
    } catch (error) {
      setCookie(reply, undefined, this.sessions.cookieOptions());
      throw error;
    }
  }
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const identity = request.identity!;
    const result = await this.sessions.logout(identity.sessionId);
    setCookie(reply, undefined, this.sessions.cookieOptions());
    return result;
  }
  @Post('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(confirmPasswordSchema))
    body: typeof confirmPasswordSchema._output,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.auth.confirmCurrentPassword(
      request.identity!.userId,
      body.currentPassword,
    );
    const result = await this.sessions.logoutAll(request.identity!.userId);
    setCookie(reply, undefined, this.sessions.cookieOptions());
    return result;
  }
  @Get('me')
  @ApiBearerAuth()
  me(@Req() request: FastifyRequest) {
    return this.auth.profile(request.identity!.userId);
  }
  @Get('sessions')
  @ApiBearerAuth()
  sessionsList(@Req() request: FastifyRequest) {
    return this.sessions.list(request.identity!.userId);
  }
  @Delete('sessions/:id')
  @ApiBearerAuth()
  revoke(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.sessions.revoke(request.identity!.userId, id);
  }
  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: typeof changePasswordSchema._output,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const identity = request.identity!;
    const changed = await this.auth.changePassword(
      identity.userId,
      body.currentPassword,
      body.newPassword,
    );
    setCookie(reply, undefined, this.sessions.cookieOptions());
    return changed;
  }
}
