import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './password-recovery.component.html',
  styleUrls: ['../login/login.component.css', './password-recovery.component.css']
})
export class PasswordRecoveryComponent implements OnInit {
  mode: 'request' | 'reset' = 'request';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  token = '';
  loading = false;
  done = false;
  error = '';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  get passwordRules() {
    return {
      length: this.password.length >= 12 && this.password.length <= 128,
      uppercase: /\p{Lu}/u.test(this.password),
      number: /\p{N}/u.test(this.password),
      special: /[\p{P}\p{S}]/u.test(this.password)
    };
  }

  get passwordValid(): boolean {
    const rules = this.passwordRules;
    return rules.length && rules.uppercase && rules.number && rules.special;
  }

  get passwordsMatch(): boolean {
    return this.confirmPassword.length > 0 && this.password === this.confirmPassword;
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'reset' ? 'reset' : 'request';
    if (this.mode === 'reset') {
      this.token = new URLSearchParams(this.route.snapshot.fragment || '').get('token') || '';
      // El fragmento no se envía al servidor, pero tampoco debe permanecer visible en el historial.
      if (this.token) window.history.replaceState(window.history.state, '', '/restablecer-clave');
    }
  }

  submitRequest(): void {
    if (this.loading || !this.email.trim()) return;
    this.loading = true;
    this.error = '';
    this.http.post<{message: string}>(`${environment.apiUrl}/auth/password-reset/request`, {
      email: this.email.trim()
    }).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo procesar la solicitud. Inténtalo más tarde.';
      }
    });
  }

  submitReset(): void {
    if (this.loading || !this.token) return;
    if (!this.passwordValid) {
      this.error = 'Completa todos los requisitos de la contraseña.';
      return;
    }
    if (!this.passwordsMatch) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.http.post(`${environment.apiUrl}/auth/password-reset/confirm`, {
      token: this.token,
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
        this.token = '';
        this.password = '';
        this.confirmPassword = '';
        localStorage.removeItem('admin_token');
      },
      error: response => {
        this.loading = false;
        this.error = response?.error?.error || 'No se pudo actualizar la contraseña. Solicita un enlace nuevo.';
      }
    });
  }
}
