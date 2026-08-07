import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import {
  AddOptionModalComponent,
  AddOptionPayload,
} from '../../../shared/components/add-option-modal/add-option-modal.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  FinanceOptionRow,
  FormOption,
  SharedDropdownOptionsService,
} from '../../admin-settings/dropdowns/shared/shared-dropdown-options.service';

type StatusFilter = 'all' | 'active' | 'inactive';
type VoteNumberStatus = 'Active' | 'Inactive';

interface VoteNumberRow extends FinanceOptionRow {
  formNames: string[];
  statusLabel: VoteNumberStatus;
}

@Component({
  selector: 'app-vote-numbers',
  standalone: true,
  imports: [
    AddOptionModalComponent,
    CommonModule,
    DataTableComponent,
    FormsModule,
    PaginationComponent,
    SearchableDropdownComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './vote-numbers.component.html',
  styleUrls: ['../forms/forms.component.scss', './vote-numbers.component.scss'],
})
export class VoteNumbersComponent implements OnInit {
  private readonly service = inject(SharedDropdownOptionsService);
  private readonly toast = inject(ToastService);

  readonly voteNumbers = signal<VoteNumberRow[]>([]);
  readonly forms = signal<FormOption[]>([]);
  readonly selectedFormCode = signal<string | null>(null);
  readonly codeFilter = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly appliedFormCode = signal<string | null>(null);
  readonly appliedCode = signal('');
  readonly appliedStatus = signal<StatusFilter>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly optionsLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly showEditor = signal(false);
  readonly editingRow = signal<VoteNumberRow | null>(null);
  readonly isSaving = signal(false);

  readonly formOptions = computed<DropdownOption<string>[]>(() =>
    this.forms().map((form) => ({
      value: form.form_code,
      label: form.form_name,
      description: form.form_code,
      searchText: `${form.form_name} ${form.form_code}`,
    })),
  );

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'form', label: 'Form', width: '280px' },
    { key: 'code', label: 'code', width: '180px', align: 'center', headerAlign: 'center' },
    { key: 'status', label: 'status', width: '140px', align: 'center', headerAlign: 'center' },
    { key: 'actions', label: 'actions', width: '120px', align: 'center', headerAlign: 'center' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) => (row as VoteNumberRow).id;

  ngOnInit(): void {
    this.loadForms();
    this.loadVoteNumbers();
  }

  loadForms(): void {
    this.optionsLoading.set(true);
    this.service
      .listForms()
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.forms.set(response.data ?? []);
          this.voteNumbers.update((rows) => rows.map((row) => this.toViewRow(row)));
        },
        error: () => this.forms.set([]),
      });
  }

  loadVoteNumbers(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.service
      .listVoteNumbers({
        page: this.page(),
        per_page: this.pageSize(),
        form_code: this.appliedFormCode() ?? '',
        code: this.appliedCode(),
        status: this.appliedStatus(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadVoteNumbers();
            return;
          }

          this.voteNumbers.set((response.data.items ?? []).map((row) => this.toViewRow(row)));
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
        },
        error: () => {
          this.voteNumbers.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  search(): void {
    this.appliedFormCode.set(this.selectedFormCode());
    this.appliedCode.set(this.codeFilter().trim());
    this.appliedStatus.set(this.statusFilter());
    this.page.set(1);
    this.loadVoteNumbers();
  }

  resetFilters(): void {
    this.selectedFormCode.set(null);
    this.codeFilter.set('');
    this.statusFilter.set('all');
    this.appliedFormCode.set(null);
    this.appliedCode.set('');
    this.appliedStatus.set('all');
    this.page.set(1);
    this.loadVoteNumbers();
  }

  openEditDialog(row: VoteNumberRow): void {
    this.editingRow.set(row);
    this.showEditor.set(true);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.showEditor.set(false);
    this.editingRow.set(null);
  }

  modalInitial(): AddOptionPayload | null {
    const row = this.editingRow();
    if (!row) return null;

    return {
      code: row.code,
      name: row.description ?? '',
      status: row.statusLabel,
      appliesTo: row.form_codes ?? [],
    };
  }

  saveModal(payload: AddOptionPayload): void {
    const row = this.editingRow();
    if (!row || this.isSaving()) return;

    this.isSaving.set(true);
    this.service
      .updateVoteNumber(row.id, {
        code: payload.code?.trim() ?? '',
        description: payload.name.trim(),
        is_active: payload.status === 'Active',
        form_codes: payload.appliesTo,
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success === false) {
            this.toast.error(response.message || 'Dropdown option save failed.');
            return;
          }

          this.toast.success('Dropdown option updated.');
          this.closeEditor();
          this.loadVoteNumbers();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Dropdown option save failed.'),
      });
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadVoteNumbers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadVoteNumbers();
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  formSummary(row: VoteNumberRow): string {
    return row.formNames.length ? row.formNames.join(', ') : '-';
  }

  private toViewRow(row: FinanceOptionRow): VoteNumberRow {
    const formNameByCode = new Map(this.forms().map((form) => [form.form_code, form.form_name]));
    const formCodes = row.form_codes ?? [];
    return {
      ...row,
      formNames: formCodes.map((code) => formNameByCode.get(code) ?? code),
      statusLabel: row.is_active ? 'Active' : 'Inactive',
    };
  }
}
