import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }
    } else if (exception instanceof Error) {
      // Log del error para debugging
      console.error('❌ Error no manejado:', {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        path: request.url,
        method: request.method,
      });

      // Si es un error de Prisma, dar mensaje genérico
      if (exception.name?.includes('Prisma')) {
        message = 'Error de base de datos';
      } else {
        message = exception.message || message;
      }
    }

    // Log de la respuesta de error
    console.log(`❌ ${request.method} ${request.url} - ${status} - ${message}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

