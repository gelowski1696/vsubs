import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshInterceptor implements HttpInterceptor {
  private refreshing: Promise<string | null> | null = null;

  constructor(private readonly auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
          return throwError(() => error);
        }

        if (!this.refreshing) {
          this.refreshing = this.auth.refreshAccessToken().finally(() => {
            this.refreshing = null;
          });
        }

        return from(this.refreshing).pipe(
          switchMap((token) => {
            if (!token) {
              return throwError(() => error);
            }
            return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
          }),
        );
      }),
    );
  }
}