import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { ComboboxComponent, ComboboxOption } from '../../../../shared/ui/combobox/combobox.component';

@Component({ selector: 'app-parts-catalog', standalone: true, imports: [CommonModule, FormsModule, CurrencyPipe, ComboboxComponent], templateUrl: './parts-catalog.component.html', styleUrl: '../admin-modules.css' })
export class PartsCatalogComponent implements OnInit, OnDestroy {
  search = ''; sort = 'name'; page = 1; pageSize = 10; loading = true; error = ''; items: any[] = [];
  readonly sortOptions: ComboboxOption[] = [
    { value: 'name', label: 'Nombre A–Z' },
    { value: 'price_asc', label: 'Menor precio' },
    { value: 'price_desc', label: 'Mayor precio' }
  ];
  summary = { total: 0, average_price: 0, highest_price: 0 }; pagination = { page: 1, limit: 10, total: 0, pages: 1 };
  private searchTimer?: ReturnType<typeof setTimeout>;
  constructor(private adminService: AdminService) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { if (this.searchTimer) clearTimeout(this.searchTimer); }
  onSearchChange(): void { if (this.searchTimer) clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300); }
  onFilterChange(): void { this.page = 1; this.load(); }
  changePage(next: number): void { if (next < 1 || next > this.pagination.pages || next === this.page) return; this.page = next; this.load(); }
  private load(): void {
    this.loading = true; this.error = '';
    this.adminService.getRepuestos({ search: this.search.trim(), sort: this.sort, page: this.page, limit: this.pageSize }).subscribe({
      next: data => { this.items = data.items || []; this.summary = data.summary || this.summary; this.pagination = data.pagination || this.pagination; this.loading = false; },
      error: () => { this.loading = false; this.error = 'No pudimos cargar los repuestos. Revisa la conexión e inténtalo nuevamente.'; }
    });
  }
}
