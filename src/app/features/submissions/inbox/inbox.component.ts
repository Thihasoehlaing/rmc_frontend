import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { BatchSittingService } from '../../admin-settings/batch-sitting.service';
import {
  BatchSitting,
  WORKFLOW_STAGE_META,
} from '../../../core/interfaces/batch-sitting.interface';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { finalize } from 'rxjs';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    TableActionIconComponent,
    RouterLink,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
  providers: [TableSortService],
})
export class InboxComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private batchSvc = inject(BatchSittingService);
  private tableSortService = inject(TableSortService);

  private allApplications = signal<any[]>([]);
  activeBatch = signal<BatchSitting | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  headerSortColumn = signal<string | null>(null);
  headerSortDirection = signal<SortDirection>(null);
  readonly skeletonColumns: SkeletonColumn[] = [
    { width: 'var(--size-table-column-index)' },
    { width: '42%' },
    { width: '14%' },
    { width: '18%' },
    { width: '18%' },
    { width: 'var(--size-table-column-actions)' },
  ];
  readonly inboxColumns: DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'title', label: 'Project Title', width: '42%' },
    { key: 'type', label: 'Type', width: '14%' },
    { key: 'status', label: 'Status', width: '18%' },
    { key: 'submissionDate', label: 'Submission Date', width: '18%', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  /** Badge colour per workflow status */
  readonly statusColors: Record<string, string> = {
    fill_application: '#3b82f6',
    pending_applicant_resubmission_hos: '#f59e0b',
    pending_applicant_resubmission_reviewers: '#f59e0b',
    pending_hos: '#a855f7',
    pending_hos_review: '#a855f7',
    rejected_hos: '#ef4444',
    pending_rmc: '#6366f1',
    pending_rmc_review: '#6366f1',
    rejected_rmc: '#ef4444',
    pending_reviewers: '#0ea5e9',
    pending_rdig_chair: '#10b981',
    rejected_rdig_chair: '#ef4444',
    pending_vc: '#14b8a6',
    rejected_vc: '#ef4444',
    pending_ceo: '#f97316',
    rejected_ceo: '#ef4444',
    approved: '#22c55e',
  };

  /**
   * Applications filtered by batch stage date windows.
   * An application is visible only when today falls within the allowed time
   * window for its current workflow status (as configured in the active batch).
   * Applications with no matching stage window are always visible (no restriction).
   */
  readonly applications = computed(() => {
    const batch = this.activeBatch();
    const today = new Date().toISOString().substring(0, 10);
    const query = this.searchQuery().toLowerCase().trim();

    return this.allApplications().filter((app) => {
      if (query && !this.getTitle(app).toLowerCase().includes(query)) return false;

      if (!batch) return true; // No batch config → no date restriction

      const status = this.getStatus(app);

      // Find the batch stage that governs this workflow status
      const stageMeta = WORKFLOW_STAGE_META.find((m) => m.rdigStatuses.includes(status));
      if (!stageMeta) return true; // Status not mapped to a stage → always visible

      const stageWindow = batch.stages[stageMeta.key];
      if (!stageWindow?.startDate || !stageWindow?.endDate) return true; // No window set → always visible

      return today >= stageWindow.startDate && today <= stageWindow.endDate;
    });
  });

  /** Days until the active batch endDate. Used to show deadline warning. */
  readonly batchDeadlineDays = computed((): number | null => {
    const batch = this.activeBatch();
    if (!batch) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(batch.endDate + 'T00:00:00');
    return Math.floor((end.getTime() - today.getTime()) / 86_400_000);
  });

  readonly showDeadlineWarning = computed(() => {
    const days = this.batchDeadlineDays();
    return days !== null && days >= 0 && days <= 5;
  });

  ngOnInit(): void {
    // Load active batch for date-window filtering
    this.batchSvc.loadAll().subscribe({
      next: (batches) => this.activeBatch.set(batches.find((b) => b.status === 'active') ?? null),
      error: () => this.activeBatch.set(null),
    });

    // Filtering is done server-side for roles, then client-side for date windows.
    this.loading.set(true);
    this.applicationService
      .getInboxApplications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (apps) => {
          this.allApplications.set(apps);
        },
        error: () => {
          this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        },
      });
  }

  getTitle(app: any): string {
    return app.projectDetails?.title?.trim() || '(Untitled Application)';
  }

  getStatus(app: any): string {
    return app.workflow?.currentStatus ?? app.metadata?.applicationStatus ?? 'unknown';
  }

  getStatusColor(app: any): string {
    return this.statusColors[this.getStatus(app)] ?? '#6b7280';
  }

  getSubmissionDate(app: any): string {
    return this.applicationService.formatDate(this.applicationService.getSubmittedAt(app));
  }

  getFormRoute(app: any): string {
    return this.applicationService.getFormRoute(app);
  }

  getFormTypeLabel(app: any): string {
    return this.applicationService.getFormTypeLabel(app);
  }

  /** Sort only by the original application submission date. */
  onHeaderClick(columnName: string): void {
    if (columnName !== 'submissionDate') return;
    const next = this.tableSortService.getNextState(
      { column: this.headerSortColumn(), direction: this.headerSortDirection() },
      columnName,
    );
    this.headerSortColumn.set(next.column);
    this.headerSortDirection.set(next.direction);
  }

  getSortedApplications(): any[] {
    const direction = this.headerSortDirection();
    if (this.headerSortColumn() !== 'submissionDate' || !direction) {
      return this.applications();
    }

    return [...this.applications()].sort((first, second) => {
      const firstTimestamp = this.applicationService.getSubmittedAt(first);
      const secondTimestamp = this.applicationService.getSubmittedAt(second);

      if (!firstTimestamp && !secondTimestamp) return 0;
      if (!firstTimestamp) return 1;
      if (!secondTimestamp) return -1;

      const difference = new Date(firstTimestamp).getTime() - new Date(secondTimestamp).getTime();
      return direction === 'asc' ? difference : -difference;
    });
  }
}
