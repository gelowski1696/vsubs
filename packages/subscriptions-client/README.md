# subscriptions-client

Reusable TypeScript SDK for SubMan API.

## Install

```bash
npm install subscriptions-client
```

## Usage

```ts
import { SubscriptionsClient } from 'subscriptions-client';

const client = new SubscriptionsClient({
  baseUrl: 'http://localhost:3000/v1',
  clientId: 'subman-mobile',
});

const login = await client.login('admin@vmjam.com', 'Admin123!');
client.setAccessToken(login.accessToken);

const customers = await client.getCustomers();
console.log(customers.data);

const updateCheck = await client.checkMobileUpdate({
  platform: 'android',
  channel: 'stable',
  appVersion: '1.0.0',
  bundleVersion: 'web-1.0.0',
});
console.log(updateCheck.data.updateAvailable);
```
