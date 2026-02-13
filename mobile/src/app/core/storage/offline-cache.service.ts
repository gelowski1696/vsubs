import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private ready = false;
  constructor(private readonly storage: Storage) {}

  private async ensure() {
    if (!this.ready) {
      await this.storage.create();
      this.ready = true;
    }
  }

  async set(key: string, value: any) {
    await this.ensure();
    await this.storage.set(key, { ts: Date.now(), value });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensure();
    const row = await this.storage.get(key);
    return row?.value ?? null;
  }
}