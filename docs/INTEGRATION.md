# Integration

## SDK
Package: `packages/subscriptions-client`

```ts
import { SubscriptionsClient } from 'subscriptions-client';

const client = new SubscriptionsClient({
  baseUrl: 'http://localhost:3003/v1',
  clientId: 'subman-mobile',
});

const login = await client.login('admin@vmjam.com', 'Admin123!');
client.setAccessToken(login.accessToken);
const endingSoon = await client.getEndingSoon(7);

const update = await client.checkMobileUpdate({
  platform: 'android',
  channel: 'stable',
  appVersion: '1.0.0',
  bundleVersion: 'web-1.0.0',
});
if (update.data.updateAvailable) {
  await client.logMobileUpdateEvent({
    releaseId: update.data.bundle?.id,
    eventType: 'CHECKED',
    appVersion: '1.0.0',
    bundleVersion: 'web-1.0.0',
  });
}
```

## API Key mode
```ts
const client = new SubscriptionsClient({
  baseUrl: 'http://localhost:3003/v1',
  clientId: 'subman-mobile',
  apiKey: 'sm_xxx',
});
```

## Webhook Signature Verification
- Header: `X-SubMan-Signature`
- Algorithm: HMAC SHA256 of raw request body using endpoint secret.
