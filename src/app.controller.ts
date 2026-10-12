import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service.js';

@Controller()
@ApiTags('starter')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    operationId: 'getStarterMessage',
    summary: 'Get the starter message',
  })
  @ApiOkResponse({
    description: 'The starter response.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @ApiResponse({
    status: 400,
    description: 'Request is invalid.',
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/ProblemDetails' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error.',
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/ProblemDetails' },
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
