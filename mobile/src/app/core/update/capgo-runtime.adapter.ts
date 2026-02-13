import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { OtaBundlePayload, UpdateRuntimeAdapter } from './update-runtime.adapter';

@Injectable({ providedIn: 'root' })
export class CapgoRuntimeAdapter implements UpdateRuntimeAdapter {
  private getPlugin(): any | null {
    return (window as any)?.Capacitor?.Plugins?.CapacitorUpdater ?? null;
  }

  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    const plugin = this.getPlugin();
    return Boolean(plugin && typeof plugin.download === 'function');
  }

  async getCurrentBundleVersion(defaultVersion: string): Promise<string> {
    const plugin = this.getPlugin();
    if (!plugin || typeof plugin.current !== 'function') {
      return defaultVersion;
    }

    try {
      const current = await plugin.current();
      if (current?.bundle?.version) {
        return current.bundle.version;
      }
      if (current?.current?.version) {
        return current.current.version;
      }
      if (current?.version) {
        return current.version;
      }
      return defaultVersion;
    } catch {
      return defaultVersion;
    }
  }

  async downloadAndApply(bundle: OtaBundlePayload): Promise<void> {
    const plugin = this.getPlugin();
    if (!plugin) {
      throw new Error('OTA runtime plugin unavailable');
    }

    if (typeof plugin.download !== 'function') {
      throw new Error('OTA download method unavailable');
    }

    const downloaded = await plugin.download({
      url: bundle.url,
      version: bundle.id,
      checksum: bundle.checksumSha256,
    });

    const bundleId = downloaded?.id ?? downloaded?.bundle?.id ?? bundle.id;

    if (typeof plugin.set === 'function') {
      await plugin.set({ id: bundleId });
    }

    if (typeof plugin.reload === 'function') {
      await plugin.reload();
    }
  }
}
