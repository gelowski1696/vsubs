export const ROLES = ['ADMIN', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export const PLAN_INTERVALS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED', 'TRIALING'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const WEBHOOK_EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_canceled',
  'subscription_expired',
  'subscription_renewed',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_DELIVERY_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];