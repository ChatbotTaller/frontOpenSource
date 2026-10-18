import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { privacyConfig } from '../privacy.config';

const STORAGE_KEY = 'mara_privacy_choice';

interface PrivacyChoice {
  version: string;
  acceptedAt: string;
  acknowledgement: string;
}

@Injectable({ providedIn: 'root' })
export class PrivacyNoticeService {
  constructor(private http: HttpClient) {}

  hasAcceptedNotice(): boolean {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const choice = JSON.parse(stored) as PrivacyChoice;
      return choice.version === privacyConfig.version && typeof choice.acceptedAt === 'string' &&
        typeof choice.acknowledgement === 'string' && choice.acknowledgement.length > 0;
    } catch {
      return false;
    }
  }

  acceptNotice(): Observable<{ acknowledgement: string; version: string }> {
    return this.http.post<{ acknowledgement: string; version: string }>(
      `${environment.apiUrl}/privacy/acknowledge`,
      { accepted: true, version: privacyConfig.version }
    ).pipe(tap(response => {
      if (!response.acknowledgement || response.version !== privacyConfig.version) {
        throw new Error('Confirmación inválida');
      }
      const choice: PrivacyChoice = {
        version: response.version,
        acceptedAt: new Date().toISOString(),
        acknowledgement: response.acknowledgement
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    }));
  }

  getAcknowledgementToken(): string {
    if (!this.hasAcceptedNotice()) return '';
    try {
      return (JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') as PrivacyChoice).acknowledgement;
    } catch {
      return '';
    }
  }

  clearChoice(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // El formulario seguirá bloqueado si el almacenamiento no está disponible.
    }
  }
}
