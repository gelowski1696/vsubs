import { ApiEnvelope, CheckMobileUpdateParams, CheckMobileUpdateResponse, ClientOptions, CreateSubscriptionPayload, CustomerPayload, LoginResponse, MobileUpdateEventPayload } from './types';
export declare class SubscriptionsClient {
    private baseUrl;
    private clientId;
    private accessToken?;
    private apiKey?;
    constructor(options: ClientOptions);
    setAccessToken(token?: string): void;
    private request;
    login(email: string, password: string): Promise<LoginResponse>;
    getCustomers(params?: Record<string, string>): Promise<ApiEnvelope<any[]>>;
    createCustomer(payload: CustomerPayload): Promise<ApiEnvelope<unknown>>;
    getPlans(params?: Record<string, string>): Promise<ApiEnvelope<any[]>>;
    createSubscription(payload: CreateSubscriptionPayload): Promise<ApiEnvelope<unknown>>;
    pauseSubscription(id: string, payload?: any): Promise<ApiEnvelope<unknown>>;
    resumeSubscription(id: string, payload?: any): Promise<ApiEnvelope<unknown>>;
    cancelSubscription(id: string, payload?: any): Promise<ApiEnvelope<unknown>>;
    getEndingSoon(days?: number): Promise<ApiEnvelope<any[]>>;
    evaluateExpirations(): Promise<ApiEnvelope<unknown>>;
    checkMobileUpdate(params: CheckMobileUpdateParams): Promise<ApiEnvelope<CheckMobileUpdateResponse>>;
    logMobileUpdateEvent(payload: MobileUpdateEventPayload): Promise<ApiEnvelope<unknown>>;
}
