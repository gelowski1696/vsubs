# API

Base URL: `/v1`

VPS example host: `http://168.231.103.231:3003/v1`

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

## Customers

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `DELETE /customers/:id`

## Plans

- CRUD under `/plans`

## Subscriptions

- CRUD under `/subscriptions`
- `POST /subscriptions/:id/pause`
- `POST /subscriptions/:id/resume`
- `POST /subscriptions/:id/cancel`
- `GET /subscriptions/ending-soon?days=7`
- `GET /subscriptions/expired?since=YYYY-MM-DD`
- `POST /subscriptions/evaluate-expirations`

## Webhooks + API Clients

CRUD under `/webhooks` and `/api-clients` (ADMIN role).

## Mobile Updates (OTA)

- `GET /mobile-updates/check?platform=android&channel=stable&appVersion=1.0.0&bundleVersion=web-1.0.0`
- `POST /mobile-updates/events`
- `GET /mobile-updates/releases` (ADMIN)
- `POST /mobile-updates/releases` (ADMIN)
- `POST /mobile-updates/releases/:id/upload` (ADMIN, multipart `bundle` zip)
- `PATCH /mobile-updates/releases/:id/publish` (ADMIN)
- `GET /mobile-updates/releases/:id/bundle`

## Payments

Payments module is intentionally not enabled in this build.

## Headers

Protected endpoints require:

- `X-Client-Id`
- `Authorization: Bearer <token>` or `X-API-Key: <key>`
