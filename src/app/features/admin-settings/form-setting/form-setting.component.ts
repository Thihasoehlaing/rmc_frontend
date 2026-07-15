import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { FormSettingItem, FormSettingService } from './form-setting.service';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-form-setting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './form-setting.component.html',
  styleUrl: './form-setting.component.scss',
})
export class FormSettingComponent implements OnInit {
  private readonly formSettingService = inject(FormSettingService);

  readonly forms = signal<FormSettingItem[]>([]);
  readonly searchDraft = signal('');
  readonly statusDraft = signal<StatusFilter>('all');
  readonly appliedSearch = signal('');
  readonly appliedStatus = signal<StatusFilter>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly loading = signal(true);
  readonly loadFailed = signal(false);

  readonly filteredForms = computed(() => {
    const search = this.appliedSearch().toLocaleLowerCase();
    const status = this.appliedStatus();

    return this.forms()
      .filter((form) => {
        if (status === 'all') return true;
        return status === 'active' ? form.is_active : !form.is_active;
      })
      .filter((form) =>
        search ? `${form.form_code} ${form.form_name}`.toLocaleLowerCase().includes(search) : true,
      );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredForms().length / this.pageSize())),
  );

  readonly pagedForms = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredForms().slice(start, start + this.pageSize());
  });

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px' },
    { key: 'form_name', label: 'Form Name' },
    { key: 'status', label: 'Status', width: '140px' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) => (row as FormSettingItem).id;

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    this.formSettingService
      .listAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.forms.set(response.data ?? []);
          this.ensureValidPage();
        },
        error: () => {
          this.forms.set([]);
          this.loadFailed.set(true);
        },
      });
  }

  applyFilters(): void {
    this.appliedSearch.set(this.searchDraft().trim());
    this.appliedStatus.set(this.statusDraft());
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchDraft.set('');
    this.statusDraft.set('all');
    this.appliedSearch.set('');
    this.appliedStatus.set('all');
    this.page.set(1);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  private ensureValidPage(): void {
    this.page.set(Math.min(this.page(), this.totalPages()));
  }
}
