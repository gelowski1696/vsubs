import { Injectable } from '@angular/core';
import { OfflineCacheService } from '../storage/offline-cache.service';
import { SubmanApiService } from '../api/subman-api.service';

@Injectable({ providedIn: 'root' })
export class SyncService {
  constructor(
    private readonly api: SubmanApiService,
    private readonly cache: OfflineCacheService,
  ) {}

  async syncCustomers() {
    const res: any = await this.api.getCustomers();
    await this.cache.set('customers', res.data);
    return res.data;
  }

  async syncPlans() {
    const res: any = await this.api.getPlans();
    await this.cache.set('plans', res.data);
    return res.data;
  }

  async syncSubscriptions() {
    const res: any = await this.api.listSubscriptions();
    await this.cache.set('subscriptions', res.data);
    return res.data;
  }
}