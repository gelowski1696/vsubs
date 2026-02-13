# Architecture

SubMan is a multi-tenant monorepo:
- `backend`: NestJS API + Prisma + SQLite
- `mobile`: Ionic Angular + Tailwind + Capacitor
- `packages/subscriptions-client`: reusable TS SDK

## Tenant Isolation
All protected endpoints require `X-Client-Id`. All persistence queries include `clientId` filters.

## Authentication
- JWT access + refresh for user sessions
- Optional API key auth (`X-API-Key`) for server-to-server
- Roles: `ADMIN`, `STAFF`

## Lifecycle Engine
Subscription operations compute and maintain `nextBillingDate` based on plan interval and count. Daily scheduler evaluates renewals and expirations.

## Webhooks
Events are queued in `webhook_deliveries`, signed with HMAC SHA256, and retried with exponential backoff.
