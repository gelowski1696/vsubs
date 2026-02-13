import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './core/theme/theme.service';
import { SoftwareUpdateService } from './core/update/software-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
})
export class AppComponent {
  private readonly themeService = inject(ThemeService);
  private readonly softwareUpdateService = inject(SoftwareUpdateService);

  constructor() {
    this.themeService.init();
    this.softwareUpdateService.init();
  }
}
