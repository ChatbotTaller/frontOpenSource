import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  private getClientHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getSessionId()}`
    });
  }

  sendMessage(message: string, canal: 'texto' | 'voz' = 'texto'): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(this.backendUrl, {
      user_message: message,
      canal
    }, {
      headers: this.getClientHeaders()
    });
  }

  createRetellWebCall(): Observable<any> {
    return this.http.post<any>(
      `${this.backendBaseUrl}/retell/create-web-call`,
      {
        canal: 'voz-retell'
      },
      { headers: this.getClientHeaders() }
    );
  }

  private getSessionId(): string {
    const sessionId = localStorage.getItem('chat_session_id');

    if (!sessionId) {
      throw new Error('Cliente no autenticado');
    }

    return sessionId;
  }

  validateSession(): Observable<any> {
    return this.http.get<any>(`${this.backendBaseUrl}/cliente/sesion`, {
      headers: this.getClientHeaders()
    });
  }

  createLivekitToken() {
    return this.http.post<any>(
      `${this.backendBaseUrl}/livekit/token`,
      {},
      { headers: this.getClientHeaders() }
    );
  }
}
