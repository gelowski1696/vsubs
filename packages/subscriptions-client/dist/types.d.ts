export type ClientOptions = {
    baseUrl: string;
    clientId: string;
    accessToken?: string;
    apiKey?: string;
};
export type ApiEnvelope<T> = {
    success: boolean;
    data: T;
    meta?: any;
    requestId?: string;
    timestamp?: string;
};
export type LoginResponse = {
    user: {
        id: string;
        email: string;
        role: string;
    };
    accessToken: string;
    refreshToken: string;
};
export type CustomerPayload = {
    fullName: string;
    email?: string;
    phone?: string;
    storeName?: string;
    storeLocation?: string;
    notes?: string;
};
export type CreateSubscriptionPayload = {
    customerId: string;
    planId: string;
    startDate: string;
    endDate?: string;
    autoRenew?: boolean;
};
export type CheckMobileUpdateParams = {
    platform: 'android';
    channel?: 'stable' | 'beta';
    appVersion: string;
    bundleVersion: string;
};
export type CheckMobileUpdateResponse = {
    updateAvailable: boolean;
    latestAppVersion: string;
    minimumSupportedAppVersion: string | null;
    mandatory: boolean;
    releaseNotes: string | null;
    bundle: {
        id: string;
        url: string;
        checksumSha256: string;
        sizeBytes: number;
    } | null;
};
export type MobileUpdateEventPayload = {
    releaseId?: string;
    eventType: 'CHECKED' | 'DOWNLOADED' | 'APPLIED' | 'FAILED';
    appVersion: string;
    bundleVersion: string;
    deviceId?: string;
    message?: string;
};
