import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { CountryApi, CountryService } from './country.service';
import { CatalogStatus } from './catalog-api.types';

@Component({
  selector: 'app-manage-country',
  standalone: true,
  imports: [FormsModule, AdminSettingsPageHeaderComponent, PaginationComponent, SubmissionsSearchComponent],
  styleUrls: ['../dropdowns/shared/form-dropdown-options-manager.component.scss', './catalog-manager.component.scss'],
  template: `
    <section class="dropdowns-container">
      <div class="dropdowns-shell">
        <div class="details-view settings-container fade-in">
          <app-admin-settings-page-header title="Countries" description="View centrally managed country reference data."></app-admin-settings-page-header>
          <div class="dropdown-options-panel">
            <div class="dropdown-search-panel">
              <app-submissions-search placeholder="Search country name or code" [value]="search()" (search)="onSearch($event)" (refresh)="reset()">
                <label search-filters class="mgr-status-filter">
                  <span class="sr-only">Status</span>
                  <select class="input--select" [ngModel]="status()" (ngModelChange)="onStatus($event)" aria-label="Filter by status">
                    <option value="all">All</option><option value="active">Active / Not specified</option><option value="inactive">Inactive</option>
                  </select>
                </label>
              </app-submissions-search>
            </div>
            <div class="dropdown-table-panel">
              <div class="shared-options-table">
                <table>
                  <thead><tr><th>No.</th><th>Country Code</th><th>Country Name</th><th>Region</th><th>Status</th></tr></thead>
                  <tbody>
                    @if (failed()) {
                      <tr><td colspan="5" class="catalog-empty-state"><strong>Unable to load countries</strong><button class="btn btn-primary" type="button" (click)="load()">Try Again</button></td></tr>
                    } @else {
                      @for (row of rows(); track row.id; let index = $index) {
                        <tr><td>{{ (page() - 1) * pageSize() + index + 1 }}</td><td>{{ row.code || '-' }}</td><td>{{ row.name }}</td><td>{{ row.region || '-' }}</td><td>{{ row.source_status === '1' ? 'Active' : row.source_status === '0' ? 'Inactive' : 'Not specified' }}</td></tr>
                      } @empty {
                        <tr><td colspan="5" class="catalog-empty-state">{{ loading() ? 'Loading countries' : 'No countries found' }}</td></tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="dropdown-pagination-panel">
              <app-pagination [currentPage]="page()" [totalPages]="totalPages()" [pageSize]="pageSize()" [pageSizeOptions]="[10, 15, 30, 50]" [totalItems]="totalItems()" [itemCount]="rows().length" itemLabel="countries" (pageChange)="onPage($event)" (pageSizeChange)="onPageSize($event)"></app-pagination>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ManageCountryComponent implements OnInit {
  private readonly countries = inject(CountryService);
  readonly rows = signal<CountryApi[]>([]);
  readonly search = signal('');
  readonly status = signal<CatalogStatus>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  ngOnInit(): void { this.load(); }
  onSearch(value: string): void { this.search.set(value); this.page.set(1); this.load(); }
  onStatus(value: CatalogStatus): void { this.status.set(value); this.page.set(1); this.load(); }
  onPage(value: number): void { this.page.set(value); this.load(); }
  onPageSize(value: number): void { this.pageSize.set(value); this.page.set(1); this.load(); }
  reset(): void { this.search.set(''); this.status.set('all'); this.page.set(1); this.load(); }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.countries.list({page: this.page(), perPage: this.pageSize(), status: this.status(), search: this.search()}).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success) { this.failed.set(true); return; }
        this.rows.set(response.data.items);
        this.totalItems.set(response.data.pagination.total_items);
        this.totalPages.set(Math.max(1, response.data.pagination.total_pages));
      },
      error: () => { this.loading.set(false); this.failed.set(true); this.rows.set([]); },
    });
  }
}
