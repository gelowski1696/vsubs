import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { SubmanApiService } from '../../core/api/subman-api.service';
import { OfflineCacheService } from '../../core/storage/offline-cache.service';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  standalone: true,
  selector: 'app-plans',
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './plans.page.html',
  styleUrls: ['./plans.page.scss'],
})
export class PlansPage {
  plans: any[] = [];
  loading = false;
  stale = false;
  errorMessage: string | null = null;
  lastUpdated: Date | null = null;
  formOpen = false;
  formSubmitting = false;
  deleteTarget: any | null = null;
  editingPlanId: string | null = null;

  readonly intervalOptions = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

  formModel = {
    name: '',
    price: '',
    currency: 'PHP',
    interval: 'MONTHLY',
    intervalCount: 1,
    description: '',
    isActive: true,
  };

  constructor(
    private readonly api: SubmanApiService,
    private readonly cache: OfflineCacheService,
    private readonly toast: ToastService,
  ) {
    addIcons({ refreshOutline });
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res: any = await this.api.getPlans();
      this.plans = res.data;
      this.stale = false;
      await this.cache.set('plans', res.data);
      this.lastUpdated = new Date();
      this.errorMessage = null;
    } catch {
      this.plans = (await this.cache.get<any[]>('plans')) ?? [];
      this.stale = true;
      this.errorMessage = 'Unable to sync plans from server.';
      await this.toast.error('Unable to sync plans. Showing cached data.');
    } finally {
      this.loading = false;
    }
  }

  createPlan(): void {
    this.editingPlanId = null;
    this.formModel = {
      name: '',
      price: '',
      currency: 'PHP',
      interval: 'MONTHLY',
      intervalCount: 1,
      description: '',
      isActive: true,
    };
    this.formOpen = true;
  }

  editPlan(plan: any): void {
    this.editingPlanId = plan.id;
    this.formModel = {
      name: plan?.name ?? '',
      price: String(plan?.price ?? ''),
      currency: plan?.currency ?? 'PHP',
      interval: plan?.interval ?? 'MONTHLY',
      intervalCount: Number(plan?.intervalCount ?? 1),
      description: plan?.description ?? '',
      isActive: plan?.isActive !== false,
    };
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formSubmitting = false;
  }

  async submitForm(): Promise<void> {
    if (!this.formModel.name.trim() || !this.formModel.price.trim() || this.formSubmitting) {
      return;
    }

    const intervalCount = Number(this.formModel.intervalCount || 1);
    if (!Number.isFinite(intervalCount) || intervalCount < 1) {
      this.errorMessage = 'Interval count must be at least 1.';
      await this.toast.error(this.errorMessage);
      return;
    }

    this.formSubmitting = true;
    const payload: any = {
      name: this.formModel.name.trim(),
      price: this.formModel.price.trim(),
      currency: (this.formModel.currency || 'PHP').trim().toUpperCase(),
      interval: this.formModel.interval,
      intervalCount,
      isActive: this.formModel.isActive,
    };
    if (this.formModel.description.trim()) {
      payload.description = this.formModel.description.trim();
    }

    try {
      if (this.editingPlanId) {
        await this.api.updatePlan(this.editingPlanId, payload);
        await this.toast.success('Plan updated.');
      } else {
        await this.api.createPlan(payload);
        await this.toast.success('Plan created.');
      }
      this.closeForm();
      await this.load();
    } catch (error) {
      const fallback = this.editingPlanId ? 'Failed to update plan.' : 'Failed to create plan.';
      this.errorMessage = this.getApiErrorMessage(error, fallback);
      await this.toast.error(this.errorMessage);
    } finally {
      this.formSubmitting = false;
    }
  }

  deletePlan(plan: any): void {
    this.deleteTarget = plan;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteTarget?.id) {
      return;
    }

    try {
      await this.api.deletePlan(this.deleteTarget.id);
      this.deleteTarget = null;
      await this.load();
      await this.toast.success('Plan deleted.');
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(error, 'Failed to delete plan.');
      await this.toast.error(this.errorMessage);
    }
  }

  formatInterval(plan: any): string {
    const count = Number(plan?.intervalCount ?? 1);
    const interval = String(plan?.interval ?? 'MONTHLY').toLowerCase();
    if (count <= 1) {
      return interval;
    }
    return `${count} ${interval}s`;
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as any;
      if (Array.isArray(payload?.message) && payload.message.length > 0) {
        return String(payload.message[0]);
      }
      if (typeof payload?.message === 'string' && payload.message.length > 0) {
        return payload.message;
      }
      if (typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
      }
    }
    return fallback;
  }
}
