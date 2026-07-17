import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetricasService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas`);
  }

  getResumen(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metricas/resumen`);
  }

}