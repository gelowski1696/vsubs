import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { gridOutline, peopleOutline, pricetagOutline, repeatOutline, settingsOutline } from 'ionicons/icons';
import { SoftwareUpdateService } from '../../core/update/software-update.service';

@Component({
  standalone: true,
  selector: 'app-tabs',
  imports: [CommonModule, IonRouterOutlet, IonIcon, RouterLink, RouterLinkActive],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage {
  updateAvailable = false;
  updateMandatory = false;
  updateApplying = false;
  showUpdateBanner = false;
  private updateSub?: Subscription;

  protected readonly navItems = [
    { label: 'Dashboard', icon: 'grid-outline', link: '/tabs/dashboard' },
    { label: 'Customers', icon: 'people-outline', link: '/tabs/customers' },
    { label: 'Plans', icon: 'pricetag-outline', link: '/tabs/plans' },
    { label: 'Subs', icon: 'repeat-outline', link: '/tabs/subscriptions' },
    { label: 'Settings', icon: 'settings-outline', link: '/tabs/settings' },
  ];

  constructor(private readonly softwareUpdateService: SoftwareUpdateService) {
    addIcons({ gridOutline, peopleOutline, pricetagOutline, repeatOutline, settingsOutline });
    this.updateSub = this.softwareUpdateService.state$.subscribe((state) => {
      this.updateAvailable = state.updateAvailable;
      this.updateMandatory = state.mandatory;
      this.updateApplying = state.applying;
      if (state.updateAvailable && !this.showUpdateBanner) {
        this.showUpdateBanner = true;
      }
      if (!state.updateAvailable) {
        this.showUpdateBanner = false;
      }
    });
  }

  async applyUpdate(): Promise<void> {
    await this.softwareUpdateService.applyAvailableUpdate();
  }

  async dismissUpdate(): Promise<void> {
    if (!this.updateMandatory) {
      this.showUpdateBanner = false;
    }
  }

  ngOnDestroy(): void {
    this.updateSub?.unsubscribe();
  }
}
