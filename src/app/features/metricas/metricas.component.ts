import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import Chart from 'chart.js/auto';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './metricas.component.html',
  styleUrls: ['./metricas.component.css']
})
export class MetricasComponent implements OnInit {

  metricas: any[] = [];
  chartMetricas: any;
  metricasPorIntent: any[] = [];
  chartIntent: any;

  resumen: any = {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1_score: 0,
    tiempo_promedio_ms: 0
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarResumen();
    this.cargarMetricasPorIntent();
  }

  cargarMetricas(): void {
    this.adminService.getMetricas().subscribe({
      next: (data) => {
        this.metricas = data.map((m: any) => ({
          ...m,
          intencion_correcta: m.intencion_correcta || m.intencion_detectada
        }));
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  cargarResumen(): void {
    this.adminService.getResumenMetricas().subscribe({
      next: (data) => {
        this.resumen = data;

        setTimeout(() => {
          this.crearGraficoMetricas();
        }, 100);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  cargarMetricasPorIntent(): void {
    this.adminService.getMetricasPorIntent().subscribe({
      next: (data) => {
        this.metricasPorIntent = data;

        setTimeout(() => {
          this.crearGraficoIntent();
        }, 100);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  crearGraficoMetricas(): void {
    const canvas = document.getElementById('metricasChart') as HTMLCanvasElement;

    if (!canvas) return;

    if (this.chartMetricas) {
      this.chartMetricas.destroy();
    }

    this.chartMetricas = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
        datasets: [
          {
            label: 'Porcentaje',
            data: [
              this.resumen.accuracy,
              this.resumen.precision,
              this.resumen.recall,
              this.resumen.f1_score
            ]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  crearGraficoIntent(): void {
    const canvas = document.getElementById('intentChart') as HTMLCanvasElement;

    if (!canvas) return;

    if (this.chartIntent) {
      this.chartIntent.destroy();
    }

    this.chartIntent = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.metricasPorIntent.map(item => item.intent),
        datasets: [
          {
            label: 'Accuracy por intención',
            data: this.metricasPorIntent.map(item => item.accuracy)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  evaluar(id: number, correcta: boolean, intencionCorrecta: string): void {
      this.adminService.evaluarMetrica(id, {
        respuesta_correcta: correcta,
        intencion_correcta: intencionCorrecta
      }).subscribe({
        next: () => {
          this.cargarMetricas();
          this.cargarResumen();
          this.cargarMetricasPorIntent();
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
}