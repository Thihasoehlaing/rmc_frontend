import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  DepartmentRecord,
  StaffDirectoryService,
  StaffRecord,
  StaffStatusFilter,
} from './staff-directory.service';

@Component({
  selector: 'app-staff-directory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './staff-directory.component.html',
  styleUrls: [
    '../forms/forms.component.scss',
    '../academic-staff/academic-staff.component.scss',
    './staff-directory.component.scss',
  ],
})
export class StaffDirectoryComponent implements OnInit {
  private readonly staffService = inject(StaffDirectoryService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly staff = signal<StaffRecord[]>([]);
  readonly departments = signal<DepartmentRecord[]>([]);

  readonly nameSearch = signal('');
  readonly emailSearch = signal('');
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly selectedStatus = signal<StaffStatusFilter>('');
  readonly selectedType = signal<string>('');
  readonly appliedName = signal('');
  readonly appliedEmail = signal('');
  readonly appliedDepartmentId = signal<number | null>(null);
  readonly appliedStatus = signal<StaffStatusFilter>('');
  readonly appliedType = signal<string>('');

  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly pageSizeOptions = [20, 50, 100];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly isSyncing = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'staff', label: 'Staff', width: '280px' },
    { key: 'jobTitle', label: 'Job Title', width: '210px' },
    { key: 'department', label: 'Department', width: '260px' },
    { key: 'type', label: 'Type', width: '130px', align: 'center' },
    { key: 'syncedAt', label: 'Synced At', width: '190px' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as StaffRecord).id;

  ngOnInit(): void {
    this.loadInitialData();
  }

  departmentOptions(): DropdownOption<number>[] {
    return this.departments().map((department) => ({
      value: department.id,
      label: department.department_name,
    }));
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.staffService
      .listDepartments()
      .pipe(
        tap((response) => this.departments.set(this.uniqueDepartments(response.data))),
        switchMap(() => this.listRequest()),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.applyListResponse(response.data.items, response.data.pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.listRequest()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadStaff();
            return;
          }
          this.applyListResponse(response.data.items, pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  search(): void {
    this.appliedName.set(this.nameSearch().trim());
    this.appliedEmail.set(this.emailSearch().trim());
    this.appliedDepartmentId.set(this.selectedDepartmentId());
    this.appliedStatus.set(this.selectedStatus());
    this.appliedType.set(this.selectedType());
    this.page.set(1);
    this.loadStaff();
  }

  resetFilters(): void {
    this.nameSearch.set('');
    this.emailSearch.set('');
    this.selectedDepartmentId.set(null);
    this.selectedStatus.set('');
    this.selectedType.set('');
    this.appliedName.set('');
    this.appliedEmail.set('');
    this.appliedDepartmentId.set(null);
    this.appliedStatus.set('');
    this.appliedType.set('');
    this.page.set(1);
    this.loadStaff();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadStaff();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadStaff();
  }

  syncDirectory(): void {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);

    this.staffService
      .sync(true)
      .pipe(finalize(() => this.isSyncing.set(false)))
      .subscribe({
        next: (response) => {
          this.toastService.success(response.message);
          this.page.set(1);
          this.loadStaff();
        },
      });
  }

  goToDepartments(): void {
    this.router.navigate(['/settings/departments']);
  }

  initials(item: StaffRecord): string {
    const source = item.fullname || item.email || item.username || '';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.staff().length - 1, this.totalItems());
  }

  staffTypeLabel(item: StaffRecord): string {
    const type = item.staff_type?.trim().toLowerCase();
    if (type === 'fulltime') return 'fulltime';
    if (type === 'parttime') return 'parttime';
    return type || 'Not specified';
  }

  formatSyncedAt(value: string | null | undefined): string {
    if (!value) return 'Not synced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not synced';
    return formatDate(date, 'yyyy-MM-dd hh:mm:ss a', 'en-MY');
  }

  private listRequest() {
    return this.staffService.list({
      page: this.page(),
      perPage: this.pageSize(),
      search: [this.appliedName(), this.appliedEmail()].filter(Boolean).join(' '),
      departmentId: this.appliedDepartmentId(),
      status: this.appliedStatus(),
      type: this.appliedType(),
    });
  }

  private applyListResponse(
    items: StaffRecord[],
    pagination: { total_items: number; total_pages: number },
  ): void {
    this.staff.set(items);
    this.totalItems.set(pagination.total_items);
    this.totalPages.set(Math.max(1, pagination.total_pages));
  }

  private handleLoadError(): void {
    this.staff.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.loadFailed.set(true);
  }

  private uniqueDepartments(departments: DepartmentRecord[]): DepartmentRecord[] {
    const unique = new Map<string, DepartmentRecord>();
    for (const department of departments) {
      const key = department.department_name.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, department);
    }
    return [...unique.values()];
  }
}
