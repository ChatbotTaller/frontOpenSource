import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ChatbotResponse {
  reply: string;
  intent?: string;
  response_time_ms?: number;
}

interface RetellWebCallResponse {
  call_id: string;
  call_type: string;
  agent_id: string;
  agent_version: number;
  agent_name: string;
  call_status: string;
  access_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private backendBaseUrl = environment.apiUrl;
  private backendUrl = `${this.backendBaseUrl}/webhook`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, canal: 'texto' | 'voz' = 'texto'): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(this.backendUrl, {
      user_message: message,
      session_id: this.getSessionId(),
      canal,
      stt_exitoso: canal === 'voz' ? 1 : 1,
      tts_exitoso: canal === 'voz' ? 1 : 1
    });
  }

  createRetellWebCall(): Observable<any> {
    return this.http.post<any>(
      `${this.backendBaseUrl}/retell/create-web-call`,
      {
        session_id: this.getSessionId()
      }
    );
  }

  private getSessionId(): string {
    const sessionId = localStorage.getItem('chat_session_id');

    if (!sessionId) {
      throw new Error('Cliente no autenticado');
    }

    return sessionId;
  }

  createLivekitToken(roomName: string, participantName: string) {
    return this.http.post<any>(`${this.backendBaseUrl}/livekit/token`, {
      roomName,
      participantName
    });
  }
}