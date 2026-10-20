import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { AdminService } from '../../../../core/services/admin.service';
import { ComboboxComponent, ComboboxOption } from '../../../../shared/ui/combobox/combobox.component';

@Component({
  selector: 'app-client-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboboxComponent],
  templateUrl: './client-activity.component.html',
  styleUrl: '../admin-modules.css'
})
export class ClientActivityComponent implements OnInit, OnDestroy {
  activeTab: 'summary' | 'ranking' | 'detail' = 'summary';
  period = '30';
  status = '';
  search = '';
  page = 1;
  pageSize = 10;
  loading = true;
  error = '';
  items: any[] = [];
  summary = { total_clients: 0, total_appointments: 0, repeat_clients: 0 };
  pagination = { page: 1, limit: 10, total: 0, pages: 1 };
  readonly periodOptions: ComboboxOption[] = [
    { value: '30', label: 'Últimos 30 días' },
    { value: '90', label: 'Últimos 90 días' },
    { value: '365', label: 'Último año' },
    { value: 'all', label: 'Todo el historial' }
  ];
  readonly statusOptions: ComboboxOption[] = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];
  private chart?: Chart;
  private chartRows: Array<{ name: string; total: number }> = [];
  private searchTimer?: ReturnType<typeof setTimeout>;

  get rankingChartHeight(): number {
    return Math.max(220, this.chartRows.length * 54);
  }

  constructor(private adminService: AdminService) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.chart?.destroy();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onFilterChange(): void { this.page = 1; this.load(); }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
  }

  changePage(next: number): void {
    if (next < 1 || next > this.pagination.pages || next === this.page) return;
    this.page = next;
    this.load();
  }

  setTab(tab: 'summary' | 'ranking' | 'detail'): void {
    this.activeTab = tab;
    if (tab === 'ranking') {
      setTimeout(() => this.renderChart(this.chartRows));
    }
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getClientesConCitas({
      period: this.period,
      status: this.status,
      search: this.search.trim(),
      page: this.page,
      limit: this.pageSize
    }).subscribe({
      next: data => {
        this.items = data.items || [];
        this.summary = data.summary || this.summary;
        this.pagination = data.pagination || this.pagination;
        this.chartRows = data.chart || [];
        this.loading = false;
        if (this.activeTab === 'ranking') {
          setTimeout(() => this.renderChart(this.chartRows));
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'No pudimos cargar la actividad. Revisa la conexión e inténtalo nuevamente.';
      }
    });
  }

  private renderChart(rows: Array<{ name: string; total: number }>): void {
    const canvas = document.getElementById('clientActivityChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map(row => row.name),
        datasets: [{
          label: 'Citas', data: rows.map(row => row.total), backgroundColor: '#e0311e',
          hoverBackgroundColor: '#ff5544', borderRadius: 7, barThickness: 16
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, color: '#9f9b95' }, grid: { color: '#262626' } },
          y: { ticks: { color: '#d9d5cf' }, grid: { display: false } }
        }
      }
    });
  }
}
