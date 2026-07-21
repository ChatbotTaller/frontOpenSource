import { Component, HostListener, OnInit } from '@angular/core';
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

  seccionActiva: 'resumen' | 'citas' | 'calendario' | 'voz' = 'resumen';

  sidebarColapsado = window.innerWidth <= 900;

  private vistaMovil = window.innerWidth <= 900;

  citas: any[] = [];
  loading = true;

  chartCitas: any;
  chartVozTexto: any;
  filtroEstado = '';
  busqueda = '';

  paginaActual = 1;
  itemsPorPagina = 5;

  opcionesItemsPorPagina = [5, 10, 20, 50];

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

  cambiarSeccion(
    seccion: 'resumen' | 'citas' | 'calendario' | 'voz'
  ): void {
    this.seccionActiva = seccion;

    if (window.innerWidth <= 900) {
      this.sidebarColapsado = true;
    }

    setTimeout(() => {
      if (seccion === 'resumen') {
        this.crearGraficoCitas();
      }

      if (seccion === 'voz') {
        this.crearGraficoVozTexto();
      }
    }, 150);
  }

  loadCitas(): void {
    this.adminService.getCitas().subscribe({
      next: (data) => {
        this.citas = data;
        this.generarCalendario();
        this.loading = false;

        setTimeout(() => {
          if (this.seccionActiva === 'resumen') {
            this.crearGraficoCitas();
          }
        }, 150);
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    const ahoraEsMovil = window.innerWidth <= 900;

    if (ahoraEsMovil !== this.vistaMovil) {
      this.vistaMovil = ahoraEsMovil;
      this.sidebarColapsado = ahoraEsMovil;
    }
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
            ],
            backgroundColor: [
              'rgba(251, 191, 36, 0.75)',
              'rgba(52, 211, 153, 0.75)',  
              'rgba(34, 197, 94, 0.75)',   
              'rgba(248, 113, 113, 0.75)'  
            ],
            borderColor: [
              'rgba(251, 191, 36, 1)',
              'rgba(52, 211, 153, 1)',
              'rgba(34, 197, 94, 1)',
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
          if (this.seccionActiva === 'voz') {
            this.crearGraficoVozTexto();
          }
        }, 150);
      },
      error: (error) => {
        console.error('Error cargando métricas de voz:', error);
      }
    });
  }

  cambiarEstado(id: number, estado: string): void {
    this.adminService.updateEstado(id, estado).subscribe({
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

  generarCalendario(): void {
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

  mesAnterior(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);

    this.mesSeleccionado = this.currentDate.getMonth();
    this.anioSeleccionado = this.currentDate.getFullYear();

    this.generarCalendario();
  }

  mesSiguiente(): void {
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

  irAFechaCalendario(): void {
    this.currentDate = new Date(this.anioSeleccionado, this.mesSeleccionado, 1);
    this.generarCalendario();
  }

  toggleSidebar(): void {
    this.sidebarColapsado = !this.sidebarColapsado;
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

  get citasFiltradas(): any[] {
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

  get tituloSeccionActual(): string {
    switch (this.seccionActiva) {
      case 'resumen':
        return 'Resumen general';
      case 'citas':
        return 'Gestión de citas';
      case 'calendario':
        return 'Calendario de citas';
      case 'voz':
        return 'Métricas de voz';
      default:
        return 'Panel Admin';
    }
  }

  get totalPaginas(): number {
    return Math.ceil(this.citasFiltradas.length / this.itemsPorPagina) || 1;
  }

  get citasPaginadas(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;

    return this.citasFiltradas.slice(inicio, fin);
  }

  get rangoInicio(): number {
    if (this.citasFiltradas.length === 0) {
      return 0;
    }

    return (this.paginaActual - 1) * this.itemsPorPagina + 1;
  }

  get rangoFin(): number {
    const fin = this.paginaActual * this.itemsPorPagina;
    return fin > this.citasFiltradas.length ? this.citasFiltradas.length : fin;
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

  reiniciarPaginacion(): void {
    this.paginaActual = 1;
  }
}