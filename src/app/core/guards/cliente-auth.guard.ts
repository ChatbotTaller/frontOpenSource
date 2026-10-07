import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { ChatbotService } from '../services/chatbot.service';

export const clienteAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const chatbotService = inject(ChatbotService);

  const sessionId = localStorage.getItem('chat_session_id');

  if (!sessionId) {
    return router.createUrlTree(['/dni-login']);
  }

  return chatbotService.validateSession().pipe(
    map(response => response?.valid === true
      ? true
      : router.createUrlTree(['/dni-login'])
    ),
    catchError(() => {
      localStorage.removeItem('chat_session_id');
      localStorage.removeItem('nombre_cliente');
      localStorage.removeItem('chat_mode');
      return of(router.createUrlTree(['/dni-login']));
    })
  );
};
