import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, switchMap, tap } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { ToastService } from '../../../core/services/toast.service';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  DepartmentRecord,
  RoleRecord,
  UserListFilters,
  UserRecord,
  UsersService,
} from './users.service';

const EMPTY_FILTERS: UserListFilters = {
  name: '',
  email: '',
  roleId: null,
  accountType: '',
  departmentId: null,
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['../forms/forms.component.scss', './users.component.scss'],
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  readonly users = signal<UserRecord[]>([]);
  readonly roles = signal<RoleRecord[]>([]);
  readonly departments = signal<DepartmentRecord[]>([]);

  readonly nameSearch = signal('');
  readonly emailSearch = signal('');
  readonly selectedRoleId = signal<number | null>(null);
  readonly selectedAccountType = signal<'' | 'Staff' | 'Student'>('');
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly appliedFilters = signal<UserListFilters>({ ...EMPTY_FILTERS });

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly isPairDialogOpen = signal(false);
  readonly pairUsername = signal('');
  readonly pairRoleId = signal<number | null>(null);
  readonly userForRoleAssignment = signal<UserRecord | null>(null);
  readonly assignRoleId = signal<number | null>(null);
  readonly isSaving = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'user', label: 'User', width: '250px' },
    { key: 'jobTitle', label: 'Job Title', width: '190px' },
    { key: 'role', label: 'Role', width: '170px' },
    { key: 'type', label: 'Account Type', width: '130px', align: 'center' },
    { key: 'department', label: 'Department', width: '250px' },
    { key: 'lastLogin', label: 'Last Login', width: '150px' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as UserRecord).id;

  ngOnInit(): void {
    this.loadInitialData();
  }

  roleOptions(): DropdownOption<number>[] {
    return this.roles().map((role) => ({
      value: role.id,
      label: role.role_name,
      description: role.role_code,
      searchText: `${role.role_name} ${role.role_code}`,
    }));
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

    forkJoin({
      roles: this.usersService.listRoles(),
      departments: this.usersService.listDepartments(),
    })
      .pipe(
        tap(({ roles, departments }) => {
          this.roles.set(roles.data.items);
          this.departments.set(this.uniqueDepartments(departments.data));
        }),
        switchMap(() =>
          this.usersService.list(this.page(), this.pageSize(), this.appliedFilters()),
        ),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.applyUsersResponse(response.data.items, response.data.pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  search(): void {
    this.appliedFilters.set({
      name: this.nameSearch().trim(),
      email: this.emailSearch().trim(),
      roleId: this.selectedRoleId(),
      accountType: this.selectedAccountType(),
      departmentId: this.selectedDepartmentId(),
    });
    this.page.set(1);
    this.loadUsers();
  }

  resetFilters(): void {
    this.nameSearch.set('');
    this.emailSearch.set('');
    this.selectedRoleId.set(null);
    this.selectedAccountType.set('');
    this.selectedDepartmentId.set(null);
    this.appliedFilters.set({ ...EMPTY_FILTERS });
    this.page.set(1);
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.usersService
      .list(this.page(), this.pageSize(), this.appliedFilters())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadUsers();
            return;
          }
          this.applyUsersResponse(response.data.items, pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadUsers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadUsers();
  }

  openPairDialog(): void {
    this.pairUsername.set('');
    this.pairRoleId.set(null);
    this.isPairDialogOpen.set(true);
  }

  closePairDialog(): void {
    if (this.isSaving()) return;
    this.isPairDialogOpen.set(false);
    this.pairUsername.set('');
    this.pairRoleId.set(null);
  }

  pairUserRole(): void {
    const username = this.pairUsername().trim();
    const roleId = this.pairRoleId();
    if (!username || roleId === null || this.isSaving()) return;

    this.isSaving.set(true);
    this.usersService
      .pairUserRole(username, roleId)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isPairDialogOpen.set(false);
          this.pairUsername.set('');
          this.pairRoleId.set(null);
          this.page.set(1);
          this.loadUsers();
        },
      });
  }

  openAssignRoleDialog(user: UserRecord): void {
    this.userForRoleAssignment.set(user);
    this.assignRoleId.set(user.role_id);
  }

  closeAssignRoleDialog(): void {
    if (this.isSaving()) return;
    this.userForRoleAssignment.set(null);
    this.assignRoleId.set(null);
  }

  assignUserRole(): void {
    const user = this.userForRoleAssignment();
    const roleId = this.assignRoleId();
    if (!user || roleId === null || this.isSaving()) return;

    this.isSaving.set(true);
    this.usersService
      .assignUserRole(user.id, roleId)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.userForRoleAssignment.set(null);
          this.assignRoleId.set(null);
          this.loadUsers();
        },
      });
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.users().length - 1, this.totalItems());
  }

  initials(user: UserRecord): string {
    const source = user.fullname || user.email || user.username;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  formatDate(value: string | null): string {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private applyUsersResponse(
    users: UserRecord[],
    pagination: {
      total_items: number;
      total_pages: number;
    },
  ): void {
    this.users.set(users);
    this.totalItems.set(pagination.total_items);
    this.totalPages.set(Math.max(1, pagination.total_pages));
  }

  private handleLoadError(): void {
    this.users.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.loadFailed.set(true);
  }

  private uniqueDepartments(departments: DepartmentRecord[]): DepartmentRecord[] {
    const unique = new Map<string, DepartmentRecord>();
    for (const department of departments) {
      const key = department.department_name.trim().toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, department);
      }
    }
    return [...unique.values()];
  }
}
