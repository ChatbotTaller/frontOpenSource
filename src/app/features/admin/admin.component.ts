import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';

import * as XLSX from 'xlsx-js-style';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  citas: any[] = [];
  loading = true;

  chartCitas: any;
  chartVozTexto: any;
  filtroEstado = '';
  busqueda = '';

  currentDate = new Date();
  calendarDays: any[] = [];

    metricasVoz: any = {
    total_voz: 0,
    total_texto: 0,
    stt_exito_porcentaje: 0,
    tts_exito_porcentaje: 0,
    tiempo_promedio_voz_ms: 0
  };

  mesSeleccionado = this.currentDate.getMonth();
  anioSeleccionado = this.currentDate.getFullYear();

  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  anios = [2025, 2026, 2027, 2028, 2029, 2030];

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loadCitas();
    this.loadMetricasVoz();
  }

  loadCitas(): void {

    this.adminService.getCitas().subscribe({
      next: (data) => {
        this.citas = data;
        this.generarCalendario();
        this.loading = false;
        setTimeout(() => {
          this.crearGraficoCitas();
        }, 100);
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
      }
    });

  }

  crearGraficoCitas(): void {
    const canvas = document.getElementById('citasChart') as HTMLCanvasElement;

    if (!canvas) return;

    if (this.chartCitas) {
      this.chartCitas.destroy();
    }

    this.chartCitas = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Pendientes', 'Confirmadas', 'Completadas', 'Canceladas'],
        datasets: [
          {
            label: 'Citas',
            data: [
              this.citasPendientes,
              this.citasConfirmadas,
              this.citasCompletadas,
              this.citasCanceladas
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
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

    crearGraficoVozTexto(): void {
    const canvas = document.getElementById('vozTextoChart') as HTMLCanvasElement;

    if (!canvas) return;

    if (this.chartVozTexto) {
      this.chartVozTexto.destroy();
    }

    this.chartVozTexto = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Consultas por voz', 'Consultas por texto'],
        datasets: [
          {
            data: [
              this.metricasVoz.total_voz,
              this.metricasVoz.total_texto
            ]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  loadMetricasVoz(): void {
    this.adminService.getMetricasVoz().subscribe({
      next: (data) => {
        this.metricasVoz = data;

        setTimeout(() => {
          this.crearGraficoVozTexto();
        }, 100);
      },
      error: (error) => {
        console.error('Error cargando métricas de voz:', error);
      }
    });
  }

  cambiarEstado(id: number, estado: string): void {

  this.adminService.updateEstado(id, estado)
    .subscribe({

      next: () => {
        this.loadCitas();
      },

      error: (error) => {
        console.error(error);
      }

    });

}

  exportarCitasExcel(): void {
    const data = this.citasFiltradas.map((cita: any) => ({
      Cliente: cita.cliente_nombre,
      Telefono: cita.cliente_telefono,
      Vehiculo: cita.vehiculo_texto,
      Servicio: cita.motivo,
      Fecha: cita.fecha,
      Hora: cita.hora,
      Estado: cita.estado
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
      { wch: 25 },
      { wch: 16 },
      { wch: 28 },
      { wch: 45 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 }
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { Citas: worksheet },
      SheetNames: ['Citas']
    };

    XLSX.writeFile(workbook, 'citas_taller_reyes.xlsx');
  }

  generarCalendario() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    this.calendarDays = [];

    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const citasDelDia = this.citas.filter((c: any) => {
        const fechaCita = this.normalizarFecha(c.fecha);
        return fechaCita === fecha;
      });

      this.calendarDays.push({
        day,
        fecha,
        citas: citasDelDia
      });
    }
  }

  normalizarFecha(fecha: any): string {
    if (!fecha) return '';

    if (typeof fecha === 'string') {
      return fecha.slice(0, 10);
    }

    const d = new Date(fecha);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  mesAnterior() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);

    this.mesSeleccionado = this.currentDate.getMonth();
    this.anioSeleccionado = this.currentDate.getFullYear();

    this.generarCalendario();
  }

  mesSiguiente() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentDate = new Date(this.currentDate);

    this.mesSeleccionado = this.currentDate.getMonth();
    this.anioSeleccionado = this.currentDate.getFullYear();

    this.generarCalendario();
  }

  get nombreMesActual(): string {
    return this.currentDate.toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  }

  irAFechaCalendario() {
  this.currentDate = new Date(this.anioSeleccionado, this.mesSeleccionado, 1);
  this.generarCalendario();
}

logout(): void {
    localStorage.removeItem('admin_token');
    this.router.navigate(['/login']);
  }

  get totalCitas(): number {
    return this.citas.length;
  }

  get citasPendientes(): number {
    return this.citas.filter(c => c.estado === 'pendiente').length;
  }

  get citasConfirmadas(): number {
    return this.citas.filter(c => c.estado === 'confirmada').length;
  }

  get citasCanceladas(): number {
    return this.citas.filter(c => c.estado === 'cancelada').length;
  }

  get citasCompletadas(): number {
    return this.citas.filter(c => c.estado === 'completada').length;
  }

  get citasFiltradas() {

    return this.citas.filter((cita: any) => {

      const coincideBusqueda =
        cita.cliente_nombre
          ?.toLowerCase()
          .includes(this.busqueda.toLowerCase());

      const coincideEstado =
        this.filtroEstado === '' ||
        cita.estado === this.filtroEstado;

      return coincideBusqueda && coincideEstado;

    });

  }


}