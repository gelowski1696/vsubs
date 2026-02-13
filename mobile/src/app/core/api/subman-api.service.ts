import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiBaseUrl } from '../config/api-base-url';

@Injectable({ providedIn: 'root' })
export class SubmanApiService {
  baseUrl = resolveApiBaseUrl();

  constructor(private readonly http: HttpClient) {}

  getCustomers(params: any = {}) {
    return firstValueFrom(this.http.get(`${this.baseUrl}/customers`, { params }));
  }

  createCustomer(payload: any) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/customers`, payload));
  }

  updateCustomer(id: string, payload: any) {
    return firstValueFrom(this.http.patch(`${this.baseUrl}/customers/${id}`, payload));
  }

  deleteCustomer(id: string) {
    return firstValueFrom(this.http.delete(`${this.baseUrl}/customers/${id}`));
  }

  getPlans(params: any = {}) {
    return firstValueFrom(this.http.get(`${this.baseUrl}/plans`, { params }));
  }

  createPlan(payload: any) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/plans`, payload));
  }

  updatePlan(id: string, payload: any) {
    return firstValueFrom(this.http.patch(`${this.baseUrl}/plans/${id}`, payload));
  }

  deletePlan(id: string) {
    return firstValueFrom(this.http.delete(`${this.baseUrl}/plans/${id}`));
  }

  createSubscription(payload: any) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/subscriptions`, payload));
  }

  updateSubscription(id: string, payload: any) {
    return firstValueFrom(this.http.patch(`${this.baseUrl}/subscriptions/${id}`, payload));
  }

  listSubscriptions(params: any = {}) {
    return firstValueFrom(this.http.get(`${this.baseUrl}/subscriptions`, { params }));
  }

  pauseSubscription(id: string) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/subscriptions/${id}/pause`, {}));
  }

  resumeSubscription(id: string) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/subscriptions/${id}/resume`, {}));
  }

  cancelSubscription(id: string, reason?: string) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/subscriptions/${id}/cancel`, { reason }));
  }

  getEndingSoon(days = 7) {
    return firstValueFrom(this.http.get(`${this.baseUrl}/subscriptions/ending-soon`, { params: { days } }));
  }

  evaluateExpirations() {
    return firstValueFrom(this.http.post(`${this.baseUrl}/subscriptions/evaluate-expirations`, {}));
  }

  checkMobileUpdate(params: {
    platform: 'android';
    channel?: 'stable' | 'beta';
    appVersion: string;
    bundleVersion: string;
  }) {
    const queryParams: Record<string, string> = {
      platform: params.platform,
      appVersion: params.appVersion,
      bundleVersion: params.bundleVersion,
      ...(params.channel ? { channel: params.channel } : {}),
    };
    return firstValueFrom(this.http.get(`${this.baseUrl}/mobile-updates/check`, { params: queryParams }));
  }

  logMobileUpdateEvent(payload: {
    releaseId?: string;
    eventType: 'CHECKED' | 'DOWNLOADED' | 'APPLIED' | 'FAILED';
    appVersion: string;
    bundleVersion: string;
    deviceId?: string;
    message?: string;
  }) {
    return firstValueFrom(this.http.post(`${this.baseUrl}/mobile-updates/events`, payload));
  }
}
