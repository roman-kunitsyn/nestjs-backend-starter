import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import {
  defaultProblemCode,
  problemTitle,
  type ProblemDetails,
} from '../http/problem-details.js';

type ExceptionPayload = {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
  issues?: unknown;
  errors?: unknown;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ProblemDetailsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const requestId = request.id;
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof payload === 'object' && payload !== null
        ? (payload as ExceptionPayload)
        : undefined;
    const rawCode = body?.code;
    const code =
      typeof rawCode === 'string' ? rawCode : defaultProblemCode(status);
    const issues = Array.isArray(body?.issues) ? body.issues : undefined;
    const validationIssues = Array.isArray(body?.errors)
      ? body.errors
      : undefined;
    const normalizedIssues = issues
      ? (issues as NonNullable<ProblemDetails['issues']>)
      : validationIssues
        ? (validationIssues as NonNullable<ProblemDetails['issues']>)
        : undefined;
    const message =
      typeof body?.message === 'string' ? body.message : undefined;
    const safeDetail =
      status < 500
        ? typeof body?.detail === 'string'
          ? body.detail
          : message
        : undefined;
    const problem: ProblemDetails = {
      type: `https://api.example.com/problems/${code.toLowerCase()}`,
      title: problemTitle(status),
      status,
      code,
      requestId,
      ...(safeDetail ? { detail: safeDetail } : {}),
      ...(normalizedIssues ? { issues: normalizedIssues } : {}),
    };

    if (status >= 500) {
      this.logger.error(
        { err: exception, requestId, method: request.method, url: request.url },
        'Unhandled request exception',
      );
    } else {
      this.logger.warn(
        { requestId, status, code, method: request.method, url: request.url },
        'Request failed',
      );
    }

    reply
      .header('X-Request-ID', requestId)
      .header('Content-Type', 'application/problem+json; charset=utf-8')
      .code(status)
      .send(problem);
  }
}
