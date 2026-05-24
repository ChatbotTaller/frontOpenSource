import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  userInput = '';
  isLoading = false;
  enFlujoCita = false;
  showSuggestions = true;
  private shouldScroll = false;

  messages: ChatMessage[] = [];

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  private getSessionId(): string {
    let sessionId = localStorage.getItem('chat_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
  }

  private getStorageKey(): string {
    return `chat_messages_${this.getSessionId()}`;
  }

  private saveMessages(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.messages));
  }

  private loadMessages(): void {
    const savedMessages = localStorage.getItem(this.getStorageKey());
    if (savedMessages) {
      this.messages = JSON.parse(savedMessages);
      this.showSuggestions = this.messages.length === 0;
      this.shouldScroll = true;
    }
  }

  getTime(): string {
    return new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  addMessage(text: string, type: 'user' | 'bot', isError = false): void {
    this.messages.push({ text, type, time: this.getTime(), isError });
    this.saveMessages();
    this.shouldScroll = true;
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

    // Reset textarea height
    const ta = document.querySelector('textarea') as HTMLTextAreaElement;
    if (ta) ta.style.height = 'auto';

    this.isLoading = true;
    this.addMessage(text, 'user');

    this.chatbotService.sendMessage(text).subscribe({
      next: (response) => {
        this.addMessage(response.reply || 'Sin respuesta del servidor.', 'bot');
        const respuesta = response.reply || '';

        if (
          respuesta.includes('Tu cita fue registrada correctamente') ||
          respuesta.includes('cita fue registrada correctamente') ||
          respuesta.includes('Se canceló el proceso de agendamiento')
        ) {
          this.enFlujoCita = false;
        } else {
          this.enFlujoCita =
            response.intent === 'appointment' ||
            response.intent === 'appointment_pending';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.addMessage(
          'No puedo conectarme al servidor. Verifica tu conexión.',
          'bot',
          true
        );
        this.isLoading = false;
      }
    });
  }

  cancelarAgendamiento(): void {
    if (this.isLoading) return;
    this.userInput = 'cancelar';
    this.sendMessage();
  }
}