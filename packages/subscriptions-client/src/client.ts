import {
  ApiEnvelope,
  CheckMobileUpdateParams,
  CheckMobileUpdateResponse,
  ClientOptions,
  CreateSubscriptionPayload,
  CustomerPayload,
  LoginResponse,
  MobileUpdateEventPayload,
} from './types';

export class SubscriptionsClient {
  private baseUrl: string;
  private clientId: string;
  private accessToken?: string;
  private apiKey?: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.clientId = options.clientId;
    this.accessToken = options.accessToken;
    this.apiKey = options.apiKey;
  }

  setAccessToken(token?: string) {
    this.accessToken = token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': this.clientId,
      ...(init.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const body = await response.json();

    if (!response.ok) {
      const error = new Error(body?.error?.message ?? 'Request failed') as Error & {
        status?: number;
        details?: unknown;
      };
      error.status = response.status;
      error.details = body;
      throw error;
    }

    return body;
  }

  async login(email: string, password: string) {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.accessToken = res.data.accessToken;
    return res.data;
  }

  getCustomers(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/customers${query ? `?${query}` : ''}`);
  }

  createCustomer(payload: CustomerPayload) {
    return this.request('/customers', { method: 'POST', body: JSON.stringify(payload) });
  }

  getPlans(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/plans${query ? `?${query}` : ''}`);
  }

  createSubscription(payload: CreateSubscriptionPayload) {
    return this.request('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
  }

  pauseSubscription(id: string, payload: any = {}) {
    return this.request(`/subscriptions/${id}/pause`, { method: 'POST', body: JSON.stringify(payload) });
  }

  resumeSubscription(id: string, payload: any = {}) {
    return this.request(`/subscriptions/${id}/resume`, { method: 'POST', body: JSON.stringify(payload) });
  }

  cancelSubscription(id: string, payload: any = {}) {
    return this.request(`/subscriptions/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) });
  }

  getEndingSoon(days = 7) {
    return this.request<any[]>(`/subscriptions/ending-soon?days=${days}`);
  }

  evaluateExpirations() {
    return this.request('/subscriptions/evaluate-expirations', { method: 'POST', body: '{}' });
  }

  checkMobileUpdate(params: CheckMobileUpdateParams) {
    const query = new URLSearchParams({
      platform: params.platform,
      appVersion: params.appVersion,
      bundleVersion: params.bundleVersion,
      ...(params.channel ? { channel: params.channel } : {}),
    }).toString();
    return this.request<CheckMobileUpdateResponse>(`/mobile-updates/check?${query}`);
  }

  logMobileUpdateEvent(payload: MobileUpdateEventPayload) {
    return this.request('/mobile-updates/events', { method: 'POST', body: JSON.stringify(payload) });
  }
}
