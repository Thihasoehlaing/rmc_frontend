import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ManagedForm, ManagedFormPayload, FormsService } from './forms.service';

import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

type FormDialogMode = 'create' | 'edit';
type FormStatusFilter = '' | 'Active' | 'Inactive';

@Component({
  selector: 'app-forms-settings',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    DetailPanelSkeletonComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.scss',
})
export class FormsComponent implements OnInit {
  private readonly formsService = inject(FormsService);
  private readonly toastService = inject(ToastService);

  readonly forms = signal<ManagedForm[]>([]);
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<FormStatusFilter>('');
  readonly appliedSearch = signal('');
  readonly appliedStatus = signal<FormStatusFilter>('');

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<FormDialogMode | null>(null);
  readonly selectedForm = signal<ManagedForm | null>(null);
  readonly formCode = signal('');
  readonly formName = signal('');
  readonly formActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly formToDeactivate = signal<ManagedForm | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'code', label: 'Form Code', width: '150px' },
    { key: 'name', label: 'Form Name', width: '280px' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as ManagedForm).id;

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.formsService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.appliedSearch(),
        status: this.appliedStatus(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadForms();
            return;
          }

          this.forms.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.forms.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  search(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    this.appliedStatus.set(this.selectedStatus());
    this.page.set(1);
    this.loadForms();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadForms();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadForms();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadForms();
  }

  openCreateDialog(): void {
    this.selectedForm.set(null);
    this.formCode.set('');
    this.formName.set('');
    this.formActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(form: ManagedForm): void {
    this.openDetailDialog(form, 'edit');
  }

  retryDetail(): void {
    const form = this.selectedForm();
    const mode = this.dialogMode();
    if (!form || mode === null || mode === 'create') return;
    this.fetchDetail(form.id);
  }

  closeFormDialog(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedForm.set(null);
    this.detailFailed.set(false);
  }

  saveForm(): void {
    const mode = this.dialogMode();
    const code = this.formCode().trim().toUpperCase();
    const name = this.formName().trim();
    if ((mode !== 'create' && mode !== 'edit') || !code || !name || this.isSaving()) {
      return;
    }

    const payload: ManagedFormPayload = {
      form_code: code,
      form_name: name,
      is_active: this.formActive(),
    };
    const request =
      mode === 'create'
        ? this.formsService.create(payload)
        : this.formsService.update(this.selectedForm()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedForm.set(null);
        this.detailFailed.set(false);
        this.page.set(1);
        this.loadForms();
      },
    });
  }

  onFormCodeChange(value: string): void {
    this.formCode.set(value.toUpperCase());
  }

  openDeactivateDialog(form: ManagedForm): void {
    this.formToDeactivate.set(form);
  }

  closeDeactivateDialog(): void {
    if (this.isSaving()) return;
    this.formToDeactivate.set(null);
  }

  confirmDeactivate(): void {
    const form = this.formToDeactivate();
    if (!form || this.isSaving()) return;

    this.isSaving.set(true);
    this.formsService
      .deactivate(form.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.formToDeactivate.set(null);
          this.loadForms();
        },
      });
  }

  dialogTitle(): string {
    switch (this.dialogMode()) {
      case 'create':
        return 'Create Form';
      case 'edit':
        return 'Edit Form';
      default:
        return '';
    }
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.forms().length - 1, this.totalItems());
  }

  private openDetailDialog(form: ManagedForm, mode: 'edit'): void {
    this.selectedForm.set(form);
    this.dialogMode.set(mode);
    this.fetchDetail(form.id);
  }

  private fetchDetail(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.formsService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedForm.set(response.data);
          this.formCode.set(response.data.form_code);
          this.formName.set(response.data.form_name);
          this.formActive.set(response.data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
