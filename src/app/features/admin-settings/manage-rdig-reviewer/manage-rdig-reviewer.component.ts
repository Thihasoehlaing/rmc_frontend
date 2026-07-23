import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { SkeletonColumn, TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  AcademicStaffOptionRecord,
  AcademicStaffService,
  DepartmentRecord,
} from '../../settings/academic-staff/academic-staff.service';
import { RdigReviewerRecord, RdigReviewerService } from './rdig-reviewer.service';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-manage-rdig-reviewer',
  imports: [
    AdminSettingsPageHeaderComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ActionButtonComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    SubmissionsSearchComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './manage-rdig-reviewer.component.html',
  styleUrls: [
    '../dropdowns/shared/form-dropdown-options-manager.component.scss',
    './manage-rdig-reviewer.component.scss',
  ],
})
export class ManageRdigReviewerComponent implements OnInit {
  private readonly academicStaffService = inject(AcademicStaffService);
  private readonly rdigReviewerService = inject(RdigReviewerService);
  private readonly toast = inject(ToastService);

  readonly reviewers = signal<RdigReviewerRecord[]>([]);
  readonly academicOptions = signal<AcademicStaffOptionRecord[]>([]);
  readonly staffOptions = signal<DropdownOption<number>[]>([]);
  readonly departments = signal<DepartmentRecord[]>([]);
  readonly departmentOptions = signal<DropdownOption<number>[]>([]);

  readonly searchQuery = signal('');
  readonly departmentFilter = signal<number | null>(null);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly skeletonColumns: readonly SkeletonColumn[] = [
    { width: '7%' },
    { width: '28%' },
    { width: '20%' },
    { width: '20%' },
    { width: '12%' },
    { width: '13%' },
  ];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly busyRowId = signal<number | null>(null);
  readonly showAddModal = signal(false);
  readonly rowToRemove = signal<RdigReviewerRecord | null>(null);

  readonly selectedStaffControl = new FormControl<number[]>([], { nonNullable: true });
  readonly modalActiveControl = new FormControl<boolean>(true, { nonNullable: true });

  readonly existingAcademicStaffIds = computed(
    () =>
      new Set(
        this.reviewers()
          .map((reviewer) => reviewer.academic_staff_id)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
  );

  readonly modalStaffOptions = computed(() => {
    const existing = this.existingAcademicStaffIds();
    const selected = new Set(this.selectedStaffControl.value);
    return this.staffOptions().map((option) => ({
      ...option,
      disabled: existing.has(option.value) && !selected.has(option.value),
    }));
  });

  ngOnInit(): void {
    this.loadInitialOptions();
  }

  selectedStaffCount(): number {
    return this.selectedStaffControl.value.length;
  }


  loadInitialOptions(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    forkJoin({
      academic: this.academicStaffService.listAcademicStaffOptions(),
      departments: this.academicStaffService.listDepartments(),
    }).subscribe({
      next: ({ academic, departments }) => {
        if (academic.success) {
          this.academicOptions.set(academic.data ?? []);
          this.staffOptions.set((academic.data ?? []).map((staff) => this.toStaffOption(staff)));
        }
        if (departments.success) {
          this.departments.set(departments.data ?? []);
          this.departmentOptions.set(
            (departments.data ?? []).map((department) => ({
              value: department.id,
              label: department.department_name,
            })),
          );
        }
        this.loadReviewers();
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.error('Unable to load academic staff and department options.');
      },
    });
  }

  loadReviewers(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.rdigReviewerService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.searchQuery(),
        departmentId: this.departmentFilter(),
        status: this.statusFilter(),
      })
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.handleLoadFailure(response.message);
            return;
          }
          const data = response.data;
          this.reviewers.set(data.items ?? []);
          this.totalItems.set(data.pagination?.total_items ?? data.items?.length ?? 0);
          this.totalPages.set(Math.max(1, data.pagination?.total_pages ?? 1));
          this.page.set(data.pagination?.current_page ?? this.page());
          this.isLoading.set(false);
          this.busyRowId.set(null);
        },
        error: () => this.handleLoadFailure(),
      });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
    this.loadReviewers();
  }

  onDepartmentChange(value: number | null): void {
    this.departmentFilter.set(value);
    this.page.set(1);
    this.loadReviewers();
  }

  onStatusChange(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.loadReviewers();
  }

  onReset(): void {
    this.searchQuery.set('');
    this.departmentFilter.set(null);
    this.statusFilter.set('all');
    this.page.set(1);
    this.loadReviewers();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadReviewers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadReviewers();
  }

  openAddModal(): void {
    this.selectedStaffControl.setValue([]);
    this.modalActiveControl.setValue(true);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSaving()) return;
    this.showAddModal.set(false);
    this.selectedStaffControl.setValue([]);
    this.modalActiveControl.setValue(true);
  }

  saveReviewers(): void {
    const selectedIds = this.selectedStaffControl.value;
    if (selectedIds.length === 0 || this.isSaving()) return;

    this.isSaving.set(true);
    forkJoin(
      selectedIds.map((academicStaffId) =>
        this.rdigReviewerService.add(academicStaffId, this.modalActiveControl.value),
      ),
    ).subscribe({
      next: (responses) => {
        this.isSaving.set(false);
        const failed = responses.find((response) => !response.success);
        if (failed) {
          this.toast.error(failed.message || 'Unable to add one or more reviewers.');
          return;
        }
        this.toast.success(
          selectedIds.length === 1
            ? 'Reviewer added successfully.'
            : `${selectedIds.length} reviewers added successfully.`,
        );
        this.closeAddModal();
        this.loadReviewers();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err, 'Unable to add reviewers. Please try again.');
      },
    });
  }

  toggleStatus(row: RdigReviewerRecord): void {
    if (this.busyRowId() !== null || this.isSaving()) return;
    this.busyRowId.set(row.id);
    this.rdigReviewerService.update(row.id, { is_active: !row.is_active }).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to update reviewer status.');
          return;
        }
        this.toast.success(`${this.displayStaffName(row)} ${row.is_active ? 'deactivated' : 'activated'}.`);
        this.loadReviewers();
      },
      error: (err) => {
        this.busyRowId.set(null);
        this.showError(err, 'Unable to update reviewer status.');
      },
    });
  }

  confirmRemove(): void {
    const row = this.rowToRemove();
    if (!row || this.busyRowId() !== null || this.isSaving()) return;
    this.busyRowId.set(row.id);
    this.rdigReviewerService.remove(row.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to remove reviewer.');
          return;
        }
        this.rowToRemove.set(null);
        this.toast.success(`${this.displayStaffName(row)} removed from the reviewer list.`);
        if (this.reviewers().length === 1 && this.page() > 1) {
          this.page.update((current) => current - 1);
        }
        this.loadReviewers();
      },
      error: (err) => {
        this.busyRowId.set(null);
        this.showError(err, 'Unable to remove reviewer.');
      },
    });
  }

  displayStaffName(row: RdigReviewerRecord): string {
    return row.staff_fullname || row.staff_username || 'Reviewer';
  }

  getInitials(row: RdigReviewerRecord): string {
    const value = this.displayStaffName(row);
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '--';
  }

  private toStaffOption(staff: AcademicStaffOptionRecord): DropdownOption<number> {
    const name = staff.fullname || staff.username || `Academic Staff #${staff.id}`;
    const details = [staff.username, staff.email, staff.department].filter(Boolean).join(' · ');
    return {
      value: staff.id,
      label: name,
      description: details,
      searchText: `${name} ${details}`,
    };
  }

  private handleLoadFailure(message?: string): void {
    this.reviewers.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.isLoading.set(false);
    this.busyRowId.set(null);
    this.loadFailed.set(true);
    this.toast.error(message || 'Unable to load RDIG reviewers. Please try again.');
  }

  private showError(err: unknown, fallback: string): void {
    const message = (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.toast.error(message);
  }
}
