import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { TokenStorageService } from './token-storage.service';
import { resolveApiBaseUrl } from '../config/api-base-url';
import { ToastService } from '../ui/toast.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  baseUrl = resolveApiBaseUrl();
  clientId = 'subman-mobile';
  private handlingSessionExpiry = false;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}

  async login(email: string, password: string) {
    const res: any = await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/login`, { email, password }, { headers: { 'X-Client-Id': this.clientId } }),
    );
    await this.tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
  }

  async logout() {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await firstValueFrom(
          this.http.post(
            `${this.baseUrl}/auth/logout`,
            { refreshToken },
            { headers: { 'X-Client-Id': this.clientId } },
          ),
        );
      }
    } catch {
      // Best-effort server logout. Local token cleanup still proceeds.
    } finally {
      await this.tokenStorage.clear();
    }
  }

  async isAuthenticated() {
    return Boolean(await this.tokenStorage.getAccessToken());
  }

  async refreshAccessToken() {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    try {
      const res: any = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/auth/refresh`,
          { refreshToken },
          { headers: { 'X-Client-Id': this.clientId } },
        ),
      );
      const access = res.data.accessToken;
      const nextRefresh = res.data.refreshToken ?? refreshToken;
      await this.tokenStorage.setTokens(access, nextRefresh);
      return access;
    } catch {
      return null;
    }
  }

  async handleSessionExpired(): Promise<void> {
    if (this.handlingSessionExpiry) {
      return;
    }
    this.handlingSessionExpiry = true;

    try {
      await this.tokenStorage.clear();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
      await this.toast.info('Session expired. Please sign in again.');
    } finally {
      this.handlingSessionExpiry = false;
    }
  }
}
