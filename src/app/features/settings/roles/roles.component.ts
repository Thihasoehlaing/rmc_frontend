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
import { Role, RolePayload, RolesService } from './roles.service';

type DialogMode = 'create' | 'edit';
type StatusFilter = '' | 'Active' | 'Inactive';

@Component({
  selector: 'app-roles',
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
  templateUrl: './roles.component.html',
  styleUrls: [
    '../forms/forms.component.scss',
    './roles.component.scss',
  ],
})
export class RolesComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly toastService = inject(ToastService);

  readonly roles = signal<Role[]>([]);
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
  readonly selectedRole = signal<Role | null>(null);
  readonly roleCode = signal('');
  readonly roleName = signal('');
  readonly roleDescription = signal('');
  readonly roleActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly roleToDelete = signal<Role | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'code', label: 'Role Code', width: '190px' },
    { key: 'name', label: 'Role Name', width: '230px' },
    { key: 'description', label: 'Description', width: '360px' },
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
  ) => (row as Role).id;

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.rolesService
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
            this.loadRoles();
            return;
          }

          this.roles.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.roles.set([]);
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
    this.loadRoles();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadRoles();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadRoles();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadRoles();
  }

  openCreateDialog(): void {
    this.selectedRole.set(null);
    this.roleCode.set('');
    this.roleName.set('');
    this.roleDescription.set('');
    this.roleActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(role: Role): void {
    this.selectedRole.set(role);
    this.dialogMode.set('edit');
    this.fetchRole(role.id);
  }

  retryDetail(): void {
    const role = this.selectedRole();
    if (role) this.fetchRole(role.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedRole.set(null);
    this.detailFailed.set(false);
  }

  onNameChange(value: string): void {
    this.roleName.set(value);
    if (this.dialogMode() !== 'create') return;

    this.roleCode.set(
      value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_'),
    );
  }

  saveRole(): void {
    const mode = this.dialogMode();
    const code = this.roleCode().trim().toUpperCase();
    const name = this.roleName().trim();
    if (!mode || !code || !name || this.isSaving()) return;

    const payload: RolePayload = {
      role_code: code,
      role_name: name,
      description: this.roleDescription().trim() || null,
      is_active: this.roleActive(),
    };
    const request =
      mode === 'create'
        ? this.rolesService.create(payload)
        : this.rolesService.update(this.selectedRole()!.id, payload);

    this.isSaving.set(true);
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.selectedRole.set(null);
          this.page.set(1);
          this.loadRoles();
        },
      });
  }

  openDeleteDialog(role: Role): void {
    this.roleToDelete.set(role);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.roleToDelete.set(null);
  }

  confirmDelete(): void {
    const role = this.roleToDelete();
    if (!role || this.isSaving()) return;

    this.isSaving.set(true);
    this.rolesService
      .delete(role.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.roleToDelete.set(null);
          this.loadRoles();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Create Role' : 'Edit Role';
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
      this.pageStart() + this.roles().length - 1,
      this.totalItems(),
    );
  }

  private fetchRole(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.rolesService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: response => {
          this.selectedRole.set(response.data);
          this.roleCode.set(response.data.role_code);
          this.roleName.set(response.data.role_name);
          this.roleDescription.set(response.data.description ?? '');
          this.roleActive.set(response.data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
