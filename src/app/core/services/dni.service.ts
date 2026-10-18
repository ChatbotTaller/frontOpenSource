import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrivacyNoticeService } from './privacy-notice.service';

@Injectable({
  providedIn: 'root'
})
export class DniService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private privacyNotice: PrivacyNoticeService) {}

  verificarDni(dni: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/dni/verificar`,
      { dni },
      { headers: new HttpHeaders({ 'X-Privacy-Acknowledgement': this.privacyNotice.getAcknowledgementToken() }) }
    );
  }
}
