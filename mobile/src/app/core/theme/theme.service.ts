import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private ready = false;

  constructor(private readonly storage: Storage) {}

  private async ensure() {
    if (!this.ready) {
      await this.storage.create();
      this.ready = true;
    }
  }

  async init() {
    await this.ensure();
    const mode = ((await this.storage.get('themeMode')) ?? 'system') as ThemeMode;
    this.applyTheme(mode);
  }

  async setMode(mode: ThemeMode) {
    await this.ensure();
    await this.storage.set('themeMode', mode);
    this.applyTheme(mode);
  }

  async getMode(): Promise<ThemeMode> {
    await this.ensure();
    return ((await this.storage.get('themeMode')) ?? 'system') as ThemeMode;
  }

  applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      return;
    }
    root.classList.toggle('dark', mode === 'dark');
  }
}