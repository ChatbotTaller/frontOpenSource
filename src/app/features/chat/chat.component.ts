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

  isListening = false;
  voiceEnabled = true;
  speechSupported = false;
  voiceStatus = '';
  liveTranscript = '';

  private recognition: any = null;
  private finalTranscript = '';
  private pressTimer: any = null;
  isHoldMode = false;
  private pressStartTime = 0;

  private nextMessageCanal: 'texto' | 'voz' = 'texto';

  messages: ChatMessage[] = [];

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.loadMessages();
    this.initSpeechRecognition();
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

  private initSpeechRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    this.speechSupported = !!SpeechRecognition;

    if (!SpeechRecognition) {
      this.voiceStatus = 'Tu navegador no soporta reconocimiento de voz.';
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-PE';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.voiceStatus = 'Escuchando...';
      this.liveTranscript = '';
      this.finalTranscript = '';
      this.playBeep(700);
    };

    this.recognition.onresult = (event: any) => {
      let textoFinal = '';
      let textoTemporal = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          textoFinal += transcript + ' ';
        } else {
          textoTemporal += transcript;
        }
      }

      const textoReconocido = (textoFinal + textoTemporal).trim();

      this.liveTranscript = textoReconocido;
      this.userInput = textoReconocido;
      this.voiceStatus = textoReconocido
        ? 'Transcribiendo tu voz...'
        : 'Escuchando...';
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error reconocimiento de voz:', event.error);
      this.isListening = false;
      this.voiceStatus = '';
      this.liveTranscript = '';

      this.addMessage(
        'No pude escuchar bien el audio. Intenta hablar más cerca del micrófono.',
        'bot',
        true
      );
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  handleMicPointerDown(event: PointerEvent): void {
  event.preventDefault();

  if (this.isLoading || !this.speechSupported) return;

  this.pressStartTime = Date.now();
  this.isHoldMode = false;

  this.pressTimer = setTimeout(() => {
    this.isHoldMode = true;

    if (!this.isListening) {
      this.startListening();
    }
  }, 180);
}

handleMicPointerUp(event: PointerEvent): void {
  event.preventDefault();

  if (this.pressTimer) {
    clearTimeout(this.pressTimer);
    this.pressTimer = null;
  }

  const pressDuration = Date.now() - this.pressStartTime;

  if (this.isHoldMode || pressDuration >= 180) {
    this.stopListeningAndSend();
    return;
  }

  this.toggleListening();
}

toggleListening(): void {
  if (this.isListening) {
    this.stopListeningAndSend();
  } else {
    this.startListening();
  }
}

startListening(): void {
  if (!this.recognition || this.isLoading) return;

  try {
    navigator.mediaDevices?.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    window.speechSynthesis.cancel();
    this.recognition.start();
  } catch (error) {
    console.error('No se pudo iniciar el micrófono:', error);
    this.isListening = false;
  }
}

stopListeningAndSend(): void {
  if (!this.recognition || !this.isListening) return;

  this.playBeep(420);
  this.voiceStatus = 'Procesando tu consulta...';

  try {
    this.recognition.stop();
  } catch {}

  setTimeout(() => {
    const text = (this.liveTranscript || this.userInput).trim();

    if (!text) {
      this.voiceStatus = '';
      this.liveTranscript = '';
      return;
    }

    this.userInput = text;
    this.nextMessageCanal = 'voz';
    this.sendMessage();
    this.liveTranscript = '';
  }, 250);
}

  private playBeep(frequency: number): void {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
    } catch {}
  }

  speakResponse(text: string): void {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  toggleVoice(): void {
    this.voiceEnabled = !this.voiceEnabled;

    if (!this.voiceEnabled) {
      window.speechSynthesis.cancel();
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

    const canalMensaje = this.nextMessageCanal;
    this.nextMessageCanal = 'texto';

this.chatbotService.sendMessage(text, canalMensaje).subscribe({
      next: (response) => {
        const respuesta = response.reply || 'Sin respuesta del servidor.';
        this.addMessage(respuesta, 'bot');
        this.speakResponse(respuesta);

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
        this.voiceStatus = '';
      },
      error: (error) => {
        console.error('Error:', error);
        this.addMessage(
          'No puedo conectarme al servidor. Verifica tu conexión.',
          'bot',
          true
        );
        this.isLoading = false;
        this.voiceStatus = '';
      }
    });
  }

  cancelarAgendamiento(): void {
    if (this.isLoading) return;
    this.userInput = 'cancelar';
    this.sendMessage();
  }
}