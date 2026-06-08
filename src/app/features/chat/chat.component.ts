import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../core/services/chatbot.service';
import { RetellWebClient } from 'retell-client-js-sdk';

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
  showPhoneInput = false;
  phoneInput = '';
  voiceStatus = '';
  liveTranscript = '';

  private recognition: any = null;
  private finalTranscript = '';
  private pressTimer: any = null;
  isHoldMode = false;
  private pressStartTime = 0;

  private nextMessageCanal: 'texto' | 'voz' = 'texto';

  private retellClient = new RetellWebClient();

  isRetellActive = false;
  isRetellConnecting = false;
  isMaraSpeaking = false;
  isMaraListening = false;
  retellStatus = 'Lista para hablar';

  messages: ChatMessage[] = [];

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.loadMessages();
    this.initSpeechRecognition();
    this.initRetellEvents();

    window.speechSynthesis.getVoices();

    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
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

    const hablar = () => {

    const textoLimpio = text
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[✅❌⚠️📅📞🚗🛠️👤🎉😊😎🔥💬📍⏰☎️]/gu, '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/`/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

      const voices = window.speechSynthesis.getVoices();

      const vozLatina =
        voices.find(v => v.lang === 'es-CO') ||
        voices.find(v => v.name.toLowerCase().includes('colombia')) ||
        voices.find(v => v.lang === 'es-MX') ||
        voices.find(v => v.lang === 'es-US') ||
        voices.find(v => v.lang === 'es-ES') ||
        voices.find(v => v.lang.startsWith('es'));

      const utterance = new SpeechSynthesisUtterance(textoLimpio);

      if (vozLatina) {
        utterance.voice = vozLatina;
        utterance.lang = vozLatina.lang;
      } else {
        utterance.lang = 'es-CO';
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.08;
      utterance.volume = 1;

      utterance.onstart = () => {
        this.isMaraSpeaking = true;
        this.retellStatus = 'Mara está respondiendo...';
      };

      utterance.onend = () => {
        this.isMaraSpeaking = false;
        this.retellStatus = 'Lista para hablar';
      };

      utterance.onerror = () => {
        this.isMaraSpeaking = false;
        this.retellStatus = 'Lista para hablar';
      };

      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();

    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => hablar();
    } else {
      hablar();
    }
  }

  toggleVoice(): void {
    this.voiceEnabled = !this.voiceEnabled;

    if (!this.voiceEnabled) {
      window.speechSynthesis.cancel();
      this.isMaraSpeaking = false;
      this.retellStatus = 'Lista para hablar';
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

    if (this.isRetellActive) {
      this.chatbotService.sendMessage(text, 'voz').subscribe({
        next: () => {
          this.isLoading = false;
          this.voiceStatus = '';
        },
        error: () => {
          this.isLoading = false;
          this.voiceStatus = '';
        }
      });

      return;
    }

    const canalMensaje = this.nextMessageCanal;
    this.nextMessageCanal = 'texto';

this.chatbotService.sendMessage(text, canalMensaje).subscribe({
      next: (response) => {
        const respuesta = response.reply || 'Sin respuesta del servidor.';
        this.detectSpecialInputRequest(respuesta);
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

  private initRetellEvents(): void {
    this.retellClient.on('call_started', () => {
      this.isRetellActive = true;
      console.timeEnd('RETELL_CONNECT');
      this.isRetellConnecting = false;
      this.isMaraSpeaking = false;
      this.isMaraListening = false;
      this.retellStatus = 'Preparando escucha...';

      setTimeout(() => {
        if (this.isRetellActive) {
          this.isMaraListening = true;
          this.retellStatus = 'Mara está escuchando...';
        }
      }, 1000);
    });

    this.retellClient.on('call_ended', () => {
      this.isRetellActive = false;
      this.isRetellConnecting = false;
      this.isMaraSpeaking = false;
      this.isMaraListening = false;
      this.retellStatus = 'Lista para hablar';
    });

    this.retellClient.on('agent_start_talking', () => {
      this.isMaraSpeaking = true;
      this.isMaraListening = false;
      this.retellStatus = 'Mara está respondiendo...';
    });

    this.retellClient.on('agent_stop_talking', () => {
      this.isMaraSpeaking = false;
      this.isMaraListening = true;
      this.retellStatus = 'Mara está escuchando...';
    });

    this.retellClient.on('error', (error: any) => {
      console.error('Error Retell:', error);
      this.isRetellActive = false;
      this.isRetellConnecting = false;
      this.isMaraSpeaking = false;
      this.isMaraListening = false;
      this.retellStatus = 'Error al conectar con Mara';
    });
  }

  async startRetellCall(): Promise<void> {
    if (this.isRetellActive || this.isRetellConnecting) return;

    console.time('RETELL_CONNECT');

    this.isRetellConnecting = true;
    this.retellStatus = 'Preparando micrófono...';

    window.speechSynthesis.cancel();

    try {
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.retellStatus = 'Conectando con Mara...';

      this.chatbotService.createRetellWebCall().subscribe({
        next: async (response) => {
          try {
            this.retellStatus = 'Iniciando llamada...';

            await this.retellClient.startCall({
              accessToken: response.access_token
            });
          } catch (error) {
            console.error('No se pudo iniciar llamada Retell:', error);
            console.timeEnd('RETELL_CONNECT');
            this.isRetellConnecting = false;
            this.retellStatus = 'No se pudo iniciar la llamada';
          }
        },
        error: (error) => {
          console.error('Error creando llamada Retell:', error);
          console.timeEnd('RETELL_CONNECT');
          this.isRetellConnecting = false;
          this.retellStatus = 'No se pudo conectar con Mara';
        }
      });

    } catch (error) {
      console.error('No se pudo acceder al micrófono:', error);
      console.timeEnd('RETELL_CONNECT');
      this.isRetellConnecting = false;
      this.retellStatus = 'Permiso de micrófono denegado';
    }
  }

  stopRetellCall(): void {
    if (!this.isRetellActive && !this.isRetellConnecting) return;

    this.retellClient.stopCall();

    this.isRetellActive = false;
    this.isRetellConnecting = false;
    this.isMaraSpeaking = false;
    this.isMaraListening = false;
    this.retellStatus = 'Lista para hablar';
  }

    private detectSpecialInputRequest(text: string): void {
      if (!this.isRetellActive) {
        this.showPhoneInput = false;
        return;
      }

      const msg = text.toLowerCase();

      this.showPhoneInput =
        msg.includes('teléfono') ||
        msg.includes('telefono') ||
        msg.includes('número de teléfono') ||
        msg.includes('numero de telefono') ||
        msg.includes('celular');
    }

  sendPhoneFromPanel(): void {
    const phone = this.phoneInput.trim();

    if (!/^9\d{8}$/.test(phone)) {
      this.addMessage('El teléfono debe tener 9 dígitos y empezar con 9.', 'bot', true);
      return;
    }

    this.userInput = `Mi teléfono es ${phone}`;
    this.phoneInput = '';
    this.showPhoneInput = false;
    this.sendMessage();
  }
}