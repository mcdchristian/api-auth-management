import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface HttpExceptionResponse {
  message?: string | string[];
  statusCode?: number;
}

/** PostgreSQL SQLSTATE for unique_violation. */
const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse =
        exception.getResponse() as HttpExceptionResponse;
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse.message || exception.message;
    } else if (this.isUniqueViolation(exception)) {
      // Uniqueness is checked with a SELECT before the INSERT, which leaves a
      // window for two concurrent requests to both pass the check. The database
      // constraint is what actually holds the line — report it as the conflict
      // it is rather than as a server fault.
      status = HttpStatus.CONFLICT;
      message = 'Resource already exists';
      this.logger.warn(
        `Unique constraint violation on ${request.method} ${request.url}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      // Log unexpected errors with full stack trace
      this.logger.error(
        `Unexpected error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    });
  }

  private isUniqueViolation(exception: unknown): boolean {
    if (!(exception instanceof QueryFailedError)) {
      return false;
    }
    const driverError = exception.driverError as { code?: string } | undefined;
    return driverError?.code === PG_UNIQUE_VIOLATION;
  }
}
