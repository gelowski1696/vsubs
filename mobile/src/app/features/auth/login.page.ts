import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, IonContent, IonButton, FormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = 'admin@vmjam.com';
  password = 'Admin123!';
  showPassword = false;
  loading = false;
  error = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/tabs/dashboard');
    } catch (err: any) {
      this.error = err?.error?.error?.message ?? 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}
