import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { FormCacheService } from '../../../core/services/form-cache.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  AccountCode,
  AccountCodeCategory,
  AccountCodePayload,
  AccountCodesService,
  LocationType,
  StatusFilter,
} from './account-codes.service';

type DialogMode = 'create' | 'edit';
type LocationFilter = '' | LocationType;

@Component({
  selector: 'app-account-codes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DetailPanelSkeletonComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './account-codes.component.html',
  styleUrls: ['../forms/forms.component.scss', './account-codes.component.scss'],
})
export class AccountCodesComponent implements OnInit {
  private readonly accountCodesService = inject(AccountCodesService);
  private readonly formCache = inject(FormCacheService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly accountCodes = signal<AccountCode[]>([]);
  readonly categoryOptionsData = signal<AccountCodeCategory[]>([]);
  readonly formOptionsData = signal<{ id: number; form_code: string; form_name: string }[]>([]);
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedLocationType = signal<LocationFilter>('');
  readonly selectedStatus = signal<StatusFilter>('');
  readonly selectedFormCode = signal<string | null>(null);
  readonly appliedSearch = signal('');
  readonly appliedCategoryId = signal<number | null>(null);
  readonly appliedLocationType = signal<LocationFilter>('');
  readonly appliedStatus = signal<StatusFilter>('');
  readonly appliedFormCode = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly optionsLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedAccountCode = signal<AccountCode | null>(null);
  readonly categoryId = signal<number | null>(null);
  readonly code = signal('');
  readonly description = signal('');
  readonly locationType = signal<LocationType>('BASE');
  readonly formCodes = signal<string[]>([]);
  readonly accountCodeActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly accountCodeToDelete = signal<AccountCode | null>(null);

  readonly categoryOptions = computed<DropdownOption<number>[]>(() =>
    this.categoryOptionsData().map((category) => ({
      value: category.id,
      label: category.category_name,
      description: category.is_active ? 'Active' : 'Inactive',
      disabled: !category.is_active,
    })),
  );

  readonly formOptions = computed<DropdownOption<string>[]>(() =>
    this.formOptionsData().map((form) => ({
      value: form.form_code,
      label: form.form_name,
      description: form.form_code,
      searchText: `${form.form_name} ${form.form_code}`,
    })),
  );

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'code', label: 'Account Code', width: '170px' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', width: '220px' },
    { key: 'location', label: 'Location', width: '130px', align: 'center' },
    { key: 'forms', label: 'Forms', width: '180px' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
    { key: 'updatedAt', label: 'Last Updated', width: '210px' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) => (row as AccountCode).id;

  ngOnInit(): void {
    this.loadOptions();
    this.loadAccountCodes();
  }

  loadOptions(): void {
    this.optionsLoading.set(true);
    forkJoin({
      categories: this.accountCodesService.listCategories({
        page: 1,
        perPage: 100,
        status: 'Active',
      }),
      forms: this.formCache.getForms(),
    })
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: ({ categories, forms }) => {
          this.categoryOptionsData.set(categories.data.items);
          this.formOptionsData.set((forms.data ?? []).filter((form) => form.is_active));
        },
        error: () => {
          this.categoryOptionsData.set([]);
          this.formOptionsData.set([]);
        },
      });
  }

  loadAccountCodes(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.accountCodesService
      .listCodes({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.appliedSearch(),
        status: this.appliedStatus(),
        accountCodeCategoryId: this.appliedCategoryId(),
        locationType: this.appliedLocationType(),
        formCode: this.appliedFormCode() ?? '',
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadAccountCodes();
            return;
          }

          this.accountCodes.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.accountCodes.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  search(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    this.appliedCategoryId.set(this.selectedCategoryId());
    this.appliedLocationType.set(this.selectedLocationType());
    this.appliedStatus.set(this.selectedStatus());
    this.appliedFormCode.set(this.selectedFormCode());
    this.page.set(1);
    this.loadAccountCodes();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategoryId.set(null);
    this.selectedLocationType.set('');
    this.selectedStatus.set('');
    this.selectedFormCode.set(null);
    this.appliedSearch.set('');
    this.appliedCategoryId.set(null);
    this.appliedLocationType.set('');
    this.appliedStatus.set('');
    this.appliedFormCode.set(null);
    this.page.set(1);
    this.loadAccountCodes();
  }

  openCreateDialog(): void {
    this.selectedAccountCode.set(null);
    this.categoryId.set(null);
    this.code.set('');
    this.description.set('');
    this.locationType.set('BASE');
    this.formCodes.set([]);
    this.accountCodeActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(accountCode: AccountCode): void {
    this.selectedAccountCode.set(accountCode);
    this.dialogMode.set('edit');
    this.fetchAccountCode(accountCode.id);
  }

  retryDetail(): void {
    const accountCode = this.selectedAccountCode();
    if (accountCode) this.fetchAccountCode(accountCode.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedAccountCode.set(null);
    this.detailFailed.set(false);
  }

  saveAccountCode(): void {
    const mode = this.dialogMode();
    const categoryId = this.categoryId();
    const code = this.code().trim();
    const description = this.description().trim();
    if (!mode || !categoryId || !code || !description || this.isSaving()) return;

    const payload: AccountCodePayload = {
      account_code_category_id: categoryId,
      code,
      description,
      location_type: this.locationType(),
      is_active: this.accountCodeActive(),
      form_codes: this.formCodes(),
    };
    const request =
      mode === 'create'
        ? this.accountCodesService.createCode(payload)
        : this.accountCodesService.updateCode(this.selectedAccountCode()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedAccountCode.set(null);
        this.page.set(1);
        this.loadAccountCodes();
      },
    });
  }

  openDeleteDialog(accountCode: AccountCode): void {
    this.accountCodeToDelete.set(accountCode);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.accountCodeToDelete.set(null);
  }

  confirmDelete(): void {
    const accountCode = this.accountCodeToDelete();
    if (!accountCode || this.isSaving()) return;

    this.isSaving.set(true);
    this.accountCodesService
      .deleteCode(accountCode.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.accountCodeToDelete.set(null);
          this.loadAccountCodes();
        },
      });
  }

  goToCategories(): void {
    this.router.navigate(['/settings/account-code-categories']);
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadAccountCodes();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadAccountCodes();
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Create Account Code' : 'Edit Account Code';
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.accountCodes().length - 1, this.totalItems());
  }

  formSummary(formCodes: string[]): string {
    if (!formCodes?.length) return '-';
    return formCodes.join(', ');
  }

  private fetchAccountCode(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.accountCodesService
      .getCode(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (response) => {
          const data = response.data;
          this.selectedAccountCode.set(data);
          this.categoryId.set(data.account_code_category_id);
          this.code.set(data.code);
          this.description.set(data.description);
          this.locationType.set(data.location_type);
          this.formCodes.set(data.form_codes ?? []);
          this.accountCodeActive.set(data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
