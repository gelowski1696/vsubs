import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

type ToastKind = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private readonly toastController: ToastController) {}

  async success(message: string): Promise<void> {
    await this.present(message, 'success');
  }

  async error(message: string): Promise<void> {
    await this.present(message, 'error');
  }

  async info(message: string): Promise<void> {
    await this.present(message, 'info');
  }

  private async present(message: string, kind: ToastKind): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'top',
      color: kind === 'success' ? 'success' : kind === 'error' ? 'danger' : 'medium',
      buttons: [{ text: 'Dismiss', role: 'cancel' }],
    });
    await toast.present();
  }
}
