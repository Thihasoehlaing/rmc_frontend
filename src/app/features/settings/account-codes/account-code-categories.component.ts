import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  AccountCodeCategory,
  AccountCodeCategoryPayload,
  AccountCodesService,
  StatusFilter,
} from './account-codes.service';

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-account-code-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DetailPanelSkeletonComponent,
    DialogComponent,
    PaginationComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './account-code-categories.component.html',
  styleUrls: ['../forms/forms.component.scss', './account-codes.component.scss'],
})
export class AccountCodeCategoriesComponent implements OnInit {
  private readonly accountCodesService = inject(AccountCodesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly categories = signal<AccountCodeCategory[]>([]);
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<StatusFilter>('');
  readonly appliedSearch = signal('');
  readonly appliedStatus = signal<StatusFilter>('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedCategory = signal<AccountCodeCategory | null>(null);
  readonly categoryName = signal('');
  readonly categoryActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly categoryToDelete = signal<AccountCodeCategory | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'name', label: 'Category Name' },
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

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as AccountCodeCategory).id;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.accountCodesService
      .listCategories({
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
            this.loadCategories();
            return;
          }

          this.categories.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.categories.set([]);
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
    this.loadCategories();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadCategories();
  }

  openCreateDialog(): void {
    this.selectedCategory.set(null);
    this.categoryName.set('');
    this.categoryActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(category: AccountCodeCategory): void {
    this.selectedCategory.set(category);
    this.dialogMode.set('edit');
    this.fetchCategory(category.id);
  }

  retryDetail(): void {
    const category = this.selectedCategory();
    if (category) this.fetchCategory(category.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedCategory.set(null);
    this.detailFailed.set(false);
  }

  saveCategory(): void {
    const mode = this.dialogMode();
    const categoryName = this.categoryName().trim();
    if (!mode || !categoryName || this.isSaving()) return;

    const payload: AccountCodeCategoryPayload = {
      category_name: categoryName,
      is_active: this.categoryActive(),
    };
    const request =
      mode === 'create'
        ? this.accountCodesService.createCategory(payload)
        : this.accountCodesService.updateCategory(this.selectedCategory()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedCategory.set(null);
        this.page.set(1);
        this.loadCategories();
      },
    });
  }

  openDeleteDialog(category: AccountCodeCategory): void {
    this.categoryToDelete.set(category);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const category = this.categoryToDelete();
    if (!category || this.isSaving()) return;

    this.isSaving.set(true);
    this.accountCodesService
      .deleteCategory(category.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.categoryToDelete.set(null);
          this.loadCategories();
        },
      });
  }

  goToAccountCodes(): void {
    this.router.navigate(['/settings/account-codes']);
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadCategories();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadCategories();
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create'
      ? 'Create Account Code Category'
      : 'Edit Account Code Category';
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.categories().length - 1, this.totalItems());
  }

  private fetchCategory(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.accountCodesService
      .getCategory(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedCategory.set(response.data);
          this.categoryName.set(response.data.category_name);
          this.categoryActive.set(response.data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
