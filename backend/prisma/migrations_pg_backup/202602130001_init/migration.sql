-- Initial migration for SubMan
-- If schema changes are made, run: npm run -w backend prisma:migrate

CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE "PlanInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED', 'TRIALING');
CREATE TYPE "WebhookEvent" AS ENUM ('subscription_created', 'subscription_updated', 'subscription_canceled', 'subscription_expired', 'subscription_renewed');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "refreshTokenHash" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Customer" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Plan" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "interval" "PlanInterval" NOT NULL,
  "intervalCount" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "nextBillingDate" TIMESTAMP,
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "WebhookEndpoint" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" "WebhookEvent"[] NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "WebhookDelivery" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "event" "WebhookEvent" NOT NULL,
  "payload" JSONB NOT NULL,
  "signature" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "nextRetryAt" TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "ApiClient" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "apiKeyHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "User_clientId_email_key" ON "User"("clientId", "email");
CREATE UNIQUE INDEX "Customer_clientId_email_key" ON "Customer"("clientId", "email");
CREATE INDEX "Subscription_clientId_status_idx" ON "Subscription"("clientId", "status");
CREATE INDEX "Subscription_clientId_nextBillingDate_idx" ON "Subscription"("clientId", "nextBillingDate");
CREATE INDEX "Subscription_clientId_endDate_idx" ON "Subscription"("clientId", "endDate");