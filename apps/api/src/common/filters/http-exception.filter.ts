import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

export interface ErrorDetail {
  code: string;
  message: string | string[];
}

export interface ErrorEnvelope {
  success: boolean;
  error: ErrorDetail;
  requestId?: string;
  timestamp: string;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'An unexpected error occurred';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorCode = resObj.error || HttpStatus[status] || 'ERROR';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    // Map common HTTP statuses to clean uppercase codes
    if (status === HttpStatus.BAD_REQUEST && errorCode === 'ERROR') errorCode = 'BAD_REQUEST';
    if (status === HttpStatus.UNAUTHORIZED) errorCode = 'UNAUTHORIZED';
    if (status === HttpStatus.FORBIDDEN) errorCode = 'FORBIDDEN';
    if (status === HttpStatus.NOT_FOUND) errorCode = 'NOT_FOUND';
    if (status === HttpStatus.CONFLICT) errorCode = 'CONFLICT';

    const envelope: ErrorEnvelope = {
      success: false,
      error: {
        code: errorCode,
        message,
      },
      requestId: (request.headers['x-request-id'] as string) || undefined,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(envelope);
  }
}
