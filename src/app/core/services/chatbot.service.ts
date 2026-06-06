import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ChatbotResponse {
  reply: string;
  intent?: string;
  response_time_ms?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private backendUrl = 'http://localhost:3000/webhook';

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

  private getSessionId(): string {
    let sessionId = localStorage.getItem('chat_session_id');

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sessionId);
    }

    return sessionId;
  }
}