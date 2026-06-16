import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const clienteAuthGuard: CanActivateFn = () => {
  const router = inject(Router);

  const sessionId = localStorage.getItem('chat_session_id');
  const usuario = localStorage.getItem('usuario_dni');

  if (sessionId && usuario) {
    return true;
  }

  router.navigate(['/dni-login']);
  return false;
};