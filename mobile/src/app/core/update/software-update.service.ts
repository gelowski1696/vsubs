import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { App } from '@capacitor/app';
import { resolveApiBaseUrl } from '../config/api-base-url';
import { APP_INFO } from '../config/app-info';
import { SubmanApiService } from '../api/subman-api.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { ToastService } from '../ui/toast.service';
import { CapgoRuntimeAdapter } from './capgo-runtime.adapter';
import { OtaBundlePayload } from './update-runtime.adapter';

export type SoftwareUpdateState = {
  checking: boolean;
  applying: boolean;
  lastCheckedAt: string | null;
  currentVersion: string;
  bundleVersion: string;
  latestAppVersion: string | null;
  updateAvailable: boolean;
  mandatory: boolean;
  releaseNotes: string | null;
  releaseId: string | null;
  bundle: OtaBundlePayload | null;
  runtimeAvailable: boolean;
  error: string | null;
};

@Injectable({ providedIn: 'root' })
export class SoftwareUpdateService {
  private readonly stateSubject = new BehaviorSubject<SoftwareUpdateState>({
    checking: false,
    applying: false,
    lastCheckedAt: null,
    currentVersion: APP_INFO.version,
    bundleVersion: APP_INFO.bundleVersion,
    latestAppVersion: null,
    updateAvailable: false,
    mandatory: false,
    releaseNotes: null,
    releaseId: null,
    bundle: null,
    runtimeAvailable: false,
    error: null,
  });

  readonly state$ = this.stateSubject.asObservable();
  private initialized = false;

  constructor(
    private readonly api: SubmanApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly toast: ToastService,
    private readonly runtime: CapgoRuntimeAdapter,
  ) {}

  get snapshot(): SoftwareUpdateState {
    return this.stateSubject.value;
  }

  private patch(patch: Partial<SoftwareUpdateState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const runtimeAvailable = await this.runtime.isAvailable();
    const bundleVersion = await this.runtime.getCurrentBundleVersion(APP_INFO.bundleVersion);
    this.patch({ runtimeAvailable, bundleVersion });

    App.addListener('resume', async () => {
      await this.checkForUpdates('startup');
    });

    await this.checkForUpdates('startup');
  }

  private resolveBundleUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }

    const baseUrl = resolveApiBaseUrl();
    const origin = new URL(baseUrl).origin;
    return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }

  async checkForUpdates(trigger: 'startup' | 'manual' = 'manual'): Promise<void> {
    const accessToken = await this.tokenStorage.getAccessToken();
    if (!accessToken) {
      return;
    }

    this.patch({ checking: true, error: null });

    try {
      const currentBundleVersion = await this.runtime.getCurrentBundleVersion(this.snapshot.bundleVersion);
      const response: any = await this.api.checkMobileUpdate({
        platform: 'android',
        channel: APP_INFO.otaChannel as 'stable' | 'beta',
        appVersion: APP_INFO.version,
        bundleVersion: currentBundleVersion,
      });

      const payload = response?.data ?? response;
      const releaseId = payload?.bundle?.id ?? null;
      const bundle = payload?.bundle
        ? {
            id: payload.bundle.id,
            url: this.resolveBundleUrl(payload.bundle.url),
            checksumSha256: payload.bundle.checksumSha256,
            sizeBytes: payload.bundle.sizeBytes,
          }
        : null;

      this.patch({
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        latestAppVersion: payload.latestAppVersion ?? null,
        updateAvailable: Boolean(payload.updateAvailable),
        mandatory: Boolean(payload.mandatory),
        releaseNotes: payload.releaseNotes ?? null,
        releaseId,
        bundle,
        bundleVersion: currentBundleVersion,
      });

      await this.api.logMobileUpdateEvent({
        releaseId: releaseId ?? undefined,
        eventType: 'CHECKED',
        appVersion: APP_INFO.version,
        bundleVersion: currentBundleVersion,
      });

      if (trigger === 'startup' && payload.updateAvailable) {
        await this.toast.info(payload.mandatory ? 'Mandatory update available.' : 'New update available.');
      }
    } catch (error: any) {
      this.patch({
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        error: error?.error?.error?.message ?? error?.message ?? 'Update check failed',
      });
      if (trigger === 'manual') {
        await this.toast.error('Unable to check updates right now.');
      }
    }
  }

  async applyAvailableUpdate(): Promise<void> {
    const state = this.snapshot;
    if (!state.bundle) {
      await this.toast.info('No update bundle available.');
      return;
    }

    if (!state.runtimeAvailable) {
      await this.toast.info('Update runtime is unavailable on this build. Use Play Store update.');
      return;
    }

    this.patch({ applying: true, error: null });

    try {
      await this.runtime.downloadAndApply(state.bundle);
      await this.api.logMobileUpdateEvent({
        releaseId: state.releaseId ?? undefined,
        eventType: 'DOWNLOADED',
        appVersion: APP_INFO.version,
        bundleVersion: state.bundle.id,
      });
      await this.api.logMobileUpdateEvent({
        releaseId: state.releaseId ?? undefined,
        eventType: 'APPLIED',
        appVersion: APP_INFO.version,
        bundleVersion: state.bundle.id,
      });

      this.patch({ applying: false, updateAvailable: false, bundleVersion: state.bundle.id });
      await this.toast.success('Update applied. App will reload.');
    } catch (error: any) {
      await this.api.logMobileUpdateEvent({
        releaseId: state.releaseId ?? undefined,
        eventType: 'FAILED',
        appVersion: APP_INFO.version,
        bundleVersion: state.bundle.id,
        message: error?.message ?? 'Apply failed',
      });

      this.patch({ applying: false, error: error?.message ?? 'Update apply failed' });
      await this.toast.error('Update failed. Please try again later.');
    }
  }
}
