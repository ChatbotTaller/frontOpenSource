import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  citas: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadCitas();
  }

  loadCitas(): void {

    this.adminService.getCitas().subscribe({
      next: (data) => {
        this.citas = data;
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
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


}