import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-status-pill',
  template: '<span class="rounded-full px-2 py-1 text-xs" [class]="className">{{ text }}</span>',
})
export class StatusPillComponent {
  @Input() text = '';
  @Input() className = 'bg-slate-100 text-slate-700';
}