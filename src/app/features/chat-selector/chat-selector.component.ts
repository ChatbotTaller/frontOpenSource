import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ChatbotService } from '../../core/services/chatbot.service';

@Component({
  selector: 'app-chat-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-selector.component.html',
  styleUrl: './chat-selector.component.css'
})
export class ChatSelectorComponent {

  nombre = '';

  constructor(private router: Router, private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.nombre = localStorage.getItem('nombre_cliente') || 'Cliente';
  }

  get primerNombre(): string {
    return this.nombre.trim().split(/\s+/)[0] || 'Cliente';
  }

  irATexto(): void {
    localStorage.setItem('chat_mode', 'texto');
    this.router.navigate(['/chat']);
  }

  irAVoz(): void {
    localStorage.setItem('chat_mode', 'voz');
    this.router.navigate(['/chat']);
  }

  async cerrarSesion(): Promise<void> {
    const sessionId = localStorage.getItem('chat_session_id');
    if (sessionId) {
      try {
        await firstValueFrom(this.chatbotService.logoutClient().pipe(timeout(5000)));
      } catch {
        // Se borra igualmente la copia local si el backend no está disponible.
      }
      localStorage.removeItem(`chat_messages_${sessionId}`);
    }
    localStorage.removeItem('nombre_cliente');
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('chat_mode');

    this.router.navigate(['/dni-login']);
  }
}
