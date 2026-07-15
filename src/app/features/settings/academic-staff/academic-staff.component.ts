import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap, tap } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import {
  AcademicStaffByDepartmentPayload,
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
    TableActionIconComponent,
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    DetailPanelSkeletonComponent,
    TableSkeletonComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './academic-staff.component.html',
  styleUrls: ['../forms/forms.component.scss', './academic-staff.component.scss'],
})
export class AcademicStaffComponent implements OnInit {
  private readonly academicStaffService = inject(AcademicStaffService);
  private readonly toastService = inject(ToastService);

  readonly academicStaff = signal<AcademicStaffRecord[]>([]);
  readonly departments = signal<DepartmentRecord[]>([]);

  readonly nameSearch = signal('');
  readonly emailSearch = signal('');
  readonly jobTitleSearch = signal('');
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly selectedStatus = signal<StatusFilter>('');
  readonly appliedSearch = signal('');
  readonly appliedName = signal('');
  readonly appliedEmail = signal('');
  readonly appliedJobTitle = signal('');
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
  readonly departmentDialogOpen = signal(false);
  readonly selectedBulkDepartmentId = signal<number | null>(null);
  readonly bulkAcademicStaffActive = signal(true);
  readonly isBulkSaving = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'staff', label: 'Academic Staff', width: '280px' },
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

  departmentOptions(): DropdownOption<number>[] {
    return this.departments().map((department) => ({
      value: department.id,
      label: department.department_name,
    }));
  }

  staffMemberOptions(): DropdownOption<number>[] {
    return this.staffOptions().map((staff) => ({
      value: staff.staff_id,
      label: staff.fullname || staff.username || `Staff ${staff.staff_id}`,
      description: this.staffOptionDescription(staff),
      displayLabel: staff.username || staff.fullname || `Staff ${staff.staff_id}`,
      searchText: this.staffOptionSearchText(staff),
    }));
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
    this.appliedSearch.set('');
    this.appliedName.set(this.nameSearch().trim());
    this.appliedEmail.set(this.emailSearch().trim());
    this.appliedJobTitle.set(this.jobTitleSearch().trim());
    this.appliedDepartmentId.set(this.selectedDepartmentId());
    this.appliedStatus.set(this.selectedStatus());
    this.page.set(1);
    this.loadAcademicStaff();
  }

  resetFilters(): void {
    this.nameSearch.set('');
    this.emailSearch.set('');
    this.jobTitleSearch.set('');
    this.selectedDepartmentId.set(null);
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedName.set('');
    this.appliedEmail.set('');
    this.appliedJobTitle.set('');
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
    this.loadStaffOptionsForSearch(this.staffSearch());
  }

  onStaffSearchChange(search: string): void {
    this.staffSearch.set(search);
    this.loadStaffOptionsForSearch(search);
  }

  loadStaffOptionsForSearch(search: string): void {
    this.isStaffLoading.set(true);
    this.staffLoadFailed.set(false);

    this.academicStaffService
      .listStaff({
        search,
        departmentId: this.staffDepartmentId(),
      })
      .pipe(finalize(() => this.isStaffLoading.set(false)))
      .subscribe({
        next: (response) => {
          const options = [...response.data.items];
          const selected = this.selectedAcademicStaff();
          const selectedOption = selected ? this.toStaffOption(selected) : null;
          if (
            selectedOption &&
            !options.some((option) => option.staff_id === selectedOption.staff_id)
          ) {
            options.unshift(selectedOption);
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
    this.loadStaffOptionsForSearch(this.staffSearch());
  }

  saveAcademicStaff(): void {
    const mode = this.dialogMode();
    const staffId = this.selectedStaffId();
    const username = this.selectedStaffUsername();
    if (!mode || staffId === null || !username || this.isSaving()) return;

    const payload: AcademicStaffPayload = {
      username,
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
        this.selectedStaffId.set(null);
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

  openDepartmentDialog(): void {
    this.departmentDialogOpen.set(true);
    this.selectedBulkDepartmentId.set(null);
    this.bulkAcademicStaffActive.set(true);
  }

  closeDepartmentDialog(): void {
    if (this.isBulkSaving()) return;
    this.departmentDialogOpen.set(false);
    this.selectedBulkDepartmentId.set(null);
  }

  saveAcademicStaffByDepartment(): void {
    const departmentId = this.selectedBulkDepartmentId();
    if (departmentId === null || this.isBulkSaving()) return;

    const payload: AcademicStaffByDepartmentPayload = {
      department_id: departmentId,
      type: 'fulltime',
      is_active: this.bulkAcademicStaffActive(),
    };

    this.isBulkSaving.set(true);
    this.academicStaffService
      .createByDepartment(payload)
      .pipe(finalize(() => this.isBulkSaving.set(false)))
      .subscribe({
        next: (response) => {
          const added = response.data.added_count;
          const skipped = response.data.skipped_count;
          this.toastService.success(
            `${added} staff added from ${response.data.department_name}. ${skipped} already existed.`,
          );
          this.departmentDialogOpen.set(false);
          this.selectedBulkDepartmentId.set(null);
          this.page.set(1);
          this.loadAcademicStaff();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Add Academic Staff' : 'Edit Academic Staff';
  }

  initials(item: AcademicStaffRecord): string {
    const source = this.staffName(item) || this.staffEmail(item) || this.staffUsername(item);
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  staffName(item: AcademicStaffRecord): string {
    return item.fullname || item.staff?.fullname || item.username || item.staff?.username || 'Unknown staff';
  }

  staffEmail(item: AcademicStaffRecord): string | null {
    return item.email || item.staff_email || item.staff?.email || item.staff?.staff_email || null;
  }

  staffJobTitle(item: AcademicStaffRecord): string | null {
    return item.job_title || item.staff?.job_title || null;
  }

  staffDepartment(item: AcademicStaffRecord): string | null {
    return item.department || item.staff?.department || null;
  }

  staffUsername(item: AcademicStaffRecord): string {
    return item.username || item.staff?.username || '';
  }

  staffPhotoUrl(item: AcademicStaffRecord): string | null {
    return item.photo_url || item.staff?.photo_url || null;
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
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

    this.academicStaffService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (detail) => {
          const item = detail.data;
          const options = [...this.staffOptions()];
          const selectedOption = this.toStaffOption(item);
          if (
            selectedOption &&
            !options.some((option) => option.staff_id === selectedOption.staff_id)
          ) {
            options.unshift(selectedOption);
          }

          this.selectedAcademicStaff.set(item);
          this.selectedStaffId.set(this.staffId(item));
          this.academicStaffActive.set(item.is_active);
          this.staffOptions.set(options);
          this.toastService.success(detail.message);
          this.loadStaffOptionsForSearch(this.staffSearch());
        },
        error: () => this.detailFailed.set(true),
      });
  }

  private loadCreateOptions(): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.academicStaffService
      .listStaff({
        search: this.staffSearch(),
        departmentId: this.staffDepartmentId(),
      })
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (staff) => {
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
      name: this.appliedName(),
      email: this.appliedEmail(),
      jobTitle: this.appliedJobTitle(),
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

  private staffId(item: AcademicStaffRecord): number | null {
    return item.staff_id ?? item.staff?.id ?? null;
  }

  private selectedStaffUsername(): string | null {
    const staffId = this.selectedStaffId();
    if (staffId === null) return null;

    const option = this.staffOptions().find((staff) => staff.staff_id === staffId);
    if (option?.username) return option.username;

    const selected = this.selectedAcademicStaff();
    if (selected && this.staffId(selected) === staffId) {
      return this.staffUsername(selected);
    }

    return null;
  }

  private staffOptionDescription(staff: StaffRecord): string {
    return [
      staff.email || staff.staff_email,
      staff.job_title,
      staff.department,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' - ');
  }

  private staffOptionSearchText(staff: StaffRecord): string {
    return [
      staff.fullname,
      staff.username,
      staff.email,
      staff.staff_email,
      staff.job_title,
      staff.department,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ');
  }

  private toStaffOption(item: AcademicStaffRecord): StaffRecord | null {
    const staffId = this.staffId(item);
    if (staffId === null) {
      return null;
    }
    return {
      id: staffId,
      staff_id: staffId,
      username: this.staffUsername(item),
      staff_code: item.staff_code ?? item.staff?.staff_code ?? null,
      fullname: this.staffName(item),
      email: item.email ?? item.staff?.email ?? null,
      staff_email: item.staff_email ?? item.staff?.staff_email ?? null,
      department: this.staffDepartment(item),
      job_title: this.staffJobTitle(item),
      photo_url: item.photo_url ?? item.staff?.photo_url ?? null,
      is_active: item.staff?.is_active ?? item.staff_is_active ?? true,
      label: [this.staffName(item), this.staffDepartment(item)].filter(Boolean).join(' - '),
    };
  }
}
