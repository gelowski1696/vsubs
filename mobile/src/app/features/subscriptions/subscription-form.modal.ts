import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-subscription-form-modal',
  templateUrl: './subscription-form.modal.html',
  styleUrls: ['./subscription-form.modal.scss'],
})
export class SubscriptionFormModal {
  @Output() submitted = new EventEmitter<any>();
}