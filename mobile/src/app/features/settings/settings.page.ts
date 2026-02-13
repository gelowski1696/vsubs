import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { APP_INFO } from '../../core/config/app-info';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/ui/toast.service';
import { SoftwareUpdateService } from '../../core/update/software-update.service';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, IonContent],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  mode: ThemeMode = 'system';
  readonly appInfo = APP_INFO;
  loggingOut = false;
  confirmLogoutOpen = false;
  checkingUpdate = false;
  applyingUpdate = false;
  updateAvailable = false;
  updateMandatory = false;
  latestAppVersion: string | null = null;
  releaseNotes: string | null = null;
  lastCheckedAt: string | null = null;
  runtimeAvailable = false;
  updateError: string | null = null;
  currentBundleVersion = APP_INFO.bundleVersion;
  private stateSub?: Subscription;

  constructor(
    private readonly themeService: ThemeService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly softwareUpdateService: SoftwareUpdateService,
  ) {
    this.themeService.getMode().then((mode) => (this.mode = mode));
    this.stateSub = this.softwareUpdateService.state$.subscribe((state) => {
      this.checkingUpdate = state.checking;
      this.applyingUpdate = state.applying;
      this.updateAvailable = state.updateAvailable;
      this.updateMandatory = state.mandatory;
      this.latestAppVersion = state.latestAppVersion;
      this.releaseNotes = state.releaseNotes;
      this.lastCheckedAt = state.lastCheckedAt;
      this.runtimeAvailable = state.runtimeAvailable;
      this.updateError = state.error;
      this.currentBundleVersion = state.bundleVersion;
    });
  }

  async onModeChange(mode: ThemeMode) {
    this.mode = mode;
    await this.themeService.setMode(mode);
  }

  openLogoutConfirm(): void {
    this.confirmLogoutOpen = true;
  }

  closeLogoutConfirm(): void {
    this.confirmLogoutOpen = false;
  }

  async logout() {
    if (this.loggingOut) {
      return;
    }
    this.loggingOut = true;
    try {
      await this.auth.logout();
      this.confirmLogoutOpen = false;
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch {
      await this.toast.error('Logout failed. Please try again.');
    } finally {
      this.loggingOut = false;
    }
  }

  async checkForUpdates() {
    await this.softwareUpdateService.checkForUpdates('manual');
  }

  async applyUpdate() {
    await this.softwareUpdateService.applyAvailableUpdate();
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
  }
}
