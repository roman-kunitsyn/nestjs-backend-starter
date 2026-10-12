import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import {
  emailSchema,
  registerSchema,
  resetSchema,
  tokenSchema,
} from './auth.schemas.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ operationId: 'registerUser', summary: 'Create an account' })
  register(
    @Body(new ZodValidationPipe(registerSchema))
    body: typeof registerSchema._output,
  ) {
    return this.auth.register(body);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'verifyEmail',
    summary: 'Verify an email address',
  })
  verifyEmail(
    @Body(new ZodValidationPipe(tokenSchema)) body: typeof tokenSchema._output,
  ) {
    return this.auth.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  resendVerification(
    @Body(new ZodValidationPipe(emailSchema)) body: typeof emailSchema._output,
  ) {
    return this.auth.resendVerification(body.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(
    @Body(new ZodValidationPipe(emailSchema)) body: typeof emailSchema._output,
  ) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body(new ZodValidationPipe(resetSchema)) body: typeof resetSchema._output,
  ) {
    return this.auth.resetPassword(body.token, body.password);
  }
}
