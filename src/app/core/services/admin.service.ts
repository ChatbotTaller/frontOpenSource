import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  private handleAuthError(error: any) {
    if (error?.status === 401 || error?.status === 403) {
      localStorage.removeItem('admin_token');
      void this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getCitas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/citas`, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleAuthError(error)));
  }

  updateEstado(id: number, estado: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/citas/${id}`,
      { estado },
      { headers: this.getHeaders() }
    ).pipe(catchError(error => this.handleAuthError(error)));
  }

  getMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas`, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleAuthError(error)));
  }

  evaluarMetrica(id: number, data: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/metricas/${id}`,
      data,
      { headers: this.getHeaders() }
    ).pipe(catchError(error => this.handleAuthError(error)));
  }

  getResumenMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas/resumen`, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleAuthError(error)));
  }

  getMetricasPorIntent(): Observable<any> {
  return this.http.get(`${this.apiUrl}/metricas/por-intent`, {
    headers: this.getHeaders()
  }).pipe(catchError(error => this.handleAuthError(error)));
}

  getMetricasVoz(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas/voz`, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleAuthError(error)));
  }
}
