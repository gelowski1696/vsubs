import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';

type CustomerPayload = {
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
};

@Component({
  standalone: true,
  selector: 'app-customer-form-modal',
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
  ],
  templateUrl: './customer-form.modal.html',
  styleUrls: ['./customer-form.modal.scss'],
})
export class CustomerFormModal {
  @Input() customer?: any;

  form = {
    fullName: '',
    email: '',
    phone: '',
    notes: '',
  };

  constructor(private readonly modalController: ModalController) {}

  ngOnInit(): void {
    this.form = {
      fullName: this.customer?.fullName ?? '',
      email: this.customer?.email ?? '',
      phone: this.customer?.phone ?? '',
      notes: this.customer?.notes ?? '',
    };
  }

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  save(): void {
    if (!this.form.fullName.trim()) {
      return;
    }

    const payload: CustomerPayload = {
      fullName: this.form.fullName.trim(),
    };

    if (this.form.email.trim()) {
      payload.email = this.form.email.trim();
    }
    if (this.form.phone.trim()) {
      payload.phone = this.form.phone.trim();
    }
    if (this.form.notes.trim()) {
      payload.notes = this.form.notes.trim();
    }

    this.modalController.dismiss(payload, 'confirm');
  }
}
