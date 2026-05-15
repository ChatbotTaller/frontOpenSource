import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { RouterModule } from '@angular/router';

import Chart from 'chart.js/auto';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './metricas.component.html',
  styleUrls: ['./metricas.component.css']
})
export class MetricasComponent implements OnInit {

  metricas: any[] = [];
  chartMetricas: any;

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
  }

  cargarMetricas(): void {
    this.adminService.getMetricas().subscribe({
      next: (data) => {
        this.metricas = data;
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

  evaluar(id: number, correcta: boolean): void {
    this.adminService.evaluarMetrica(id, {
      respuesta_correcta: correcta
    }).subscribe({
      next: () => {
        this.cargarMetricas();
        this.cargarResumen();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
}