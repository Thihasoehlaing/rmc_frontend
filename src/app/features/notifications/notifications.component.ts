import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../core/interfaces/components.interface';
import { AppNotification } from '../../core/interfaces/notification.interface';
import { FormCacheService } from '../../core/services/form-cache.service';
import {
  NotificationListParams,
  NotificationService,
} from '../../core/services/notification.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../shared/components/searchable-dropdown/searchable-dropdown.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../shared/components/table-action-icon/table-action-icon.component';
import { formatDisplayDate } from '../../shared/utils/date-time.util';

interface NotificationRow {
  id: number;
  requestCode: string;
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

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchableDropdownComponent,
    TableSkeletonComponent,
    PaginationComponent,
    TableActionIconComponent,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly formCache = inject(FormCacheService);
  private readonly router = inject(Router);

  readonly codeDraft = signal('');
  readonly formDraft = signal('');
  readonly receivedDateDraft = signal('');
  readonly codeFilter = signal('');
  readonly formFilter = signal('');
  readonly receivedDateFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 30, 50];
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly notifications = signal<NotificationRow[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly formOptions = signal<DropdownOption<string>[]>([]);
  readonly formOptionsLoading = signal(false);

  readonly skeletonColumns: readonly SkeletonColumn[] = [
    { width: '72px' },
    { width: '120px' },
    { width: '170px' },
    { width: '36%' },
    { width: '120px' },
    { width: '150px' },
    { width: '110px' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as NotificationRow).id;

  ngOnInit(): void {
    this.loadFormOptions();
    this.loadNotifications();
  }

  loadFormOptions(): void {
    this.formOptionsLoading.set(true);
    this.formCache
      .getActiveForms()
      .pipe(finalize(() => this.formOptionsLoading.set(false)))
      .subscribe({
        next: response => {
          this.formOptions.set(
            (response.data ?? [])
              .map(form => ({
                value: form.form_code,
                label: form.form_name || form.form_code,
                description: form.form_code,
                searchText: `${form.form_code} ${form.form_name}`.toLowerCase(),
              })),
          );
        },
        error: () => this.formOptions.set([]),
      });
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    const params: NotificationListParams = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.codeFilter(),
      formCode: this.formFilter(),
      dateFrom: this.receivedDateFilter(),
      dateTo: this.receivedDateFilter(),
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

  onCodeDraftChange(event: Event): void {
    this.codeDraft.set((event.target as HTMLInputElement).value);
  }

  onFormDraftChange(value: string | string[] | null): void {
    this.formDraft.set(typeof value === 'string' ? value : '');
  }

  onReceivedDateDraftChange(event: Event): void {
    this.receivedDateDraft.set((event.target as HTMLInputElement).value);
  }

  applyFilters(): void {
    this.codeFilter.set(this.codeDraft().trim());
    this.formFilter.set(this.formDraft());
    this.receivedDateFilter.set(this.receivedDateDraft());
    this.page.set(1);
    this.loadNotifications();
  }

  resetFilters(): void {
    this.codeDraft.set('');
    this.formDraft.set('');
    this.receivedDateDraft.set('');
    this.codeFilter.set('');
    this.formFilter.set('');
    this.receivedDateFilter.set('');
    this.page.set(1);
    this.loadNotifications();
  }

  hasActiveFilters(): boolean {
    return Boolean(this.codeFilter() || this.formFilter() || this.receivedDateFilter());
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

  private toRow(notification: AppNotification): NotificationRow {
    return {
      id: notification.id ?? 0,
      requestCode: this.requestCode(notification),
      title: notification.title,
      message: notification.message,
      application: this.applicationLabel(notification),
      status: this.statusLabel(notification),
      statusClass: this.statusClass(notification),
      read: notification.read,
      createdAt: formatDisplayDate(notification.createdAt),
      route: typeof notification.data?.['route'] === 'string'
        ? notification.data['route'] as string
        : null,
      isExpired: notification.status === 'expired',
      source: notification,
    };
  }

  getRowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  private requestCode(notification: AppNotification): string {
    const code = notification.data?.['requestCode'];
    return typeof code === 'string' && code.trim() ? code : '-';
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

}

