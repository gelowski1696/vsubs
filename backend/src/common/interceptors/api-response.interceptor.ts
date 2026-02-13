import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((value) => {
        if (value?.success !== undefined) {
          return value;
        }
        if (value?.data !== undefined && value?.meta !== undefined) {
          return {
            success: true,
            data: value.data,
            meta: value.meta,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: true,
          data: value,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}