import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ??
            exception.message);

      response.status(statusCode).json({
        success: false,
        statusCode,
        message,
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const map: Record<string, { statusCode: number; message: string }> = {
        P2002: {
          statusCode: HttpStatus.CONFLICT,
          message: 'Duplicate value violates a unique constraint.',
        },
        P2003: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record not found (foreign key constraint failed).',
        },
        P2025: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Requested record was not found.',
        },
      };
      const mapped = map[exception.code] ?? {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database error',
      };
      const statusCode = mapped.statusCode;
      response.status(statusCode).json({
        success: false,
        statusCode,
        message: mapped.message,
        code: exception.code,
        details: exception.message,
        meta: exception.meta,
      });
      return;
    }

    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      const statusCode =
        exception instanceof Prisma.PrismaClientValidationError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.SERVICE_UNAVAILABLE;
      response.status(statusCode).json({
        success: false,
        statusCode,
        message:
          exception instanceof Prisma.PrismaClientValidationError
            ? 'Invalid database input payload.'
            : 'Database error',
        details: exception.message,
      });
      return;
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    console.error('Unhandled exception:', exception);

    response.status(statusCode).json({
      success: false,
      statusCode,
      message: isProduction ? 'Internal server error' : message,
      path: request.url,
      ...(isProduction
        ? {}
        : {
            details:
              exception instanceof Error
                ? (exception.stack ?? exception.message)
                : exception,
          }),
    });
  }
}
