import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private ready = false;
  constructor(private readonly storage: Storage) {}

  private async ensure() {
    if (!this.ready) {
      await this.storage.create();
      this.ready = true;
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    await this.ensure();
    await this.storage.set('accessToken', accessToken);
    await this.storage.set('refreshToken', refreshToken);
  }

  async getAccessToken() {
    await this.ensure();
    return this.storage.get('accessToken');
  }

  async getRefreshToken() {
    await this.ensure();
    return this.storage.get('refreshToken');
  }

  async clear() {
    await this.ensure();
    await this.storage.remove('accessToken');
    await this.storage.remove('refreshToken');
  }
}