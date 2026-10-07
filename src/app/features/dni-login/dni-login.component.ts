import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DniService } from '../../core/services/dni.service';

@Component({
  selector: 'app-dni-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dni-login.component.html',
  styleUrl: './dni-login.component.css'
})
export class DniLoginComponent {

  dni = '';
  cargando = false;
  error = '';

  constructor(
    private dniService: DniService,
    private router: Router
  ) {}

  get dniCompleto(): boolean {
    return /^\d{8}$/.test(this.dni);
  }

  onDniKeydown(event: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ];

    if (
      teclasPermitidas.includes(event.key) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloNumeros = input.value.replace(/\D/g, '').slice(0, 8);

    input.value = soloNumeros;
    this.dni = soloNumeros;

    if (this.error) {
      this.error = '';
    }
  }

  ingresar(): void {
    if (this.cargando) {
      return;
    }

    this.error = '';

    if (!this.dniCompleto) {
      this.error = 'Ingrese un DNI válido de 8 dígitos.';
      return;
    }

    this.cargando = true;

    this.dniService.verificarDni(this.dni).subscribe({
      next: (resp: any) => {
        if (!resp || resp.success !== true || !resp.usuario || !resp.usuario.nombre) {
          this.error = resp?.message || 'No se pudo validar el DNI.';
          this.cargando = false;
          return;
        }

        localStorage.removeItem('usuario_dni');

        localStorage.setItem(
          'chat_session_id',
          resp.session_id
        );

        localStorage.setItem(
          'nombre_cliente',
          resp.usuario.nombre
        );

        this.router.navigate(['/seleccionar-chat']);
      },

      error: () => {
        this.error = 'No se pudo validar el DNI.';
        this.cargando = false;
      }
    });
  }
}
