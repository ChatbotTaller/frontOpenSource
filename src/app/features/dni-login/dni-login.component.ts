import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { DniService } from '../../core/services/dni.service';
import { PrivacyNoticeService } from '../../core/services/privacy-notice.service';

@Component({
  selector: 'app-dni-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dni-login.component.html',
  styleUrl: './dni-login.component.css'
})
export class DniLoginComponent implements AfterViewInit {
  @ViewChild('privacyDialog') privacyDialog!: ElementRef<HTMLDialogElement>;

  dni = '';
  cargando = false;
  error = '';
  privacyAccepted: boolean;
  privacyChecked = false;
  privacyRejected = false;
  privacyError = '';

  constructor(
    private dniService: DniService,
    private router: Router,
    private privacyNotice: PrivacyNoticeService
  ) {
    this.privacyAccepted = privacyNotice.hasAcceptedNotice();
  }

  ngAfterViewInit(): void {
    if (!this.privacyAccepted) {
      this.openPrivacyDialog();
    }
  }

  openPrivacyDialog(): void {
    this.privacyChecked = false;
    this.privacyError = '';
    if (!this.privacyDialog.nativeElement.open) {
      this.privacyDialog.nativeElement.showModal();
      this.privacyDialog.nativeElement.querySelector<HTMLElement>('#privacy-modal-title')?.focus({ preventScroll: true });
    }
  }

  preventDialogDismiss(event: Event): void {
    event.preventDefault();
  }

  handleDialogClose(): void {
    if (!this.privacyAccepted) {
      this.privacyRejected = true;
    }
  }

  acceptPrivacy(): void {
    if (!this.privacyChecked) {
      this.privacyError = 'Marca la casilla para continuar.';
      return;
    }

    if (!this.privacyNotice.acceptNotice()) {
      this.privacyError = 'No se pudo guardar tu elección en este navegador. Revisa su configuración e inténtalo de nuevo.';
      return;
    }

    this.privacyAccepted = true;
    this.privacyRejected = false;
    this.privacyError = '';
    this.privacyDialog.nativeElement.close();
  }

  rejectPrivacy(): void {
    this.privacyNotice.clearChoice();
    this.privacyAccepted = false;
    this.privacyRejected = true;
    this.privacyChecked = false;
    this.privacyDialog.nativeElement.close();
  }

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
    if (this.cargando || !this.privacyAccepted) {
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
