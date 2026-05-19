import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = 'https://backendopensource-production.up.railway.app';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getCitas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/citas`, {
      headers: this.getHeaders()
    });
  }

  updateEstado(id: number, estado: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/citas/${id}`,
      { estado },
      { headers: this.getHeaders() }
    );
  }

  getMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas`, {
      headers: this.getHeaders()
    });
  }

  evaluarMetrica(id: number, data: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/metricas/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  getResumenMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas/resumen`, {
      headers: this.getHeaders()
    });
  }

  getMetricasPorIntent(): Observable<any> {
  return this.http.get(`${this.apiUrl}/metricas/por-intent`, {
    headers: this.getHeaders()
  });
}
}