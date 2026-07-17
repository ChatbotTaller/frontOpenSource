import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx-js-style';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './metricas.component.html',
  styleUrls: ['./metricas.component.css']
})
export class MetricasComponent implements OnInit {

  seccionActiva: 'dashboard' | 'registro' = 'dashboard';
  sidebarOculto = false;

  metricas: any[] = [];
  chartMetricas: any;
  metricasPorIntent: any[] = [];
  chartIntent: any;

  paginaActual = 1;
  itemsPorPagina = 5;
  opcionesItemsPorPagina = [5, 10, 20, 50];

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

  cambiarSeccion(seccion: 'dashboard' | 'registro'): void {
    this.seccionActiva = seccion;

    setTimeout(() => {
      if (seccion === 'dashboard') {
        this.crearGraficoMetricas();
        this.crearGraficoIntent();
      }
    }, 150);
  }

  toggleSidebar(): void {
    this.sidebarOculto = !this.sidebarOculto;
  }

  get tituloSeccionActual(): string {
    switch (this.seccionActiva) {
      case 'dashboard':
        return 'Dashboard IA';
      case 'registro':
        return 'Registro de interacciones';
      default:
        return 'Métricas IA';
    }
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
          if (this.seccionActiva === 'dashboard') {
            this.crearGraficoMetricas();
          }
        }, 150);
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
          if (this.seccionActiva === 'dashboard') {
            this.crearGraficoIntent();
          }
        }, 150);
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
            ],
            backgroundColor: [
              'rgba(96, 165, 250, 0.75)',
              'rgba(34, 197, 94, 0.75)',
              'rgba(251, 191, 36, 0.75)',
              'rgba(248, 113, 113, 0.75)'
            ],
            borderColor: [
              'rgba(96, 165, 250, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 191, 36, 1)',
              'rgba(248, 113, 113, 1)'
            ],
            borderWidth: 1,
            borderRadius: 8
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

    const colores = [
      'rgba(96, 165, 250, 0.75)',
      'rgba(34, 197, 94, 0.75)',
      'rgba(251, 191, 36, 0.75)',
      'rgba(248, 113, 113, 0.75)',
      'rgba(168, 85, 247, 0.75)',
      'rgba(20, 184, 166, 0.75)',
      'rgba(249, 115, 22, 0.75)'
    ];

    const bordes = [
      'rgba(96, 165, 250, 1)',
      'rgba(34, 197, 94, 1)',
      'rgba(251, 191, 36, 1)',
      'rgba(248, 113, 113, 1)',
      'rgba(168, 85, 247, 1)',
      'rgba(20, 184, 166, 1)',
      'rgba(249, 115, 22, 1)'
    ];

    this.chartIntent = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.metricasPorIntent.map(item => item.intent),
        datasets: [
          {
            label: 'Accuracy por intención',
            data: this.metricasPorIntent.map(item => item.accuracy),
            backgroundColor: this.metricasPorIntent.map((_, index) => colores[index % colores.length]),
            borderColor: this.metricasPorIntent.map((_, index) => bordes[index % bordes.length]),
            borderWidth: 1,
            borderRadius: 8
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

  get totalPaginas(): number {
    return Math.ceil(this.metricas.length / this.itemsPorPagina) || 1;
  }

  get metricasPaginadas(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;

    return this.metricas.slice(inicio, fin);
  }

  get rangoInicio(): number {
    if (this.metricas.length === 0) {
      return 0;
    }

    return (this.paginaActual - 1) * this.itemsPorPagina + 1;
  }

  get rangoFin(): number {
    const fin = this.paginaActual * this.itemsPorPagina;
    return fin > this.metricas.length ? this.metricas.length : fin;
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaActual = pagina;
  }

  cambiarItemsPorPagina(): void {
    this.paginaActual = 1;
  }

  exportarExcel(): void {
    const data = this.metricas.map((m: any) => ({
      Pregunta: m.pregunta,
      Respuesta: m.respuesta,
      Intent_Detectado: m.intencion_detectada,
      Intent_Correcto: m.intencion_correcta,
      Respuesta_Correcta: m.respuesta_correcta === 1 ? 'Correcta' : 'Incorrecta',
      Tiempo_ms: m.tiempo_respuesta_ms,
      Fecha: m.fecha
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:G1');

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (!cell) continue;

        cell.s = {
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };

        if (row === 0) {
          cell.s = {
            ...cell.s,
            font: {
              bold: true,
              color: { rgb: 'FFFFFF' }
            },
            fill: {
              fgColor: { rgb: 'C0392B' }
            }
          };
        }
      }
    }

    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 55 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 22 }
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { Metricas: worksheet },
      SheetNames: ['Metricas']
    };

    XLSX.writeFile(workbook, 'metricas_chatbot.xlsx');
  }
}