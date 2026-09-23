import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { nextTableSortState, SortDirection } from '../../../shared/services/table-sort.service';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonColumn } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { ToastService } from '../../../core/services/toast.service';
import { AcademicStaffService, DepartmentRecord } from '../../settings/academic-staff/academic-staff.service';
import { StaffAccessRecordApi, StaffAccessService, StaffOption } from './staff-access.service';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';
import { TableScrollHintComponent } from '../../../shared/components/table-scroll-hint/table-scroll-hint.component';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';

type AccessStatus = 'active' | 'blocked';
type StatusFilter = 'all' | AccessStatus;
type SortColumn = 'blockedDate';

interface StaffAccessRecord {
  id: number;
  name: string;
  username: string;
  department: string;
  role: string;
  email: string;
  status: AccessStatus;
  blockedDate: string;
  reason: string;
  initials: string;
}

@Component({
  selector: 'app-staff-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminSettingsPageHeaderComponent,
    DataTableComponent,
    TableActionIconComponent,
    PaginationComponent,
    TableSkeletonComponent,
    DialogComponent,
    SearchableDropdownComponent,
    SubmissionsSearchComponent,
    TableScrollHintComponent,
    FormsModule,
  ],
  templateUrl: './staff-access.component.html',
  styleUrls: ['./staff-access.component.scss'],
})
export class StaffAccessComponent implements OnInit {
  private readonly staffAccessService = inject(StaffAccessService);
  private readonly academicStaffService = inject(AcademicStaffService);
  private readonly toast = inject(ToastService);

  readonly columns: DataTableColumn[] = [
    { key: 'no', label: 'No.', width: '5rem' },
    { key: 'name', label: 'Staff Name', width: '22rem' },
    { key: 'department', label: 'Department', width: '13rem' },
    { key: 'email', label: 'Email', width: '17rem' },
    { key: 'status', label: 'Status', width: '9rem' },
    { key: 'blockedDate', label: 'Blocked Date', sortable: true, width: '11rem' },
    { key: 'reason', label: 'Reason', width: '8rem', align: 'center', headerAlign: 'center' },
    {
      key: 'actions',
      label: 'Actions',
      width: '132px',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly staffRecords = signal<StaffAccessRecord[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly loadingId = signal<number | null>(null);

  readonly departments = signal<DepartmentRecord[]>([]);
  readonly departmentOptions = computed<DropdownOption<string>[]>(() =>
    this.departments().map((d) => ({ value: d.department_name, label: d.department_name })),
  );

  readonly departmentFilter = signal('');
  readonly statusFilter = signal<StatusFilter>('blocked');
  readonly searchFilter = signal('');
  readonly sortColumn = signal<SortColumn | null>(null);
  readonly sortDirection = signal<SortDirection>(null);

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 25, 50];
  readonly skeletonColumns: readonly SkeletonColumn[] = [
    { width: '5rem' },
    { width: '22rem' },
    { width: '13rem' },
    { width: '17rem' },
    { width: '9rem' },
    { width: '11rem' },
    { width: '8rem' },
    { width: '132px' },
  ];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  /** Reason prompt shown before blocking a staff member. */
  readonly blockTarget = signal<StaffAccessRecord | null>(null);
  readonly unblockTarget = signal<StaffAccessRecord | null>(null);
  readonly blockStaffDialogOpen = signal(false);
  readonly blockStaffSaving = signal(false);
  readonly staffOptions = signal<StaffOption[]>([]);
  readonly staffOptionsLoading = signal(false);
  readonly staffDropdownOpen = signal(false);
  readonly staffSearchTerm = signal('');
  readonly selectedBlockUsernames = signal<string[]>([]);
  readonly blockReason = signal('');

  /** Read-only view of a blocked entry's reason, kept out of the table itself. */
  readonly reasonViewTarget = signal<StaffAccessRecord | null>(null);

  /** Global count, independent of the current filters/page — refreshed after every block/unblock. */
  readonly blockedCount = signal(0);

  ngOnInit(): void {
    this.loadDepartments();
    this.loadBlockedCount();
    this.loadStaff();
  }

  private loadDepartments(): void {
    this.academicStaffService.listDepartments().subscribe({
      next: (res) => {
        if (res.success) this.departments.set(res.data ?? []);
      },
      error: () => this.departments.set([]),
    });
  }

  protected loadBlockedCount(): void {
    this.staffAccessService.list({ page: 1, perPage: 1, status: 'blocked' }).subscribe({
      next: (res) => {
        if (res.success) this.blockedCount.set(res.data.pagination.total_items);
      },
      error: () => this.blockedCount.set(0),
    });
  }

  loadStaff(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.staffAccessService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.statusFilter(),
        department: this.departmentFilter() || undefined,
        search: this.searchFilter(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res.success) {
            this.loadFailed.set(true);
            this.staffRecords.set([]);
            this.totalItems.set(0);
            this.totalPages.set(1);
            return;
          }
          this.staffRecords.set((res.data.items ?? []).map((item) => this.toRow(item)));
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(Math.max(1, res.data.pagination.total_pages));
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
          this.staffRecords.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.toast.error('Failed to load staff access records.');
        },
      });
  }

  refreshStaffAccess(): void {
    this.loadStaff();
    this.loadBlockedCount();
  }

  private toRow(item: StaffAccessRecordApi): StaffAccessRecord {
    const name = item.staff_name || item.staff_username;
    return {
      id: item.id,
      name,
      username: item.staff_username,
      department: item.department || '',
      role: item.job_title || '',
      email: item.staff_email || '',
      status: item.has_access ? 'active' : 'blocked',
      blockedDate: this.formatDisplayDate(item.blocked_date),
      reason: item.reason || '',
      initials: this.getInitials(name),
    };
  }

  private getInitials(value: string): string {
    if (!value) return '--';
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** The current page, sorted client-side (the backend has no sort param). */
  readonly sortedStaff = () => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    if (!column || !direction) return this.staffRecords();
    const directionFactor = direction === 'asc' ? 1 : -1;

    return [...this.staffRecords()].sort(
      (first, second) =>
        (this.parseBlockedDate(first.blockedDate) - this.parseBlockedDate(second.blockedDate)) *
        directionFactor,
    );
  };

  setDepartmentFilter(value: string | null): void {
    const nextValue = value || '';
    if (this.departmentFilter() === nextValue) return;
    this.departmentFilter.set(nextValue);
    this.page.set(1);
    this.loadStaff();
  }

  setStatusFilter(value: string): void {
    if (value === 'active' || value === 'blocked' || value === 'all') {
      this.statusFilter.set(value);
    } else {
      this.statusFilter.set('all');
    }
    this.page.set(1);
    this.loadStaff();
  }

  resetFilters(): void {
    this.searchFilter.set('');
    this.departmentFilter.set('');
    this.statusFilter.set('blocked');
    this.page.set(1);
    this.loadStaff();
  }

  setSearchFilter(value: string): void {
    this.searchFilter.set(value);
    this.page.set(1);
    this.loadStaff();
  }

  setSort(column: string): void {
    if (column !== 'blockedDate') return;
    const next = nextTableSortState(
      { column: this.sortColumn(), direction: this.sortDirection() },
      column,
    );
    this.sortColumn.set(next.column as SortColumn | null);
    this.sortDirection.set(next.direction);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadStaff();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadStaff();
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  /** Blocking asks for a reason first; unblocking asks for confirmation. */
  toggleAccess(staff: StaffAccessRecord): void {
    if (staff.status === 'blocked') {
      this.openUnblockDialog(staff);
    } else {
      this.openBlockDialog(staff);
    }
  }

  openBlockDialog(staff: StaffAccessRecord): void {
    this.blockTarget.set(staff);
    this.blockReason.set('');
  }

  closeBlockDialog(): void {
    this.blockTarget.set(null);
    this.blockReason.set('');
  }

  openUnblockDialog(staff: StaffAccessRecord): void {
    this.unblockTarget.set(staff);
  }

  closeUnblockDialog(): void {
    if (this.loadingId() !== null) return;
    this.unblockTarget.set(null);
  }

  openBlockStaffDialog(): void {
    this.blockStaffDialogOpen.set(true);
    this.selectedBlockUsernames.set([]);
    this.staffSearchTerm.set('');
    this.staffDropdownOpen.set(false);
    this.blockReason.set('');
    this.loadStaffOptions();
  }

  closeBlockStaffDialog(force = false): void {
    if (this.blockStaffSaving() && !force) return;
    this.blockStaffDialogOpen.set(false);
    this.selectedBlockUsernames.set([]);
    this.staffSearchTerm.set('');
    this.staffDropdownOpen.set(false);
    this.blockReason.set('');
  }

  confirmBulkBlock(): void {
    const usernames = this.selectedBlockUsernames();
    if (!usernames.length || this.blockStaffSaving()) return;

    this.blockStaffSaving.set(true);
    this.staffAccessService
      .bulkBlock(usernames, this.blockReason().trim() || undefined)
      .pipe(finalize(() => this.blockStaffSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.toast.error(res.message ?? 'Could not block selected staff.');
            return;
          }
          const count = res.data.blocked_count || usernames.length;
          this.toast.success(`${count} staff ${count === 1 ? 'member has' : 'members have'} been blocked.`);
          this.closeBlockStaffDialog(true);
          this.loadStaff();
          this.loadBlockedCount();
        },
        error: (err) => this.showError(err, 'Could not block selected staff.'),
      });
  }

  confirmBlock(): void {
    const staff = this.blockTarget();
    if (!staff || this.loadingId() !== null) return;

    this.loadingId.set(staff.id);
    this.staffAccessService.block(staff.id, this.blockReason().trim() || undefined).subscribe({
      next: (res) => {
        this.loadingId.set(null);
        if (!res.success) {
          this.toast.error(res.message ?? 'Could not block staff access.');
          return;
        }
        this.toast.success(`${staff.name}'s access has been blocked.`);
        this.closeBlockDialog();
        this.loadStaff();
        this.loadBlockedCount();
      },
      error: (err) => {
        this.loadingId.set(null);
        this.showError(err, 'Could not block staff access.');
      },
    });
  }

  private unblockStaff(staff: StaffAccessRecord): void {
    if (this.loadingId() !== null) return;

    this.loadingId.set(staff.id);
    this.staffAccessService.unblock(staff.id).subscribe({
      next: (res) => {
        this.loadingId.set(null);
        if (!res.success) {
          this.toast.error(res.message ?? 'Could not restore staff access.');
          return;
        }
        this.toast.success(`${staff.name}'s access has been restored.`);
        this.closeUnblockDialog();
        this.loadStaff();
        this.loadBlockedCount();
      },
      error: (err) => {
        this.loadingId.set(null);
        this.showError(err, 'Could not restore staff access.');
      },
    });
  }

  confirmUnblock(): void {
    const staff = this.unblockTarget();
    if (!staff) return;
    this.unblockStaff(staff);
  }

  openReasonView(staff: StaffAccessRecord): void {
    this.reasonViewTarget.set(staff);
  }

  closeReasonView(): void {
    this.reasonViewTarget.set(null);
  }

  staffDropdownOptions(): DropdownOption<string>[] {
    const selected = this.selectedBlockUsernames();
    const options = this.staffOptions().map((staff) => this.toStaffDropdownOption(staff));
    const missingSelected = selected
      .filter((username) => !options.some((option) => option.value === username))
      .map((username) => ({
        value: username,
        label: username,
        description: 'Selected staff',
        searchText: username,
      }));

    return [...missingSelected, ...options];
  }

  loadStaffOptions(search = ''): void {
    this.staffSearchTerm.set(search);
    this.staffOptionsLoading.set(true);
    this.staffAccessService
      .listStaff(search)
      .pipe(finalize(() => this.staffOptionsLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.staffOptions.set(res.success ? res.data ?? [] : []);
        },
        error: () => {
          this.staffOptions.set([]);
        },
      });
  }

  toggleStaffDropdown(): void {
    this.staffDropdownOpen.update((isOpen) => !isOpen);
  }

  toggleBlockStaffUsername(username: string): void {
    const selected = this.selectedBlockUsernames();
    this.selectedBlockUsernames.set(
      selected.includes(username)
        ? selected.filter((item) => item !== username)
        : [...selected, username],
    );
  }

  removeBlockStaffUsername(username: string): void {
    this.selectedBlockUsernames.set(this.selectedBlockUsernames().filter((item) => item !== username));
  }

  isBlockStaffSelected(username: string): boolean {
    return this.selectedBlockUsernames().includes(username);
  }

  selectedBlockStaffLabels(): string[] {
    const labelByUsername = new Map(this.staffDropdownOptions().map((option) => [option.value, option.label]));
    return this.selectedBlockUsernames().map((username) => labelByUsername.get(username) ?? username);
  }

  private toStaffDropdownOption(staff: StaffOption): DropdownOption<string> {
    return {
      value: staff.username,
      label: staff.fullname || staff.username,
      description: [staff.username, staff.email || staff.staff_email, staff.department]
        .filter(Boolean)
        .join(' | '),
      searchText: [
        staff.username,
        staff.fullname,
        staff.email,
        staff.staff_email,
        staff.department,
        staff.job_title,
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  private showError(err: unknown, fallback: string): void {
    const message = (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.toast.error(message);
  }

  private parseBlockedDate(value: string): number {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private formatDisplayDate(dateValue: string | null): string {
    return formatDisplayDate(dateValue, '');
  }
}





