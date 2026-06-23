import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, switchMap, tap } from 'rxjs';

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
  AcademicStaffPayload,
  AcademicStaffRecord,
  AcademicStaffService,
  DepartmentRecord,
  StaffRecord,
} from './academic-staff.service';

import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

type DialogMode = 'create' | 'edit';
type StatusFilter = '' | 'Active' | 'Inactive';

@Component({
  selector: 'app-academic-staff',
  standalone: true,
  imports: [
    SubmissionsSearchComponent,
    TableActionIconComponent,
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    DetailPanelSkeletonComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './academic-staff.component.html',
  styleUrls: ['../forms/forms.component.scss', './academic-staff.component.scss'],
})
export class AcademicStaffComponent implements OnInit {
  private readonly academicStaffService = inject(AcademicStaffService);
  private readonly toastService = inject(ToastService);

  readonly academicStaff = signal<AcademicStaffRecord[]>([]);
  readonly departments = signal<DepartmentRecord[]>([]);

  readonly searchTerm = signal('');
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly selectedStatus = signal<StatusFilter>('');
  readonly appliedSearch = signal('');
  readonly appliedDepartmentId = signal<number | null>(null);
  readonly appliedStatus = signal<StatusFilter>('');

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedAcademicStaff = signal<AcademicStaffRecord | null>(null);
  readonly selectedStaffId = signal<number | null>(null);
  readonly academicStaffActive = signal(true);
  readonly staffSearch = signal('');
  readonly staffDepartmentId = signal<number | null>(null);
  readonly staffOptions = signal<StaffRecord[]>([]);
  readonly isStaffLoading = signal(false);
  readonly staffLoadFailed = signal(false);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly academicStaffToDelete = signal<AcademicStaffRecord | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'staff', label: 'Academic Staff', width: '280px' },
    { key: 'staffCode', label: 'Staff Code', width: '140px' },
    { key: 'jobTitle', label: 'Job Title', width: '210px' },
    { key: 'department', label: 'Department', width: '260px' },
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
    (row as AcademicStaffRecord).id;

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.academicStaffService
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

  loadAcademicStaff(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.listRequest()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadAcademicStaff();
            return;
          }

          this.applyListResponse(response.data.items, pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  search(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    this.appliedDepartmentId.set(this.selectedDepartmentId());
    this.appliedStatus.set(this.selectedStatus());
    this.page.set(1);
    this.loadAcademicStaff();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedDepartmentId.set(null);
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedDepartmentId.set(null);
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadAcademicStaff();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadAcademicStaff();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadAcademicStaff();
  }

  openCreateDialog(): void {
    this.dialogMode.set('create');
    this.selectedAcademicStaff.set(null);
    this.selectedStaffId.set(null);
    this.academicStaffActive.set(true);
    this.staffSearch.set('');
    this.staffDepartmentId.set(null);
    this.detailFailed.set(false);
    this.loadCreateOptions();
  }

  openEditDialog(item: AcademicStaffRecord): void {
    this.dialogMode.set('edit');
    this.selectedAcademicStaff.set(item);
    this.staffSearch.set('');
    this.staffDepartmentId.set(null);
    this.fetchAcademicStaff(item.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedAcademicStaff.set(null);
    this.selectedStaffId.set(null);
    this.staffDepartmentId.set(null);
    this.staffOptions.set([]);
    this.detailFailed.set(false);
  }

  retryDetail(): void {
    const item = this.selectedAcademicStaff();
    if (item) {
      this.fetchAcademicStaff(item.id);
      return;
    }
    this.loadCreateOptions();
  }

  loadStaffOptions(): void {
    this.isStaffLoading.set(true);
    this.staffLoadFailed.set(false);

    this.academicStaffService
      .listStaff({
        search: this.staffSearch(),
        departmentId: this.staffDepartmentId(),
      })
      .pipe(finalize(() => this.isStaffLoading.set(false)))
      .subscribe({
        next: (response) => {
          const options = [...response.data.items];
          const selected = this.selectedAcademicStaff();
          if (selected && !options.some((option) => option.staff_id === selected.staff_id)) {
            options.unshift(selected);
          }
          this.staffOptions.set(options);
        },
        error: () => {
          this.staffOptions.set([]);
          this.staffLoadFailed.set(true);
        },
      });
  }

  onStaffDepartmentChange(departmentId: number | null): void {
    this.staffDepartmentId.set(departmentId);
    this.selectedStaffId.set(null);
    this.loadStaffOptions();
  }

  saveAcademicStaff(): void {
    const mode = this.dialogMode();
    const staffId = this.selectedStaffId();
    if (!mode || staffId === null || this.isSaving()) return;

    const payload: AcademicStaffPayload = {
      staff_id: staffId,
      is_active: this.academicStaffActive(),
    };
    const request =
      mode === 'create'
        ? this.academicStaffService.create(payload)
        : this.academicStaffService.update(this.selectedAcademicStaff()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedAcademicStaff.set(null);
        this.page.set(1);
        this.loadAcademicStaff();
      },
    });
  }

  openDeleteDialog(item: AcademicStaffRecord): void {
    this.academicStaffToDelete.set(item);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.academicStaffToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.academicStaffToDelete();
    if (!item || this.isSaving()) return;

    this.isSaving.set(true);
    this.academicStaffService
      .delete(item.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.academicStaffToDelete.set(null);
          this.loadAcademicStaff();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Add Academic Staff' : 'Edit Academic Staff';
  }

  initials(item: AcademicStaffRecord): string {
    const source = item.fullname || item.email || item.username;
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
    return Math.min(this.pageStart() + this.academicStaff().length - 1, this.totalItems());
  }

  private fetchAcademicStaff(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    forkJoin({
      departments: this.academicStaffService.listDepartments(),
      staff: this.academicStaffService.listStaff(),
    })
      .pipe(
        tap(({ departments, staff }) => {
          this.departments.set(this.uniqueDepartments(departments.data));
          this.staffOptions.set(staff.data.items);
        }),
        switchMap(() => this.academicStaffService.get(id)),
        finalize(() => this.isDetailLoading.set(false)),
      )
      .subscribe({
        next: (detail) => {
          const item = detail.data;
          const options = [...this.staffOptions()];
          if (!options.some((option) => option.staff_id === item.staff_id)) {
            options.unshift(item);
          }

          this.selectedAcademicStaff.set(item);
          this.selectedStaffId.set(item.staff_id);
          this.academicStaffActive.set(item.is_active);
          this.staffOptions.set(options);
          this.toastService.success(detail.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }

  private loadCreateOptions(): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    forkJoin({
      departments: this.academicStaffService.listDepartments(),
      staff: this.academicStaffService.listStaff(),
    })
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: ({ departments, staff }) => {
          this.departments.set(this.uniqueDepartments(departments.data));
          this.staffOptions.set(staff.data.items);
        },
        error: () => {
          this.staffOptions.set([]);
          this.detailFailed.set(true);
        },
      });
  }

  private listRequest() {
    return this.academicStaffService.list({
      page: this.page(),
      perPage: this.pageSize(),
      search: this.appliedSearch(),
      departmentId: this.appliedDepartmentId(),
      status: this.appliedStatus(),
    });
  }

  private applyListResponse(
    items: AcademicStaffRecord[],
    pagination: { total_items: number; total_pages: number },
  ): void {
    this.academicStaff.set(items);
    this.totalItems.set(pagination.total_items);
    this.totalPages.set(Math.max(1, pagination.total_pages));
  }

  private handleLoadError(): void {
    this.academicStaff.set([]);
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
