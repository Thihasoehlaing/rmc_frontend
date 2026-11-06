import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import {
  SearchToolbarComponent,
  SettingsPanelComponent,
  StateComponent,
} from '../../../shared/components/settings-ui/settings-ui.components';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../shared/components/data-table/data-table.component';
import { DropdownComponent } from '../../../shared/components/dropdown/dropdown.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { StatusBadgeComponent } from '../../../shared/components/form-standard/form-standard.components';
import { CountryApi, CountryService } from './country.service';
import { CatalogStatus } from './catalog-api.types';

@Component({
  selector: 'app-manage-country',
  standalone: true,
  imports: [
    FormsModule,
    AdminSettingsPageHeaderComponent,
    PaginationComponent,
    SearchToolbarComponent,
    SettingsPanelComponent,
    StateComponent,
    DataTableComponent,
    DropdownComponent,
    ActionButtonComponent,
    StatusBadgeComponent,
  ],
  styleUrls: ['./catalog-manager.component.scss'],
  template: `<main class="settings-page">
    <app-admin-settings-page-header
      title="Countries"
      description="View centrally managed country reference data."
    />
    <app-search-toolbar
      placeholder="Search country name or code"
      [query]="search()"
      (queryChange)="search.set($event)"
      (search)="onSearch(search())"
      (reset)="reset()"
    >
      <div class="settings-filter">
        <app-dropdown
          label="Status"
          [options]="[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active / Not specified' },
            { value: 'inactive', label: 'Inactive' },
          ]"
          [ngModel]="status()"
          (ngModelChange)="onStatus($event)"
        />
      </div>
    </app-search-toolbar>
    <app-settings-panel title="Countries" [count]="totalItems()" [flush]="true">
      @if (failed()) {
        <app-state title="Unable to load countries" [error]="true"
          ><app-action-button label="Try Again" (clicked)="load()"
        /></app-state>
      } @else {
        <app-data-table [dense]="true" [embedded]="true" [columns]="columns" [rows]="rows()"
          ><ng-template #rowTemplate let-row let-index="index"
            ><tr>
              <td>{{ (page() - 1) * pageSize() + index + 1 }}</td>
              <td>{{ row.code || '-' }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.region || '-' }}</td>
              <td>
                <app-status-badge [intent]="row.source_status === '0' ? 'warning' : 'info'">{{
                  row.source_status === '1'
                    ? 'Active'
                    : row.source_status === '0'
                      ? 'Inactive'
                      : 'Not specified'
                }}</app-status-badge>
              </td>
            </tr></ng-template
          ><ng-template #emptyTemplate
            ><app-state
              [title]="loading() ? 'Loading countries' : 'No countries found'" /></ng-template
        ></app-data-table>
      }
      <div panelFooter>
        <app-pagination
          [currentPage]="page()"
          [totalPages]="totalPages()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 15, 30, 50]"
          [totalItems]="totalItems()"
          [itemCount]="rows().length"
          itemLabel="countries"
          (pageChange)="onPage($event)"
          (pageSizeChange)="onPageSize($event)"
        />
      </div>
    </app-settings-panel>
  </main>`,
})
export class ManageCountryComponent implements OnInit {
  readonly columns: DataTableColumn[] = [
    { key: 'number', label: 'No.' },
    { key: 'code', label: 'Country Code' },
    { key: 'name', label: 'Country Name' },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status' },
  ];
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

  ngOnInit(): void {
    this.load();
  }
  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }
  onStatus(value: CatalogStatus): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }
  onPage(value: number): void {
    this.page.set(value);
    this.load();
  }
  onPageSize(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
    this.load();
  }
  reset(): void {
    this.search.set('');
    this.status.set('all');
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.countries
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.status(),
        search: this.search(),
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (!response.success) {
            this.failed.set(true);
            return;
          }
          this.rows.set(response.data.items);
          this.totalItems.set(response.data.pagination.total_items);
          this.totalPages.set(Math.max(1, response.data.pagination.total_pages));
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
          this.rows.set([]);
        },
      });
  }
}
