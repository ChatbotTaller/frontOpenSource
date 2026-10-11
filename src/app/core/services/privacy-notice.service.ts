import { Injectable } from '@angular/core';
import { privacyConfig } from '../privacy.config';

const STORAGE_KEY = 'mara_privacy_choice';

interface PrivacyChoice {
  version: string;
  acceptedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PrivacyNoticeService {
  hasAcceptedNotice(): boolean {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const choice = JSON.parse(stored) as PrivacyChoice;
      return choice.version === privacyConfig.version && typeof choice.acceptedAt === 'string';
    } catch {
      return false;
    }
  }

  acceptNotice(): boolean {
    try {
      const choice: PrivacyChoice = {
        version: privacyConfig.version,
        acceptedAt: new Date().toISOString()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
      return true;
    } catch {
      return false;
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
