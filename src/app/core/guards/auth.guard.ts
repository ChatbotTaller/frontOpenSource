import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('admin_token');

  if (token) {
    try {
      const encodedPayload = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const paddedPayload = encodedPayload.padEnd(
        encodedPayload.length + ((4 - encodedPayload.length % 4) % 4),
        '='
      );
      const payload = JSON.parse(atob(paddedPayload));
      const validRole = payload?.role === 'admin';
      const notExpired = Number(payload?.exp || 0) * 1000 > Date.now();

      if (validRole && notExpired) return true;
    } catch {}
  }

  localStorage.removeItem('admin_token');
  return router.createUrlTree(['/login']);
};
