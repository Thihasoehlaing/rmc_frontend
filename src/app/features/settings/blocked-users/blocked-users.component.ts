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
  BlockedUser,
  BlockedUsersService,
  CreateBlockedUserPayload,
  UpdateBlockedUserPayload,
} from './blocked-users.service';

type DialogMode = 'create' | 'edit';
type StatusFilter = '' | 'Active' | 'Inactive';
type StatusAction = 'unblock' | 'block';

@Component({
  selector: 'app-blocked-users',
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
  templateUrl: './blocked-users.component.html',
  styleUrls: [
    '../forms/forms.component.scss',
    './blocked-users.component.scss',
  ],
})
export class BlockedUsersComponent implements OnInit {
  private readonly blockedUsersService = inject(BlockedUsersService);
  private readonly toastService = inject(ToastService);

  readonly blockedUsers = signal<BlockedUser[]>([]);
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
  readonly selectedBlockedUser = signal<BlockedUser | null>(null);
  readonly username = signal('');
  readonly reason = signal('');
  readonly blockActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);

  readonly statusUser = signal<BlockedUser | null>(null);
  readonly statusAction = signal<StatusAction | null>(null);
  readonly userToDelete = signal<BlockedUser | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'user', label: 'User', width: '250px' },
    { key: 'reason', label: 'Reason', width: '320px' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
    { key: 'activity', label: 'Block Activity', width: '230px' },
    {
      key: 'actions',
      label: 'Actions',
      width: '150px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (
    _index: number,
    row: unknown,
  ) => (row as BlockedUser).id;

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  loadBlockedUsers(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.blockedUsersService
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
          if (
            pagination.total_pages > 0 &&
            this.page() > pagination.total_pages
          ) {
            this.page.set(pagination.total_pages);
            this.loadBlockedUsers();
            return;
          }

          this.blockedUsers.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.blockedUsers.set([]);
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
    this.loadBlockedUsers();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadBlockedUsers();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadBlockedUsers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadBlockedUsers();
  }

  openCreateDialog(): void {
    this.selectedBlockedUser.set(null);
    this.username.set('');
    this.reason.set('');
    this.blockActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(user: BlockedUser): void {
    this.selectedBlockedUser.set(user);
    this.dialogMode.set('edit');
    this.fetchBlockedUser(user.id);
  }

  retryDetail(): void {
    const user = this.selectedBlockedUser();
    if (user) this.fetchBlockedUser(user.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedBlockedUser.set(null);
    this.detailFailed.set(false);
  }

  saveBlockedUser(): void {
    const mode = this.dialogMode();
    const username = this.normalizeUsername(this.username());
    if (!mode || !username || this.isSaving()) return;

    const basePayload: CreateBlockedUserPayload = {
      username,
      reason: this.reason().trim() || null,
    };
    const request =
      mode === 'create'
        ? this.blockedUsersService.create(basePayload)
        : this.blockedUsersService.update(
            this.selectedBlockedUser()!.id,
            {
              ...basePayload,
              is_active: this.blockActive(),
            } satisfies UpdateBlockedUserPayload,
          );

    this.isSaving.set(true);
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.selectedBlockedUser.set(null);
          this.page.set(1);
          this.loadBlockedUsers();
        },
      });
  }

  openStatusDialog(user: BlockedUser): void {
    this.statusUser.set(user);
    this.statusAction.set(user.is_active ? 'unblock' : 'block');
  }

  closeStatusDialog(): void {
    if (this.isSaving()) return;
    this.statusUser.set(null);
    this.statusAction.set(null);
  }

  confirmStatusChange(): void {
    const user = this.statusUser();
    const action = this.statusAction();
    if (!user || !action || this.isSaving()) return;

    this.isSaving.set(true);
    this.blockedUsersService
      .updateStatus(user.id, action === 'block')
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.statusUser.set(null);
          this.statusAction.set(null);
          this.loadBlockedUsers();
        },
      });
  }

  openDeleteDialog(user: BlockedUser): void {
    this.userToDelete.set(user);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.userToDelete.set(null);
  }

  confirmDelete(): void {
    const user = this.userToDelete();
    if (!user || this.isSaving()) return;

    this.isSaving.set(true);
    this.blockedUsersService
      .delete(user.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.userToDelete.set(null);
          this.loadBlockedUsers();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create'
      ? 'Block User'
      : 'Edit Blocked User';
  }

  statusDialogTitle(): string {
    return this.statusAction() === 'unblock' ? 'Unblock User' : 'Block User Again';
  }

  initials(user: BlockedUser): string {
    const source = user.fullname || user.username;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  normalizeUsername(value: string): string {
    return value.trim().split('@')[0].toLowerCase();
  }

  formatDate(value: string | null): string {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  activityOwner(user: BlockedUser): string {
    return user.is_active
      ? user.blocked_by || 'Unknown'
      : user.unblocked_by || 'Unknown';
  }

  activityDate(user: BlockedUser): string {
    return this.formatDate(
      user.is_active ? user.blocked_at : user.unblocked_at,
    );
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
      this.pageStart() + this.blockedUsers().length - 1,
      this.totalItems(),
    );
  }

  private fetchBlockedUser(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.blockedUsersService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: response => {
          this.selectedBlockedUser.set(response.data);
          this.username.set(response.data.username);
          this.reason.set(response.data.reason ?? '');
          this.blockActive.set(response.data.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
