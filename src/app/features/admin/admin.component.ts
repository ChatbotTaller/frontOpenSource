import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';

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
  filtroEstado = '';
  busqueda = '';

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loadCitas();
  }

  loadCitas(): void {

    this.adminService.getCitas().subscribe({
      next: (data) => {
        this.citas = data;
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