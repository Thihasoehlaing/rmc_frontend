import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import { formTypeLabel, formRoute } from '../../../core/services/request-display.util';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    TableActionIconComponent,
    RouterLink,
    NgClass,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  providers: [TableSortService],
})
export class HistoryComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly tableSort = inject(TableSortService);
  private raw = signal<RequestSummaryDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedType = signal('all');
  sortColumn = signal<string | null>(null);
  sortDirection = signal<SortDirection>(null);

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '22%' },
    { width: '10%' },
    { width: '13%' },
    { width: '13%' },
    { width: '10%' },
    { width: '12%' },
    { width: '12%' },
    { width: 'var(--size-table-column-actions)' },
  ];
  readonly columns: DataTableColumn[] = [
    { key: 'title', label: 'Project Title', width: '22%' },
    { key: 'type', label: 'Type', width: '10%' },
    { key: 'submittedBy', label: 'Submitted By', width: '13%' },
    { key: 'decision', label: 'Action / Decision', width: '13%' },
    { key: 'role', label: 'Role', width: '10%' },
    { key: 'submissionDate', label: 'Submission Date', width: '12%', sortable: true },
    { key: 'completedDate', label: 'Completed Date', width: '12%', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly availableTypes = computed(() => [
    'all',
    ...Array.from(new Set(this.raw().map((a) => (a.form_code ?? '').toUpperCase()).filter(Boolean))).sort(),
  ]);

  readonly history = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    const items = this.raw()
      .filter((app) => type === 'all' || (app.form_code ?? '').toUpperCase() === type)
      .filter((app) => !q || this.getTitle(app).toLowerCase().includes(q));
    if (!this.sortColumn() || !this.sortDirection()) return items;
    return [...items].sort((a, b) => {
      const getter =
        this.sortColumn() === 'submissionDate'
          ? this.submittedTime.bind(this)
          : this.completedTime.bind(this);
      const d = getter(a) - getter(b);
      return this.sortDirection() === 'asc' ? d : -d;
    });
  });

  ngOnInit(): void {
    this.requests
      .getHistoryRequests({ page: 1, perPage: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.raw.set(res.data?.items ?? []),
        error: () => this.error.set('Could not load your history. Please try again.'),
      });
  }

  onSortChange(column: string): void {
    if (column !== 'submissionDate' && column !== 'completedDate') return;
    const next = this.tableSort.getNextState(
      { column: this.sortColumn(), direction: this.sortDirection() },
      column,
    );
    this.sortColumn.set(next.column);
    this.sortDirection.set(next.direction);
  }

  private submittedTime(app: RequestSummaryDto): number {
    return app.submitted_at ? new Date(app.submitted_at).getTime() : 0;
  }
  private completedTime(app: RequestSummaryDto): number {
    return app.updated_at ? new Date(app.updated_at).getTime() : 0;
  }

  getTitle = (app: RequestSummaryDto) => app.title?.trim() || '(Untitled Application)';
  getFormTypeLabel = (app: RequestSummaryDto) => formTypeLabel(app.form_code, app.form_name);
  getFormRoute = (app: RequestSummaryDto) => formRoute(app.form_code);
  getSubmittedBy = (app: RequestSummaryDto) => app.applicant_name || '—';

  formatSubmissionDate = (app: RequestSummaryDto) => this.fmt(app.submitted_at);
  formatCompletedDate = (app: RequestSummaryDto) => this.fmt(app.updated_at);

  private fmt(iso: string | null): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  }

  private prettify(code: string | null | undefined): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  /** The decision shown for a completed request: final outcome, else the most recent action. */
  getActionLabel(app: RequestSummaryDto): string {
    if (app.status_code === 'approved') return 'Approved';
    if (app.status_code.startsWith('rejected')) return 'Rejected';
    return this.prettify(app.last_action?.action_code);
  }

  getActionClass(app: RequestSummaryDto): string {
    const label = this.getActionLabel(app).toLowerCase();
    if (label === 'approved' || label === 'approve' || label === 'submit') return 'action-chip--approve';
    if (label === 'rejected' || label.startsWith('reject')) return 'action-chip--reject';
    return 'action-chip--neutral';
  }

  /** The role that took the most recent action, or who it's currently with. */
  getRoleLabel(app: RequestSummaryDto): string {
    return this.prettify(app.last_action?.actor_type_code ?? app.current_actor_role);
  }
}
