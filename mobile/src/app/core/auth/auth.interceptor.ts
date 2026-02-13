import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly tokens: TokenStorageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.tokens.getAccessToken()).pipe(
      switchMap((token) => {
        if (!token) return next.handle(req);
        return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
      }),
    );
  }
}