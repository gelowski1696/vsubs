import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-kpi-card',
  template: '<div class="card-surface p-4 shadow"><p>{{ label }}</p><h2>{{ value }}</h2></div>',
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value = '';
}