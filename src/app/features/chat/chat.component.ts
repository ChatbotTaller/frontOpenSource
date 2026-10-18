import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../core/services/chatbot.service';
import { RetellWebClient } from 'retell-client-js-sdk';
import { LocalAudioTrack, Room, RoomEvent, Track, createLocalAudioTrack } from 'livekit-client';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

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
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('maraVideo') maraVideoRef!: ElementRef<HTMLElement>;

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
  nombreCliente = '';

  private recognition: any = null;
  private finalTranscript = '';
  private pressTimer: any = null;
  isHoldMode = false;
  private pressStartTime = 0;

  private nextMessageCanal: 'texto' | 'voz' = 'texto';
  modoChat: 'texto' | 'voz' = 'texto';

  private retellClient = new RetellWebClient();

  isRetellActive = false;
  isRetellConnecting = false;
  isMaraSpeaking = false;
  isMaraListening = false;
  retellStatus = 'Lista para hablar';

  private livekitRoom: Room | null = null;
  private maraMicrophoneTrack: LocalAudioTrack | null = null;
  private maraCallAttempt = 0;
  private maraDisposals = new WeakMap<Room, Promise<void>>();
  private cancelMaraReadyWait: (() => void) | null = null;
  isMaraAvatarStopping = false;

  isMaraAvatarActive = false;
  isMaraAvatarConnecting = false;
  isMaraMicrophoneMuted = false;
  isMaraMicrophoneChanging = false;
  hasMaraVideo = false;

  messages: ChatMessage[] = [];

  constructor(
    private chatbotService: ChatbotService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMessages();
    this.initSpeechRecognition();
    this.initRetellEvents();
    this.modoChat = (localStorage.getItem('chat_mode') as 'texto' | 'voz') || 'texto';
    this.nombreCliente = localStorage.getItem('nombre_cliente') || 'Cliente';

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

  ngOnDestroy(): void {
    this.maraCallAttempt += 1;
    this.cancelMaraReadyWait?.();
    void this.disposeMaraAvatarRoom(this.livekitRoom);
    window.speechSynthesis.cancel();

    if (this.recognition) {
      this.recognition.abort?.();
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

  useImageFallback(event: Event, fallbackSrc: string): void {
    const image = event.target as HTMLImageElement;

    if (image.dataset['fallbackApplied'] === 'true') return;

    image.dataset['fallbackApplied'] = 'true';
    image.src = fallbackSrc;
  }

  private getSessionId(): string {
    const sessionId = localStorage.getItem('chat_session_id');

    if (!sessionId) {
      throw new Error('Cliente no autenticado');
    }

    return sessionId;
  }

  private handleClientUnauthorized(error: any): boolean {
    if (error?.status !== 401 && error?.status !== 403) return false;

    const sessionId = localStorage.getItem('chat_session_id');
    if (sessionId) localStorage.removeItem(`chat_messages_${sessionId}`);
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('nombre_cliente');
    localStorage.removeItem('chat_mode');
    void this.router.navigate(['/dni-login']);
    return true;
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
      oscillator.onended = () => { void audioContext.close(); };
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

        if (canalMensaje === 'voz') {
          this.speakResponse(respuesta);
        }

        if (typeof response.appointment_in_progress === 'boolean') {
          this.enFlujoCita = response.appointment_in_progress;
        } else if (
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
        if (this.handleClientUnauthorized(error)) return;
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
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      permissionStream.getTracks().forEach(track => track.stop());

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

  private removeTrackElements(track: Track): void {
    track.detach().forEach(element => {
      element.pause();
      element.srcObject = null;
      element.remove();
    });
  }

  private cleanupMaraMediaElements(): void {
    const container = this.maraVideoRef?.nativeElement;

    container?.querySelectorAll('video').forEach(video => {
      video.pause();
      video.srcObject = null;
      video.remove();
    });

    document
      .querySelectorAll<HTMLAudioElement>('audio[data-mara-audio="true"]')
      .forEach(audio => {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      });

    this.hasMaraVideo = false;
  }

  private async disposeMaraAvatarRoom(room: Room | null): Promise<void> {
    if (!room) return;
    const pending = this.maraDisposals.get(room);
    if (pending) return pending;

    // Release only the media owned by this room, before any asynchronous close.
    // A late close from an old call must never reset the next call.
    if (this.livekitRoom === room) {
      this.livekitRoom = null;
      this.maraMicrophoneTrack?.stop();
      this.maraMicrophoneTrack = null;
      this.isMaraMicrophoneMuted = false;
      this.isMaraMicrophoneChanging = false;
      this.cleanupMaraMediaElements();
    }
    room.removeAllListeners();
    room.localParticipant.trackPublications.forEach(publication => publication.track?.stop());

    room.remoteParticipants.forEach(participant => {
      participant.trackPublications.forEach(publication => {
        if (publication.track) {
          this.removeTrackElements(publication.track);
        }
      });
    });

    const closing = room.disconnect(true).catch(error => {
      console.warn('No se pudo cerrar completamente la sala de Mara:', error);
    });
    this.maraDisposals.set(room, closing);
    return closing;
  }

  private waitForMaraReady(room: Room, attemptId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        room.off(RoomEvent.ParticipantAttributesChanged, check);
        room.off(RoomEvent.TrackSubscribed, check);
        room.off(RoomEvent.Disconnected, disconnected);
        if (this.cancelMaraReadyWait === cancel) this.cancelMaraReadyWait = null;
        error ? reject(error) : resolve();
      };
      const cancel = () => finish(new Error('Llamada cancelada'));
      const disconnected = () => finish(new Error('La sala se desconectó'));
      const check = () => {
        if (attemptId !== this.maraCallAttempt || this.livekitRoom !== room) return cancel();
        const participants = [...room.remoteParticipants.values()];
        const ready = participants.some(p => ['listening', 'thinking', 'speaking'].includes(p.attributes['lk.agent.state']));
        const audioReady = participants.some(p => [...p.audioTrackPublications.values()].some(pub => Boolean(pub.track)));
        if (ready && audioReady) finish();
      };
      const timer = setTimeout(() => finish(new Error('Mara no está disponible. Intenta iniciar una nueva llamada.')), 35000);
      this.cancelMaraReadyWait = cancel;
      room.on(RoomEvent.ParticipantAttributesChanged, check);
      room.on(RoomEvent.TrackSubscribed, check);
      room.on(RoomEvent.Disconnected, disconnected);
      check();
    });
  }

  async startMaraAvatarCall(): Promise<void> {
    if (this.isMaraAvatarActive || this.isMaraAvatarConnecting || this.isMaraAvatarStopping) return;

    const attemptId = ++this.maraCallAttempt;
    this.isMaraAvatarConnecting = true;

    // La liberación local ocurre de inmediato. La desconexión remota puede acabar
    // en segundo plano sin bloquear el siguiente intento de llamada.
    void this.disposeMaraAvatarRoom(this.livekitRoom);

    if (attemptId !== this.maraCallAttempt) return;

    this.isMaraAvatarConnecting = true;
    this.isMaraSpeaking = false;
    this.isMaraListening = false;
    this.isMaraMicrophoneMuted = false;
    this.isMaraMicrophoneChanging = false;
    this.hasMaraVideo = false;
    this.retellStatus = 'Conectando con Mara IA...';

    window.speechSynthesis.cancel();

    this.chatbotService.createLivekitToken().pipe(timeout(15000)).subscribe({
      next: async (data) => {
        if (attemptId !== this.maraCallAttempt) return;

        let room: Room | null = null;
        let createdMicrophone: LocalAudioTrack | null = null;

        try {
          const activeRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            disconnectOnPageLeave: true
          });

          room = activeRoom;
          this.livekitRoom = activeRoom;

          activeRoom.on(RoomEvent.TrackSubscribed, (track) => {
            if (this.livekitRoom !== activeRoom || attemptId !== this.maraCallAttempt) {
              this.removeTrackElements(track);
              return;
            }

            if (track.kind === Track.Kind.Video) {
              const videoElement = track.attach() as HTMLVideoElement;
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              videoElement.muted = true;

              const container = this.maraVideoRef?.nativeElement;

              if (container) {
                container.innerHTML = '';
                container.appendChild(videoElement);

                const showLiveVideo = () => {
                  if (this.livekitRoom === activeRoom && attemptId === this.maraCallAttempt) {
                    this.hasMaraVideo = true;
                  }
                };

                if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                  showLiveVideo();
                } else {
                  videoElement.addEventListener('loadeddata', showLiveVideo, { once: true });
                }
              }
            }

            if (track.kind === Track.Kind.Audio) {
              const audioElement = track.attach() as HTMLAudioElement;
              audioElement.autoplay = true;
              audioElement.dataset['maraAudio'] = 'true';
              audioElement.hidden = true;
              document.body.appendChild(audioElement);
            }
          });

          activeRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
            this.removeTrackElements(track);

            if (track.kind === Track.Kind.Video && this.livekitRoom === activeRoom) {
              this.hasMaraVideo = false;
            }
          });

          activeRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            if (!this.isMaraAvatarActive || this.livekitRoom !== activeRoom) return;

            const localIdentity = activeRoom.localParticipant.identity;
            const maraIsSpeaking = speakers.some(
              participant => participant.identity !== localIdentity
            );

            this.isMaraSpeaking = maraIsSpeaking;
            this.isMaraListening = !maraIsSpeaking && !this.isMaraMicrophoneMuted;
            this.retellStatus = maraIsSpeaking
              ? 'Mara IA está respondiendo...'
              : (this.isMaraMicrophoneMuted
                  ? 'Tu micrófono está silenciado'
                  : 'Mara IA está escuchando...');
          });

          activeRoom.on(RoomEvent.Disconnected, () => {
            if (this.livekitRoom !== activeRoom) return;

            this.cancelMaraReadyWait?.();
            void this.disposeMaraAvatarRoom(activeRoom);
            this.isMaraAvatarActive = false;
            this.isMaraAvatarConnecting = false;
            this.isMaraSpeaking = false;
            this.isMaraListening = false;
            this.maraMicrophoneTrack = null;
            this.isMaraMicrophoneMuted = false;
            this.isMaraMicrophoneChanging = false;
            this.retellStatus = 'Lista para hablar';
          });

          await activeRoom.connect(data.url, data.token, { websocketTimeout: 15000, peerConnectionTimeout: 15000 });

          if (attemptId !== this.maraCallAttempt || this.livekitRoom !== activeRoom) {
            await this.disposeMaraAvatarRoom(activeRoom);
            return;
          }

          const audioTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          });
          createdMicrophone = audioTrack;

          if (attemptId !== this.maraCallAttempt || this.livekitRoom !== activeRoom) {
            audioTrack.stop();
            await this.disposeMaraAvatarRoom(activeRoom);
            return;
          }

          this.maraMicrophoneTrack = audioTrack;
          await activeRoom.localParticipant.publishTrack(audioTrack);
          if (attemptId !== this.maraCallAttempt || this.livekitRoom !== activeRoom) {
            audioTrack.stop();
            await this.disposeMaraAvatarRoom(activeRoom);
            return;
          }
          await activeRoom.startAudio();
          if (attemptId !== this.maraCallAttempt || this.livekitRoom !== activeRoom) {
            audioTrack.stop();
            await this.disposeMaraAvatarRoom(activeRoom);
            return;
          }
          this.retellStatus = 'Esperando a que Mara esté lista...';
          await this.waitForMaraReady(activeRoom, attemptId);
          if (attemptId !== this.maraCallAttempt || this.livekitRoom !== activeRoom) return;
          this.isMaraAvatarActive = true;
          this.isMaraAvatarConnecting = false;
          this.isMaraListening = true;
          this.retellStatus = 'Mara IA está escuchando...';

        } catch (error) {
          createdMicrophone?.stop();
          console.error('Error conectando LiveKit:', error);

          if (room) {
            await this.disposeMaraAvatarRoom(room);
          }

          if (attemptId !== this.maraCallAttempt) return;

          this.isMaraAvatarActive = false;
          this.isMaraAvatarConnecting = false;
          this.isMaraSpeaking = false;
          this.isMaraListening = false;
          this.maraMicrophoneTrack = null;
          this.isMaraMicrophoneMuted = false;
          this.isMaraMicrophoneChanging = false;
          this.retellStatus = 'Mara no está disponible. Puedes intentar una nueva llamada.';
        }
      },
      error: (error) => {
        if (attemptId !== this.maraCallAttempt) return;

        console.error('Error obteniendo token LiveKit:', error);
        if (this.handleClientUnauthorized(error)) return;
        this.isMaraAvatarConnecting = false;
        this.retellStatus = 'No se pudo generar token de Mara IA';
      }
    });
  }

  async toggleMaraMicrophone(): Promise<void> {
    const microphoneTrack = this.maraMicrophoneTrack;

    if (!this.isMaraAvatarActive || !microphoneTrack || this.isMaraMicrophoneChanging) {
      return;
    }

    this.isMaraMicrophoneChanging = true;

    try {
      if (this.isMaraMicrophoneMuted) {
        await microphoneTrack.unmute();
        if (this.maraMicrophoneTrack !== microphoneTrack) return;
        this.isMaraMicrophoneMuted = false;
        this.isMaraListening = !this.isMaraSpeaking;
        this.retellStatus = this.isMaraSpeaking
          ? 'Mara IA está respondiendo...'
          : 'Mara IA está escuchando...';
      } else {
        await microphoneTrack.mute();
        if (this.maraMicrophoneTrack !== microphoneTrack) return;
        this.isMaraMicrophoneMuted = true;
        this.isMaraListening = false;
        this.retellStatus = this.isMaraSpeaking
          ? 'Mara IA está respondiendo...'
          : 'Tu micrófono está silenciado';
      }
    } catch (error) {
      console.error('No se pudo cambiar el estado del micrófono:', error);
      this.retellStatus = 'No se pudo cambiar el micrófono';
    } finally {
      if (this.maraMicrophoneTrack === microphoneTrack) this.isMaraMicrophoneChanging = false;
    }
  }

  async stopMaraAvatarCall(): Promise<void> {
    if (this.isMaraAvatarStopping) return;
    this.isMaraAvatarStopping = true;
    this.maraCallAttempt += 1;
    this.cancelMaraReadyWait?.();
    const room = this.livekitRoom;

    this.retellStatus = 'Finalizando llamada...';
    // No mantenemos el botón bloqueado mientras LiveKit confirma el cierre remoto.
    // disposeMaraAvatarRoom ya detuvo el micrófono y retiró el contenido local.
    void this.disposeMaraAvatarRoom(room);

    this.isMaraAvatarActive = false;
    this.isMaraAvatarConnecting = false;
    this.isMaraSpeaking = false;
    this.isMaraListening = false;
    this.maraMicrophoneTrack = null;
    this.isMaraMicrophoneMuted = false;
    this.isMaraMicrophoneChanging = false;
    this.isMaraAvatarStopping = false;
    this.retellStatus = 'Lista para hablar';
  }

  async volverSelector(): Promise<void> {
    await this.stopMaraAvatarCall();
    this.router.navigate(['/seleccionar-chat']);
  }

  async cerrarSesionCliente(): Promise<void> {
    await this.stopMaraAvatarCall();

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

    this.messages = [];

    this.router.navigate(['/dni-login']);
  }
}
