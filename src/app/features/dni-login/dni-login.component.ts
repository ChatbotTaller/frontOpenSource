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

  ingresar(): void {

    this.error = '';

    if (!/^\d{8}$/.test(this.dni)) {
      this.error = 'Ingrese un DNI válido de 8 dígitos.';
      return;
    }

    this.cargando = true;

    this.dniService.verificarDni(this.dni).subscribe({
      next: (resp: any) => {

        localStorage.setItem(
          'usuario_dni',
          JSON.stringify(resp.usuario)
        );

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