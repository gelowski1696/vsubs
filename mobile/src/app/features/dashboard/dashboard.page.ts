import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { SubmanApiService } from '../../core/api/subman-api.service';
import * as L from 'leaflet';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [IonContent, IonIcon],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements AfterViewInit, OnDestroy {
  @ViewChild('customerMapHost') customerMapHost?: ElementRef<HTMLDivElement>;

  kpis = { customers: 0, active: 0, endingSoon: 0 };
  mappedCustomers = 0;
  unmappedCustomers = 0;
  loading = false;
  updatedAt = '';
  error = '';
  mapBusy = false;

  private map?: L.Map;
  private markerLayer = L.layerGroup();
  private pendingCustomersForMap: any[] | null = null;
  private readonly geocodeCache = new Map<string, { lat: number; lng: number }>();
  private readonly geocodeCacheKey = 'subman.dashboard.geocode-cache.v1';

  constructor(private readonly api: SubmanApiService) {
    addIcons({ refreshOutline });
    this.loadGeocodeCache();
    this.load();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.invalidateMapSize();
    if (this.pendingCustomersForMap) {
      const pending = [...this.pendingCustomersForMap];
      this.pendingCustomersForMap = null;
      this.renderCustomerPins(pending);
    }
  }

  ionViewDidEnter(): void {
    this.invalidateMapSize();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.invalidateMapSize();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const customers: any = await this.api.getCustomers({ limit: 1 });
      const customerRows: any = await this.api.getCustomers({ limit: 200 });
      const subscriptions: any = await this.api.listSubscriptions({ status: 'ACTIVE', limit: 200 });
      const endingSoon: any = await this.api.getEndingSoon(7);
      this.kpis = {
        customers: customers.meta?.total ?? customers.data?.length ?? 0,
        active: subscriptions.meta?.total ?? subscriptions.data?.length ?? 0,
        endingSoon: endingSoon.data?.length ?? endingSoon.length ?? 0,
      };
      const customerData = Array.isArray(customerRows?.data) ? customerRows.data : [];
      await this.renderCustomerPins(customerData);
      this.updatedAt = new Date().toLocaleTimeString();
    } catch (err: any) {
      this.error = err?.error?.error?.message ?? 'Failed to load dashboard';
    } finally {
      this.loading = false;
    }
  }

  async refresh() {
    await this.load();
  }

  private initMap(): void {
    if (this.map || !this.customerMapHost) {
      return;
    }

    this.map = L.map(this.customerMapHost.nativeElement, {
      center: [14.5995, 120.9842],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerLayer.addTo(this.map);
  }

  private async renderCustomerPins(customers: any[]): Promise<void> {
    this.initMap();
    if (!this.map) {
      this.pendingCustomersForMap = customers;
      return;
    }

    this.mapBusy = true;
    this.markerLayer.clearLayers();

    const locations = customers
      .filter((row) => typeof row?.storeLocation === 'string' && row.storeLocation.trim().length > 0)
      .slice(0, 120);

    const coords = await Promise.all(
      locations.map(async (row) => {
        const resolved = await this.resolveLocation(row.storeLocation);
        if (!resolved) {
          return null;
        }
        return { row, ...resolved };
      }),
    );

    const valid = coords.filter((entry): entry is NonNullable<typeof entry> => !!entry);
    this.mappedCustomers = valid.length;
    this.unmappedCustomers = Math.max(0, locations.length - valid.length);

    const bounds: L.LatLngTuple[] = [];
    for (const item of valid) {
      bounds.push([item.lat, item.lng]);
      L.circleMarker([item.lat, item.lng], {
        radius: 8,
        color: '#0ea5e9',
        fillColor: '#0284c7',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(
          `<strong>${this.escapeHtml(item.row.fullName || 'Customer')}</strong><br/>${this.escapeHtml(
            item.row.storeLocation || '',
          )}`,
        )
        .addTo(this.markerLayer);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [18, 18], maxZoom: 14 });
    }
    this.invalidateMapSize();
    this.mapBusy = false;
  }

  private invalidateMapSize(): void {
    if (!this.map) {
      return;
    }
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  private async resolveLocation(rawLocation: string): Promise<{ lat: number; lng: number } | null> {
    const normalized = rawLocation.trim();
    if (!normalized) {
      return null;
    }

    const fromCoordinates = this.parseCoordinates(normalized);
    if (fromCoordinates) {
      return fromCoordinates;
    }

    const cached = this.geocodeCache.get(normalized);
    if (cached) {
      return cached;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(normalized)}`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) {
        return null;
      }
      const rows: any[] = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return null;
      }
      const lat = Number.parseFloat(rows[0]?.lat);
      const lng = Number.parseFloat(rows[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      const resolved = { lat, lng };
      this.geocodeCache.set(normalized, resolved);
      this.persistGeocodeCache();
      return resolved;
    } catch {
      return null;
    }
  }

  private parseCoordinates(raw: string): { lat: number; lng: number } | null {
    const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) {
      return null;
    }
    const lat = Number.parseFloat(match[1]);
    const lng = Number.parseFloat(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return { lat, lng };
  }

  private loadGeocodeCache(): void {
    try {
      const raw = localStorage.getItem(this.geocodeCacheKey);
      if (!raw) {
        return;
      }
      const rows = JSON.parse(raw) as Array<{ key: string; lat: number; lng: number }>;
      if (!Array.isArray(rows)) {
        return;
      }
      for (const row of rows) {
        if (typeof row?.key === 'string' && Number.isFinite(row?.lat) && Number.isFinite(row?.lng)) {
          this.geocodeCache.set(row.key, { lat: row.lat, lng: row.lng });
        }
      }
    } catch {
      // ignore invalid cache payload
    }
  }

  private persistGeocodeCache(): void {
    try {
      const entries = Array.from(this.geocodeCache.entries())
        .slice(-250)
        .map(([key, value]) => ({ key, lat: value.lat, lng: value.lng }));
      localStorage.setItem(this.geocodeCacheKey, JSON.stringify(entries));
    } catch {
      // ignore storage errors
    }
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
