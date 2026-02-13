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
  selector: 'app-subscriptions',
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
  ],
  templateUrl: './subscriptions.page.html',
  styleUrls: ['./subscriptions.page.scss'],
})
export class SubscriptionsPage {
  subscriptions: any[] = [];
  customers: any[] = [];
  plans: any[] = [];
  status = 'ALL';
  loading = false;
  stale = false;
  errorMessage: string | null = null;
  lastUpdated: Date | null = null;
  formOpen = false;
  formSubmitting = false;
  editingSubscriptionId: string | null = null;
  cancelOpen = false;
  cancelSubmitting = false;
  cancelTarget: any | null = null;
  cancelReason = '';

  readonly statusFilters = ['ALL', 'ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED', 'TRIALING'];
  readonly createStatuses = ['ACTIVE', 'TRIALING', 'PAUSED'];

  formModel = {
    customerId: '',
    planId: '',
    startDate: this.getTodayDate(),
    status: 'ACTIVE',
    autoRenew: true,
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
      await Promise.all([this.loadReferences(), this.loadSubscriptions()]);
      this.stale = false;
      this.errorMessage = null;
      this.lastUpdated = new Date();
    } catch {
      this.subscriptions = (await this.cache.get<any[]>('subscriptions')) ?? [];
      this.customers = (await this.cache.get<any[]>('customers')) ?? this.customers;
      this.plans = (await this.cache.get<any[]>('plans')) ?? this.plans;
      this.stale = true;
      this.errorMessage = 'Unable to sync subscriptions from server.';
      await this.toast.error('Unable to sync subscriptions. Showing cached data.');
    } finally {
      this.loading = false;
    }
  }

  isEndingSoon(row: any) {
    if (!row.nextBillingDate) return false;
    const end = new Date(row.nextBillingDate).getTime();
    const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return end > now && end - now <= sevenDays;
  }

  async setStatusFilter(status: string): Promise<void> {
    this.status = status;
    await this.load();
  }

  createSubscription(): void {
    this.editingSubscriptionId = null;
    this.formModel = {
      customerId: this.customers[0]?.id ?? '',
      planId: this.plans[0]?.id ?? '',
      startDate: this.getTodayDate(),
      status: 'ACTIVE',
      autoRenew: true,
    };
    this.formOpen = true;
  }

  editSubscription(subscription: any): void {
    this.editingSubscriptionId = subscription?.id ?? null;
    this.formModel = {
      customerId: subscription?.customerId ?? this.customers[0]?.id ?? '',
      planId: subscription?.planId ?? this.plans[0]?.id ?? '',
      startDate: this.dateInputValue(subscription?.startDate),
      status: subscription?.status ?? 'ACTIVE',
      autoRenew: subscription?.autoRenew ?? true,
    };
    this.formOpen = true;
  }

  closeForm(): void {
    this.editingSubscriptionId = null;
    this.formOpen = false;
    this.formSubmitting = false;
  }

  async submitForm(): Promise<void> {
    if (!this.formModel.customerId || !this.formModel.planId || this.formSubmitting) {
      return;
    }

    this.formSubmitting = true;
    const payload: any = {
      customerId: this.formModel.customerId,
      planId: this.formModel.planId,
      startDate: this.toIsoDate(this.formModel.startDate),
      status: this.formModel.status,
      autoRenew: this.formModel.autoRenew,
    };

    try {
      if (this.editingSubscriptionId) {
        await this.api.updateSubscription(this.editingSubscriptionId, payload);
        await this.toast.success('Subscription updated.');
      } else {
        await this.api.createSubscription(payload);
        await this.toast.success('Subscription created.');
      }
      this.closeForm();
      await this.load();
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(
        error,
        this.editingSubscriptionId ? 'Failed to update subscription.' : 'Failed to create subscription.',
      );
      await this.toast.error(this.errorMessage);
    } finally {
      this.formSubmitting = false;
    }
  }

  async pause(id: string): Promise<void> {
    try {
      await this.api.pauseSubscription(id);
      await this.toast.success('Subscription paused.');
      await this.load();
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(error, 'Failed to pause subscription.');
      await this.toast.error(this.errorMessage);
    }
  }

  async resume(id: string): Promise<void> {
    try {
      await this.api.resumeSubscription(id);
      await this.toast.success('Subscription resumed.');
      await this.load();
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(error, 'Failed to resume subscription.');
      await this.toast.error(this.errorMessage);
    }
  }

  openCancel(subscription: any): void {
    this.cancelTarget = subscription;
    this.cancelReason = '';
    this.cancelOpen = true;
  }

  closeCancel(): void {
    this.cancelOpen = false;
    this.cancelSubmitting = false;
    this.cancelTarget = null;
    this.cancelReason = '';
  }

  async confirmCancel(): Promise<void> {
    if (!this.cancelTarget?.id || this.cancelSubmitting) {
      return;
    }
    this.cancelSubmitting = true;
    const reason = this.cancelReason.trim() || 'Cancelled from mobile';

    try {
      await this.api.cancelSubscription(this.cancelTarget.id, reason);
      await this.toast.success('Subscription canceled.');
      this.closeCancel();
      await this.load();
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(error, 'Failed to cancel subscription.');
      await this.toast.error(this.errorMessage);
      this.cancelSubmitting = false;
    }
  }

  canPause(row: any): boolean {
    return row?.status === 'ACTIVE' || row?.status === 'TRIALING';
  }

  canResume(row: any): boolean {
    return row?.status === 'PAUSED';
  }

  canCancel(row: any): boolean {
    return row?.status !== 'CANCELED' && row?.status !== 'EXPIRED';
  }

  formatStatus(status?: string): string {
    return String(status || 'UNKNOWN')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  private async loadReferences(): Promise<void> {
    if (this.customers.length > 0 && this.plans.length > 0) {
      return;
    }
    const [customersRes, plansRes] = await Promise.all([
      this.api.getCustomers({ limit: 200 }),
      this.api.getPlans({ limit: 200 }),
    ]);

    this.customers = (customersRes as any).data ?? [];
    this.plans = (plansRes as any).data ?? [];
    await this.cache.set('customers', this.customers);
    await this.cache.set('plans', this.plans);
  }

  private async loadSubscriptions(): Promise<void> {
    const params = this.status === 'ALL' ? {} : { status: this.status };
    const res: any = await this.api.listSubscriptions(params);
    this.subscriptions = res.data ?? [];
    await this.cache.set('subscriptions', this.subscriptions);
  }

  private toIsoDate(input: string): string {
    const safe = input && input.length >= 10 ? input : this.getTodayDate();
    return new Date(`${safe}T00:00:00`).toISOString();
  }

  private getTodayDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private dateInputValue(value?: string): string {
    if (!value) {
      return this.getTodayDate();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.getTodayDate();
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
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
