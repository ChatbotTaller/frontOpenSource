import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { AdminService } from '../../../../core/services/admin.service';
import { ComboboxComponent, ComboboxOption } from '../../../../shared/ui/combobox/combobox.component';

@Component({ selector: 'app-service-demand', standalone: true, imports: [CommonModule, FormsModule, ComboboxComponent], templateUrl: './service-demand.component.html', styleUrl: '../admin-modules.css' })
export class ServiceDemandComponent implements OnInit, OnDestroy {
  period = '30'; loading = true; error = ''; consulted: any[] = []; booked: any[] = [];
  readonly periodOptions: ComboboxOption[] = [
    { value: '30', label: 'Últimos 30 días' }, { value: '90', label: 'Últimos 90 días' },
    { value: '365', label: 'Último año' }, { value: 'all', label: 'Todo el historial' }
  ];
  summary = { service_catalog: 0, matched_consultations: 0, matched_appointments: 0 };
  methodology = ''; private charts: Chart[] = [];
  constructor(private adminService: AdminService) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroyCharts(); }
  load(): void {
    this.loading = true; this.error = '';
    this.adminService.getDemandaServicios(this.period).subscribe({
      next: data => { this.consulted = data.consulted || []; this.booked = data.booked || []; this.summary = data.summary || this.summary; this.methodology = data.methodology || ''; this.loading = false; setTimeout(() => this.renderCharts()); },
      error: () => { this.loading = false; this.error = 'No pudimos calcular la demanda de servicios. Inténtalo nuevamente.'; }
    });
  }
  private destroyCharts(): void { this.charts.forEach(chart => chart.destroy()); this.charts = []; }
  private renderCharts(): void { this.destroyCharts(); this.createChart('consultedServicesChart', this.consulted.slice(0, 8), '#60a5fa'); this.createChart('bookedServicesChart', this.booked.slice(0, 8), '#e0311e'); }
  private createChart(id: string, rows: any[], color: string): void {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null; if (!canvas || !rows.length) return;
    this.charts.push(new Chart(canvas, { type: 'bar', data: { labels: rows.map(row => row.name), datasets: [{ data: rows.map(row => row.total), backgroundColor: color, borderRadius: 7, barThickness: 20 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0, color: '#9f9b95' }, grid: { color: '#262626' } }, y: { ticks: { color: '#d9d5cf' }, grid: { display: false } } } } }));
  }
}
