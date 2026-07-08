import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DniService {

  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  verificarDni(dni: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/dni/verificar`,
      { dni }
    );
  }
}