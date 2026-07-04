import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AppNotification } from '../../core/interfaces/notification.interface';
import {
  NotificationListParams,
  NotificationService,
} from '../../core/services/notification.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../shared/components/submissions-search/submissions-search.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../shared/components/table-action-icon/table-action-icon.component';
import { nextTableSortState, SortDirection } from '../../shared/services/table-sort.service';

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  application: string;
  status: string;
  statusClass: string;
  read: boolean;
  createdAt: string;
  route: string | null;
  isExpired: boolean;
  source: AppNotification;
}

type NotificationSortKey = 'createdAt';
type DateSortOption = 'default' | 'desc' | 'asc';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
    PaginationComponent,
    TableActionIconComponent,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly searchTerm = signal('');
  readonly selectedApplication = signal('');
  readonly selectedStatus = signal('');
  readonly selectedRead = signal('');
  readonly sortBy = signal<NotificationSortKey | null>(null);
  readonly sortDirection = signal<SortDirection>(null);
  readonly dateSort = signal<DateSortOption>('default');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 30, 50];
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly notifications = signal<NotificationRow[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly applicationOptions = [
    { value: '', label: 'All Applications' },
    { value: 'rdig', label: 'RDIG Application' },
    { value: 'conference', label: 'Conference Application' },
    { value: 'journal', label: 'Journal Publication' },
    { value: 'ragra', label: 'RA/GRA Application' },
    { value: 'partnership', label: 'Partnership Application' },
    { value: 'travel-authorization', label: 'Travel Authorization' },
    { value: 'proposal', label: 'Proposal Application' },
  ];

  readonly statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'required_action', label: 'Required Action' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'info', label: 'Info' },
  ];

  readonly readOptions = [
    { value: '', label: 'All Read Status' },
    { value: 'false', label: 'Unread' },
    { value: 'true', label: 'Read' },
  ];

  readonly dateSortOptions: readonly { value: DateSortOption; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'desc', label: 'Newest to oldest' },
    { value: 'asc', label: 'Oldest to newest' },
  ];

  readonly skeletonColumns: readonly SkeletonColumn[] = [
    { width: '20%' },
    { width: '28%' },
    { width: '16%' },
    { width: '130px' },
    { width: '120px' },
    { width: '150px' },
    { width: '132px' },
  ];

  readonly columns: readonly DataTableColumn[] = [
    { key: 'title', label: 'Title', width: '20%' },
    { key: 'message', label: 'Message', width: '28%' },
    { key: 'application', label: 'Application', width: '16%' },
    { key: 'status', label: 'Status', width: '130px', align: 'center', headerAlign: 'center' },
    { key: 'read', label: 'Read Status', width: '120px', align: 'center', headerAlign: 'center' },
    { key: 'createdAt', label: 'Date', width: '150px', sortable: true },
    { key: 'actions', label: 'Action', width: '132px', align: 'right', headerAlign: 'right' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as NotificationRow).id;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    const params: NotificationListParams = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchTerm(),
      applicationId: this.selectedApplication(),
      status: this.selectedStatus(),
      read: this.selectedRead(),
      sortBy: 'createdAt',
      sortDirection: this.resolvedSortDirection(),
    };

    this.notificationService
      .listNotifications(params)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
          const totalPages = Math.max(1, response.pagination.total_pages);

          if (response.pagination.total_pages > 0 && this.page() > response.pagination.total_pages) {
            this.page.set(response.pagination.total_pages);
            this.loadNotifications();
            return;
          }

          this.notifications.set(response.items.map(item => this.toRow(item)));
          this.totalPages.set(totalPages);
          this.totalItems.set(response.pagination.total_items);
        },
        error: () => {
          this.notifications.set([]);
          this.totalPages.set(1);
          this.totalItems.set(0);
          this.loadFailed.set(true);
        },
      });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.trim());
    this.page.set(1);
    this.loadNotifications();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedApplication.set('');
    this.selectedStatus.set('');
    this.selectedRead.set('');
    this.dateSort.set('default');
    this.sortBy.set(null);
    this.sortDirection.set(null);
    this.page.set(1);
    this.loadNotifications();
  }

  onApplicationChange(value: string): void {
    this.selectedApplication.set(value);
    this.page.set(1);
    this.loadNotifications();
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value);
    this.page.set(1);
    this.loadNotifications();
  }

  onReadChange(value: string): void {
    this.selectedRead.set(value);
    this.page.set(1);
    this.loadNotifications();
  }

  onDateSortChange(value: DateSortOption): void {
    this.dateSort.set(value);
    this.sortBy.set(value === 'default' ? null : 'createdAt');
    this.sortDirection.set(value === 'default' ? null : value);
    this.page.set(1);
    this.loadNotifications();
  }

  onPageChange(nextPage: number): void {
    if (nextPage === this.page()) return;
    this.page.set(nextPage);
    this.loadNotifications();
  }

  onPageSizeChange(nextPageSize: number): void {
    this.pageSize.set(nextPageSize);
    this.page.set(1);
    this.loadNotifications();
  }

  onSortChange(columnKey: string): void {
    const next = nextTableSortState(
      { column: this.sortBy(), direction: this.sortDirection() },
      columnKey,
    );

    this.sortBy.set(next.column as NotificationSortKey | null);
    this.sortDirection.set(next.direction);
    this.dateSort.set(next.direction === 'asc' || next.direction === 'desc' ? next.direction : 'default');
    this.page.set(1);
    this.loadNotifications();
  }

  openNotification(row: NotificationRow): void {
    if (row.id != null && !row.read) {
      this.markRowAsRead(row);
    }

    if (!row.isExpired && row.route) {
      this.router.navigateByUrl(row.route);
    }
  }

  markRowAsRead(row: NotificationRow): void {
    if (row.read) return;

    this.notificationService.markAsRead(row.id);
    this.notifications.update(rows =>
      rows.map(item => item.id === row.id ? { ...item, read: true } : item),
    );
  }

  private resolvedSortDirection(): 'asc' | 'desc' {
    return this.dateSort() === 'asc' ? 'asc' : 'desc';
  }

  private toRow(notification: AppNotification): NotificationRow {
    return {
      id: notification.id ?? 0,
      title: notification.title,
      message: notification.message,
      application: this.applicationLabel(notification),
      status: this.statusLabel(notification),
      statusClass: this.statusClass(notification),
      read: notification.read,
      createdAt: this.formatDisplayDate(notification.createdAt),
      route: typeof notification.data?.['route'] === 'string'
        ? notification.data['route'] as string
        : null,
      isExpired: notification.status === 'expired',
      source: notification,
    };
  }

  private applicationLabel(notification: AppNotification): string {
    const moduleValue = String(notification.data?.entityModule ?? '').toLowerCase();
    const typeValue = notification.data?.entityType;

    const labels: Record<string, string> = {
      rdig: 'RDIG Application',
      conference: 'Conference Application',
      journal: 'Journal Publication',
      ragra: 'RA/GRA Application',
      partnership: 'Partnership Application',
      'travel-authorization': 'Travel Authorization',
      proposal: 'Proposal Application',
    };

    return labels[moduleValue] || (typeof typeValue === 'string' ? typeValue : notification.scope);
  }

  private statusLabel(notification: AppNotification): string {
    const bucket = this.statusBucket(notification);
    if (bucket === 'required_action') return 'Required Action';
    if (bucket === 'rejected') return 'Rejected';
    if (bucket === 'approved') return 'Approved';
    if (notification.status === 'expired') return 'Expired';
    if (bucket === 'reminder') return 'Reminder';
    if (bucket === 'info') return 'Info';
    if (bucket === 'alert') return 'Alert';
    return notification.type.charAt(0) + notification.type.slice(1).toLowerCase();
  }

  private statusClass(notification: AppNotification): string {
    const bucket = this.statusBucket(notification);
    if (bucket === 'required_action') return 'is-action';
    if (bucket === 'rejected') return 'is-rejected';
    if (bucket === 'approved') return 'is-approved';
    if (notification.status === 'expired') return 'is-expired';
    if (bucket === 'reminder') return 'is-reminder';
    if (bucket === 'alert') return 'is-alert';
    return 'is-info';
  }

  private statusBucket(notification: AppNotification): string {
    const haystack = `${notification.key} ${notification.title}`.toLowerCase();
    if (notification.type === 'ACTION') return 'required_action';
    if (haystack.includes('reject')) return 'rejected';
    if (haystack.includes('approv')) return 'approved';
    return notification.type.toLowerCase();
  }

  private formatDisplayDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

