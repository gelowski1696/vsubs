import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { IonContent, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { refreshOutline } from "ionicons/icons";
import { SubmanApiService } from "../../core/api/subman-api.service";
import { OfflineCacheService } from "../../core/storage/offline-cache.service";
import { ToastService } from "../../core/ui/toast.service";
import { LocationMapPickerComponent } from "../../shared/components/location-map-picker.component";

@Component({
  standalone: true,
  selector: "app-customers",
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    LocationMapPickerComponent,
  ],
  templateUrl: "./customers.page.html",
  styleUrls: ["./customers.page.scss"],
})
export class CustomersPage {
  customers: any[] = [];
  searchTerm = "";
  activeFilter = "ALL";
  readonly filters = [
    "ALL",
    "RECENT_ADDED",
    "RECENT_UPDATED",
    "WITH_STORE",
    "WITH_LOCATION",
  ];
  stale = false;
  loading = false;
  lastUpdated: Date | null = null;
  errorMessage: string | null = null;
  deleteTarget: any | null = null;
  formOpen = false;
  formSubmitting = false;
  editingCustomerId: string | null = null;
  viewTarget: any | null = null;
  activeSwipeId: string | null = null;
  private readonly mapUrlCache = new Map<string, SafeResourceUrl>();
  private swipeTrackingId: string | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeMoved = false;
  formModel = {
    fullName: "",
    email: "",
    phone: "",
    storeName: "",
    storeLocation: "",
    notes: "",
  };

  constructor(
    private readonly api: SubmanApiService,
    private readonly cache: OfflineCacheService,
    private readonly toast: ToastService,
    private readonly sanitizer: DomSanitizer,
  ) {
    addIcons({ refreshOutline });
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res: any = await this.api.getCustomers();
      this.customers = res.data;
      this.stale = false;
      await this.cache.set("customers", res.data);
      this.lastUpdated = new Date();
      this.errorMessage = null;
    } catch {
      this.customers = (await this.cache.get<any[]>("customers")) ?? [];
      this.stale = true;
      this.errorMessage = "Unable to sync from server.";
      await this.toast.error("Unable to sync customers. Showing cached data.");
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    ev.detail.complete();
  }

  async createCustomer() {
    this.editingCustomerId = null;
    this.formModel = {
      fullName: "",
      email: "",
      phone: "",
      storeName: "",
      storeLocation: "",
      notes: "",
    };
    this.formOpen = true;
  }

  async editCustomer(customer: any) {
    this.editingCustomerId = customer.id;
    this.formModel = {
      fullName: customer?.fullName ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      storeName: customer?.storeName ?? "",
      storeLocation: customer?.storeLocation ?? "",
      notes: customer?.notes ?? "",
    };
    this.formOpen = true;
  }

  viewCustomer(customer: any): void {
    this.viewTarget = customer;
  }

  onCardPointerDown(event: PointerEvent, customerId: string): void {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    this.swipeTrackingId = customerId;
    this.swipeStartX = event.clientX;
    this.swipeStartY = event.clientY;
    this.swipeMoved = false;
  }

  onCardPointerMove(event: PointerEvent): void {
    if (!this.swipeTrackingId) {
      return;
    }
    const deltaX = event.clientX - this.swipeStartX;
    const deltaY = event.clientY - this.swipeStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      this.swipeTrackingId = null;
      return;
    }
    if (Math.abs(deltaX) < 18 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    this.swipeMoved = true;
    if (deltaX < 0) {
      this.activeSwipeId = this.swipeTrackingId;
    } else if (this.activeSwipeId === this.swipeTrackingId) {
      this.activeSwipeId = null;
    }
  }

  onCardPointerUp(customer: any): void {
    const tracked = this.swipeTrackingId;
    const moved = this.swipeMoved;
    this.swipeTrackingId = null;
    this.swipeMoved = false;

    if (!tracked || moved) {
      return;
    }

    if (this.activeSwipeId === customer.id) {
      this.activeSwipeId = null;
      return;
    }

    this.viewCustomer(customer);
  }

  onCardPointerCancel(): void {
    this.swipeTrackingId = null;
    this.swipeMoved = false;
  }

  onSwipeEdit(customer: any, event: Event): void {
    event.stopPropagation();
    this.activeSwipeId = null;
    this.editCustomer(customer);
  }

  onSwipeDelete(customer: any, event: Event): void {
    event.stopPropagation();
    this.activeSwipeId = null;
    this.deleteCustomer(customer);
  }

  async useCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      await this.toast.error("Geolocation is not supported on this device.");
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await this.reverseGeocode(lat, lng);
          this.formModel.storeLocation =
            address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          await this.toast.success("Store location set from current GPS.");
          resolve();
        },
        async () => {
          await this.toast.error("Unable to access current location.");
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async deleteCustomer(customer: any) {
    this.deleteTarget = customer;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formSubmitting = false;
  }

  closeView(): void {
    this.viewTarget = null;
  }

  async submitForm(): Promise<void> {
    if (!this.formModel.fullName.trim() || this.formSubmitting) {
      return;
    }

    this.formSubmitting = true;
    const payload: Record<string, string> = {
      fullName: this.formModel.fullName.trim(),
    };
    if (this.formModel.email.trim())
      payload["email"] = this.formModel.email.trim();
    if (this.formModel.phone.trim())
      payload["phone"] = this.formModel.phone.trim();
    if (this.formModel.storeName.trim())
      payload["storeName"] = this.formModel.storeName.trim();
    if (this.formModel.storeLocation.trim())
      payload["storeLocation"] = this.formModel.storeLocation.trim();
    if (this.formModel.notes.trim())
      payload["notes"] = this.formModel.notes.trim();

    try {
      if (this.editingCustomerId) {
        await this.api.updateCustomer(this.editingCustomerId, payload);
        await this.toast.success("Customer updated.");
      } else {
        await this.api.createCustomer(payload);
        await this.toast.success("Customer created.");
      }
      this.closeForm();
      await this.load();
    } catch (error) {
      const fallback = this.editingCustomerId
        ? "Failed to update customer."
        : "Failed to create customer.";
      this.errorMessage = this.getApiErrorMessage(error, fallback);
      await this.toast.error(this.errorMessage);
    } finally {
      this.formSubmitting = false;
    }
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteTarget?.id) {
      return;
    }
    try {
      await this.api.deleteCustomer(this.deleteTarget.id);
      this.deleteTarget = null;
      await this.load();
      await this.toast.success("Customer deleted.");
    } catch (error) {
      this.errorMessage = this.getApiErrorMessage(
        error,
        "Failed to delete customer.",
      );
      await this.toast.error(this.errorMessage);
    }
  }

  getInitials(fullName?: string): string {
    if (!fullName) {
      return "?";
    }
    const parts = fullName.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  }

  onFormLocationPicked(value: string): void {
    this.formModel.storeLocation = value;
  }

  getStoreMapEmbedUrl(rawLocation?: string): SafeResourceUrl | null {
    if (!rawLocation || !rawLocation.trim()) {
      return null;
    }
    const normalized = rawLocation.trim();
    const cached = this.mapUrlCache.get(normalized);
    if (cached) {
      return cached;
    }
    const query = encodeURIComponent(normalized);
    const url = `https://maps.google.com/maps?q=${query}&output=embed`;
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.mapUrlCache.set(normalized, safe);
    return safe;
  }

  trackByCustomer(_index: number, customer: any): string {
    return customer?.id ?? String(_index);
  }

  get filteredCustomers(): any[] {
    const query = this.searchTerm.trim().toLowerCase();
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 7);

    return this.customers.filter((customer) => {
      if (
        this.activeFilter === "WITH_STORE" &&
        !(customer?.storeName || "").trim()
      ) {
        return false;
      }
      if (
        this.activeFilter === "WITH_LOCATION" &&
        !(customer?.storeLocation || "").trim()
      ) {
        return false;
      }
      if (this.activeFilter === "RECENT_ADDED") {
        const createdAt = customer?.createdAt
          ? new Date(customer.createdAt)
          : null;
        if (
          !createdAt ||
          Number.isNaN(createdAt.getTime()) ||
          createdAt < recentCutoff
        ) {
          return false;
        }
      }
      if (this.activeFilter === "RECENT_UPDATED") {
        const updatedAt = customer?.updatedAt
          ? new Date(customer.updatedAt)
          : null;
        const createdAt = customer?.createdAt
          ? new Date(customer.createdAt)
          : null;
        const isValidUpdated =
          !!updatedAt && !Number.isNaN(updatedAt.getTime());
        const isRecent = isValidUpdated && updatedAt >= recentCutoff;
        const changedAfterCreate =
          isValidUpdated &&
          !!createdAt &&
          !Number.isNaN(createdAt.getTime()) &&
          updatedAt.getTime() !== createdAt.getTime();
        if (!isRecent || !changedAfterCreate) {
          return false;
        }
      }
      if (!query) {
        return true;
      }

      const haystack = [
        customer?.fullName,
        customer?.email,
        customer?.phone,
        customer?.storeName,
        customer?.storeLocation,
      ]
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  filterLabel(filter: string): string {
    switch (filter) {
      case "RECENT_ADDED":
        return "Recent Added";
      case "RECENT_UPDATED":
        return "Recent Updated";
      case "WITH_STORE":
        return "With Store";
      case "WITH_LOCATION":
        return "With Location";
      default:
        return "All";
    }
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as any;
      if (Array.isArray(payload?.message) && payload.message.length > 0) {
        return String(payload.message[0]);
      }
      if (typeof payload?.message === "string" && payload.message.length > 0) {
        return payload.message;
      }
      if (typeof error.message === "string" && error.message.length > 0) {
        return error.message;
      }
    }
    return fallback;
  }

  private async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      if (!response.ok) {
        return null;
      }
      const payload: any = await response.json();
      const label = payload?.display_name;
      return typeof label === "string" && label.trim().length > 0
        ? label.trim()
        : null;
    } catch {
      return null;
    }
  }
}
