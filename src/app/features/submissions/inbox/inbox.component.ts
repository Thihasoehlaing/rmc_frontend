import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import { actionRoute, formTypeLabel } from '../../../core/services/request-display.util';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { SubmissionFormTabsComponent } from '../../../shared/components/submission-form-tabs/submission-form-tabs.component';
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
    SubmissionFormTabsComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
  providers: [TableSortService],
})
export class InboxComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly tableSortService = inject(TableSortService);

  private allApplications = signal<RequestSummaryDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedForm = signal('all');
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

  /** Badge colour per workflow status code. */
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

  /** Client-side title search on top of the backend-filtered inbox. */
  readonly applications = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const form = this.selectedForm();
    const rows = this.allApplications();
    return rows
      .filter((app) => form === 'all' || (app.form_code ?? '').toUpperCase() === form)
      .filter((app) => !query || this.getTitle(app).toLowerCase().includes(query));
  });

  readonly formTabs = computed(() => [
    { value: 'all', label: 'All' },
    ...Array.from(
      new Set(this.allApplications().map((app) => (app.form_code ?? '').toUpperCase()).filter(Boolean)),
    )
      .filter((code) => code !== 'EXTERNAL')
      .sort()
      .map((code) => ({ value: code, label: formTypeLabel(code) })),
  ]);

  ngOnInit(): void {
    this.loadInbox();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  refreshInbox(): void {
    this.searchQuery.set('');
    this.loadInbox();
  }

  private loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);

    this.requests
      .getInbox({ page: 1, perPage: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.allApplications.set(res.data?.items ?? []),
        error: () => this.error.set('Could not load your inbox. Please try again.'),
      });
  }

  getTitle(app: RequestSummaryDto): string {
    return app.title?.trim() || '(Untitled Application)';
  }

  /** Human-readable status name shown in the badge. */
  getStatus(app: RequestSummaryDto): string {
    return app.status_name || app.status_code || 'Unknown';
  }

  getStatusColor(app: RequestSummaryDto): string {
    return this.statusColors[app.status_code] ?? '#6b7280';
  }

  getSubmissionDate(app: RequestSummaryDto): string {
    const iso = app.submitted_at ?? app.updated_at ?? app.created_at;
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getFormRoute(app: RequestSummaryDto): string {
    return actionRoute(app);
  }

  getFormTypeLabel(app: RequestSummaryDto): string {
    const labels: Record<string, string> = {
      RDIG: 'RDIG',
      CONFERENCE: 'Conference',
      JOURNAL: 'Journal',
      EXTERNAL: 'External',
    };
    const code = (app.form_code ?? '').toUpperCase();
    return labels[code] ?? app.form_name ?? code ?? '—';
  }

  /** Sort only by the submission date. */
  onHeaderClick(columnName: string): void {
    if (columnName !== 'submissionDate') return;
    const next = this.tableSortService.getNextState(
      { column: this.headerSortColumn(), direction: this.headerSortDirection() },
      columnName,
    );
    this.headerSortColumn.set(next.column);
    this.headerSortDirection.set(next.direction);
  }

  private submittedTs(app: RequestSummaryDto): number | null {
    const iso = app.submitted_at ?? app.updated_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : null;
  }

  getSortedApplications(): RequestSummaryDto[] {
    const direction = this.headerSortDirection();
    if (this.headerSortColumn() !== 'submissionDate' || !direction) {
      return this.applications();
    }
    return [...this.applications()].sort((first, second) => {
      const a = this.submittedTs(first);
      const b = this.submittedTs(second);
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return direction === 'asc' ? a - b : b - a;
    });
  }
}
