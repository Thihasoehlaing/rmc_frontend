import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { MailLog, MonitoringService, StaffSyncLog } from './monitoring.service';

type MonitoringTab = 'mail-logs' | 'staff-sync-logs';

interface MonitoringTabConfig {
  key: MonitoringTab;
  label: string;
  title: string;
  description: string;
  emptyIcon: string;
  columns: readonly DataTableColumn[];
}

const MAIL_LOG_COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'request', label: 'Request', width: '180px' },
  { key: 'recipient', label: 'Recipient', width: '300px' },
  { key: 'status', label: 'Status', width: '130px', align: 'center', headerAlign: 'center' },
  { key: 'dingdong', label: 'DingDong', width: '130px', align: 'center', headerAlign: 'center' },
  { key: 'created', label: 'Created', width: '190px' },
  { key: 'sent', label: 'Sent', width: '190px' },
  { key: 'error', label: 'Error', width: '320px' },
];

const STAFF_SYNC_COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'source', label: 'Source', width: '180px' },
  { key: 'status', label: 'Status', width: '130px', align: 'center', headerAlign: 'center' },
  { key: 'totals', label: 'Totals', width: '240px' },
  { key: 'triggeredBy', label: 'Triggered By', width: '180px' },
  { key: 'started', label: 'Started', width: '190px' },
  { key: 'completed', label: 'Completed', width: '190px' },
  { key: 'error', label: 'Error', width: '320px' },
];

const TABS: readonly MonitoringTabConfig[] = [
  {
    key: 'mail-logs',
    label: 'Mail Logs',
    title: 'Notification Mail Logs',
    description: 'Read-only DingDong delivery attempts for request notifications.',
    emptyIcon: 'mark_email_read',
    columns: MAIL_LOG_COLUMNS,
  },
  {
    key: 'staff-sync-logs',
    label: 'Staff Sync Logs',
    title: 'Staff Sync Logs',
    description: 'Read-only APSPACE staff directory synchronization results.',
    emptyIcon: 'sync',
    columns: STAFF_SYNC_COLUMNS,
  },
];

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, PaginationComponent, TableSkeletonComponent],
  templateUrl: './monitoring.component.html',
  styleUrls: ['../forms/forms.component.scss', '../workflow/workflow.component.scss', './monitoring.component.scss'],
})
export class MonitoringComponent implements OnInit {
  private readonly monitoringService = inject(MonitoringService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs = TABS;
  readonly activeTab = signal<MonitoringTab>('mail-logs');
  readonly pageSizeOptions = [10, 15, 30, 50];

  readonly searchTerm = signal('');
  readonly selectedStatus = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly requestCode = signal('');
  readonly syncSource = signal('');
  readonly triggeredBy = signal('');

  readonly mailLogs = signal<MailLog[]>([]);
  readonly staffSyncLogs = signal<StaffSyncLog[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);

  readonly rowTrackFn: TrackByFunction<unknown> = (index, row) =>
    (row as { id?: number })?.id ?? index;

  get activeTabConfig(): MonitoringTabConfig {
    return this.tabs.find(tab => tab.key === this.activeTab()) ?? this.tabs[0];
  }

  ngOnInit(): void {
    const initialTab = this.tabFromQueryParam(this.route.snapshot.queryParamMap.get('tab'));
    if (this.route.snapshot.queryParamMap.get('tab') !== initialTab) {
      this.updateUrlTab(initialTab, true);
    }

    this.route.queryParamMap.subscribe(params => {
      const tab = this.tabFromQueryParam(params.get('tab'));
      if (tab !== this.activeTab()) {
        this.activeTab.set(tab);
        this.resetFilters(false);
      }
      this.loadRows();
    });
  }

  setTab(tab: MonitoringTab): void {
    if (tab === this.activeTab()) return;
    this.updateUrlTab(tab);
  }

  activeColumns(): readonly DataTableColumn[] {
    return this.activeTabConfig.columns;
  }

  rows(): readonly (MailLog | StaffSyncLog)[] {
    return this.activeTab() === 'mail-logs' ? this.mailLogs() : this.staffSyncLogs();
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  search(): void {
    this.page.set(1);
    this.loadRows();
  }

  resetFilters(load = true): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.requestCode.set('');
    this.syncSource.set('');
    this.triggeredBy.set('');
    this.page.set(1);
    this.totalItems.set(0);
    this.totalPages.set(1);
    if (load) this.loadRows();
  }

  onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadRows();
  }

  onPageSizeChange(nextSize: number): void {
    this.pageSize.set(nextSize);
    this.page.set(1);
    this.loadRows();
  }

  loadRows(): void {
    const query = {
      page: this.page(),
      perPage: this.pageSize(),
      search: this.searchTerm(),
      status: this.selectedStatus(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      requestCode: this.requestCode(),
      syncSource: this.syncSource(),
      triggeredBy: this.triggeredBy(),
    };

    this.isLoading.set(true);
    this.loadFailed.set(false);

    if (this.activeTab() === 'mail-logs') {
      this.monitoringService
        .listMailLogs(query)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: response => {
            this.mailLogs.set(response.data.items ?? []);
            this.totalItems.set(response.data.pagination?.total_items ?? 0);
            this.totalPages.set(Math.max(1, response.data.pagination?.total_pages ?? 1));
          },
          error: () => this.handleLoadError(),
        });
      return;
    }

    this.monitoringService
      .listStaffSyncLogs(query)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
          this.staffSyncLogs.set(response.data.items ?? []);
          this.totalItems.set(response.data.pagination?.total_items ?? 0);
          this.totalPages.set(Math.max(1, response.data.pagination?.total_pages ?? 1));
        },
        error: () => this.handleLoadError(),
      });
  }

  statusBadgeClass(status: string | null | undefined): string {
    const normalized = (status || '').toUpperCase();
    if (['FAILED', 'ERROR'].includes(normalized)) return 'status-badge status-badge--danger';
    if (['PENDING', 'RUNNING', 'SKIPPED'].includes(normalized)) return 'status-badge status-badge--warning';
    return 'status-badge';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  mailRow(row: MailLog | StaffSyncLog): MailLog {
    return row as MailLog;
  }

  staffRow(row: MailLog | StaffSyncLog): StaffSyncLog {
    return row as StaffSyncLog;
  }

  private tabFromQueryParam(value: string | null): MonitoringTab {
    return this.tabs.find(tab => tab.key === value)?.key ?? 'mail-logs';
  }

  private updateUrlTab(tab: MonitoringTab, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  private handleLoadError(): void {
    this.loadFailed.set(true);
    if (this.activeTab() === 'mail-logs') {
      this.mailLogs.set([]);
    } else {
      this.staffSyncLogs.set([]);
    }
    this.totalItems.set(0);
    this.totalPages.set(1);
  }
}
