import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message = typeof payload === 'string' ? payload : (payload as any).message ?? exception.message;
      return response.status(status).json({
        success: false,
        error: {
          code: `HTTP_${status}`,
          message,
          details: typeof payload === 'object' ? payload : undefined,
        },
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected error occurred',
        details:
          exception instanceof Error
            ? { name: exception.name, message: exception.message }
            : undefined,
      },
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
