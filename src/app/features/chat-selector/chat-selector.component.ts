import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-selector.component.html',
  styleUrl: './chat-selector.component.css'
})
export class ChatSelectorComponent {

  nombre = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.nombre = localStorage.getItem('nombre_cliente') || 'Cliente';
  }

  irATexto(): void {
    localStorage.setItem('chat_mode', 'texto');
    this.router.navigate(['/chat']);
  }

  irAVoz(): void {
    localStorage.setItem('chat_mode', 'voz');
    this.router.navigate(['/chat']);
  }

  cerrarSesion(): void {
  localStorage.removeItem('usuario_dni');
  localStorage.removeItem('nombre_cliente');
  localStorage.removeItem('chat_session_id');
  localStorage.removeItem('chat_mode');

  this.router.navigate(['/dni-login']);
}
}