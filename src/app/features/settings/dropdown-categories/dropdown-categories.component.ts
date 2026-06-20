import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  TrackByFunction,
  inject,
  signal,
} from '@angular/core';
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
import {
  DropdownCategory,
  DropdownCategoryPayload,
  DropdownCategoriesService,
} from './dropdown-categories.service';

type DialogMode = 'create' | 'edit';
type StatusFilter = '' | 'Active' | 'Inactive';

@Component({
  selector: 'app-dropdown-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    DetailPanelSkeletonComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './dropdown-categories.component.html',
  styleUrls: [
    '../forms/forms.component.scss',
    './dropdown-categories.component.scss',
  ],
})
export class DropdownCategoriesComponent implements OnInit {
  private readonly categoriesService = inject(DropdownCategoriesService);
  private readonly toastService = inject(ToastService);

  readonly categories = signal<DropdownCategory[]>([]);
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
  readonly selectedCategory = signal<DropdownCategory | null>(null);
  readonly categoryCode = signal('');
  readonly categoryName = signal('');
  readonly categoryActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly categoryToDelete = signal<DropdownCategory | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'code', label: 'Category Code', width: '190px' },
    { key: 'name', label: 'Category Name', width: '320px' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (
    _index: number,
    row: unknown,
  ) => (row as DropdownCategory).id;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.categoriesService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.appliedSearch(),
        status: this.appliedStatus(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
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

  openCreateDialog(): void {
    this.selectedCategory.set(null);
    this.categoryCode.set('');
    this.categoryName.set('');
    this.categoryActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(category: DropdownCategory): void {
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
    const code = this.categoryCode().trim().toUpperCase();
    const name = this.categoryName().trim();
    if (!mode || !code || !name || this.isSaving()) return;

    const payload: DropdownCategoryPayload = {
      category_code: code,
      category_name: name,
      is_active: this.categoryActive(),
    };
    const request =
      mode === 'create'
        ? this.categoriesService.create(payload)
        : this.categoriesService.update(this.selectedCategory()!.id, payload);

    this.isSaving.set(true);
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.selectedCategory.set(null);
          this.page.set(1);
          this.loadCategories();
        },
      });
  }

  onNameChange(value: string): void {
    this.categoryName.set(value);
    this.categoryCode.set(
      value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_'),
    );
  }

  openDeleteDialog(category: DropdownCategory): void {
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
    this.categoriesService
      .delete(category.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.categoryToDelete.set(null);
          this.loadCategories();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create'
      ? 'Create Dropdown Category'
      : 'Edit Dropdown Category';
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0
      ? 0
      : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(
      this.pageStart() + this.categories().length - 1,
      this.totalItems(),
    );
  }

  private fetchCategory(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);
    this.categoriesService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: response => {
          this.selectedCategory.set(response.data);
          this.categoryCode.set(response.data.category_code);
          this.categoryName.set(response.data.category_name);
          this.categoryActive.set(response.data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
