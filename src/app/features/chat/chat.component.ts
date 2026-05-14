import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../core/services/chatbot.service';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot';
  time: string;
  isError?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  userInput = '';
  isLoading = false;
  showSuggestions = true;

  messages: ChatMessage[] = [];
  constructor(private chatbotService: ChatbotService) {}

  getTime(): string {
    return new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  addMessage(text: string, type: 'user' | 'bot', isError = false): void {
    this.messages.push({
      text,
      type,
      time: this.getTime(),
      isError
    });
  }

  sendChip(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  handleKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    const text = this.userInput.trim();

    if (!text || this.isLoading) return;

    this.showSuggestions = false;
    this.userInput = '';
    this.isLoading = true;

    this.addMessage(text, 'user');

    this.chatbotService.sendMessage(text).subscribe({
      next: (response) => {
        this.addMessage(response.reply || 'Sin respuesta del servidor.', 'bot');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.addMessage(
          'No puedo conectarme al servidor. Verifica que Node.js y ngrok estén activos.',
          'bot',
          true
        );
        this.isLoading = false;
      }
    });
  }
}