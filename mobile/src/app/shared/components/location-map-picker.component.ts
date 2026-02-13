import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  standalone: true,
  selector: 'app-location-map-picker',
  imports: [CommonModule],
  template: `
    <div class="map-picker-shell">
      <div #mapHost class="map-host"></div>
      <p class="map-help">Tap anywhere on the map to set store location.</p>
    </div>
  `,
  styles: [
    `
      .map-picker-shell {
        border: 1px solid #dbe3f0;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }
      .map-host {
        width: 100%;
        height: 220px;
      }
      .map-help {
        margin: 0;
        padding: 8px 10px;
        font-size: 0.75rem;
        color: #64748b;
        background: #f8fafc;
        border-top: 1px solid #dbe3f0;
      }
      :host-context(.dark) .map-picker-shell {
        border-color: #1f2937;
        background: #0f172a;
      }
      :host-context(.dark) .map-help {
        color: #94a3b8;
        background: #020617;
        border-top-color: #1f2937;
      }
    `,
  ],
})
export class LocationMapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;
  @Input() location = '';
  @Output() locationChange = new EventEmitter<string>();

  private map?: L.Map;
  private marker?: L.CircleMarker;
  private readonly defaultCenter: L.LatLngExpression = [14.5995, 120.9842];
  private readonly defaultZoom = 13;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', async (event: L.LeafletMouseEvent) => {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      this.setMarker(lat, lng, false);
      const label = await this.reverseGeocode(lat, lng);
      this.locationChange.emit(label ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });

    const parsed = this.parseCoordinates(this.location);
    if (parsed) {
      this.setMarker(parsed.lat, parsed.lng, false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map || !changes['location']) {
      return;
    }

    const parsed = this.parseCoordinates(this.location);
    if (parsed) {
      this.setMarker(parsed.lat, parsed.lng, false);
      return;
    }

    const address = (this.location ?? '').trim();
    if (address) {
      this.geocodeAddress(address).then((coords) => {
        if (coords) {
          this.setMarker(coords.lat, coords.lng, false);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private setMarker(lat: number, lng: number, emit = false): void {
    if (!this.map) {
      return;
    }

    if (!this.marker) {
      this.marker = L.circleMarker([lat, lng], {
        radius: 7,
        color: '#1d4ed8',
        fillColor: '#3b82f6',
        fillOpacity: 0.95,
        weight: 2,
      }).addTo(this.map);
    } else {
      this.marker.setLatLng([lat, lng]);
    }

    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 14), { animate: true });

    if (emit) {
      this.locationChange.emit(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }

  private parseCoordinates(raw: string): { lat: number; lng: number } | null {
    const value = (raw ?? '').trim();
    const match = value.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
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

  private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) {
        return null;
      }
      const payload: any = await response.json();
      const label = payload?.display_name;
      return typeof label === 'string' && label.trim().length > 0 ? label.trim() : null;
    } catch {
      return null;
    }
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
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
      return { lat, lng };
    } catch {
      return null;
    }
  }
}
