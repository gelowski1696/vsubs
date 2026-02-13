"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsClient = void 0;
class SubscriptionsClient {
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.clientId = options.clientId;
        this.accessToken = options.accessToken;
        this.apiKey = options.apiKey;
    }
    setAccessToken(token) {
        this.accessToken = token;
    }
    async request(path, init = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-Id': this.clientId,
            ...init.headers,
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
            const error = new Error(body?.error?.message ?? 'Request failed');
            error.status = response.status;
            error.details = body;
            throw error;
        }
        return body;
    }
    async login(email, password) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.accessToken = res.data.accessToken;
        return res.data;
    }
    getCustomers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/customers${query ? `?${query}` : ''}`);
    }
    createCustomer(payload) {
        return this.request('/customers', { method: 'POST', body: JSON.stringify(payload) });
    }
    getPlans(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/plans${query ? `?${query}` : ''}`);
    }
    createSubscription(payload) {
        return this.request('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    }
    pauseSubscription(id, payload = {}) {
        return this.request(`/subscriptions/${id}/pause`, { method: 'POST', body: JSON.stringify(payload) });
    }
    resumeSubscription(id, payload = {}) {
        return this.request(`/subscriptions/${id}/resume`, { method: 'POST', body: JSON.stringify(payload) });
    }
    cancelSubscription(id, payload = {}) {
        return this.request(`/subscriptions/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) });
    }
    getEndingSoon(days = 7) {
        return this.request(`/subscriptions/ending-soon?days=${days}`);
    }
    evaluateExpirations() {
        return this.request('/subscriptions/evaluate-expirations', { method: 'POST', body: '{}' });
    }
    checkMobileUpdate(params) {
        const query = new URLSearchParams({
            platform: params.platform,
            appVersion: params.appVersion,
            bundleVersion: params.bundleVersion,
            ...(params.channel ? { channel: params.channel } : {}),
        }).toString();
        return this.request(`/mobile-updates/check?${query}`);
    }
    logMobileUpdateEvent(payload) {
        return this.request('/mobile-updates/events', { method: 'POST', body: JSON.stringify(payload) });
    }
}
exports.SubscriptionsClient = SubscriptionsClient;
