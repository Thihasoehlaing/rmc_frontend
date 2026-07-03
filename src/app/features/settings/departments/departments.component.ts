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
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { DepartmentListRecord, DepartmentsService } from './departments.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, PaginationComponent, TableSkeletonComponent],
  templateUrl: './departments.component.html',
  styleUrls: ['../forms/forms.component.scss', './departments.component.scss'],
})
export class DepartmentsComponent implements OnInit {
  private readonly departmentsService = inject(DepartmentsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly departments = signal<DepartmentListRecord[]>([]);
  readonly nameSearch = signal('');
  readonly appliedName = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'name', label: 'Name' },
    { key: 'staffCount', label: 'Staff Count', width: '150px', align: 'center' },
    { key: 'type', label: 'Department Type', width: '190px' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as DepartmentListRecord).id;

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.departmentsService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        name: this.appliedName(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadDepartments();
            return;
          }
          this.departments.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  search(): void {
    this.appliedName.set(this.nameSearch().trim());
    this.page.set(1);
    this.loadDepartments();
  }

  resetFilters(): void {
    this.nameSearch.set('');
    this.appliedName.set('');
    this.page.set(1);
    this.loadDepartments();
  }

  goToStaffDirectory(): void {
    this.router.navigate(['/settings/staff-directory']);
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadDepartments();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadDepartments();
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.departments().length - 1, this.totalItems());
  }

  private handleLoadError(): void {
    this.departments.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.loadFailed.set(true);
  }
}
