import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
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
import {
  STATUS_COLORS,
  formTypeLabel,
  formRoute,
} from '../../../core/services/request-display.util';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [
    TableActionIconComponent,
    RouterLink,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.scss',
  providers: [TableSortService],
})
export class PendingComponent implements OnInit {
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
    { width: '28%' },
    { width: '13%' },
    { width: '15%' },
    { width: '16%' },
    { width: '18%' },
    { width: 'var(--size-table-column-actions)' },
  ];
  readonly columns: DataTableColumn[] = [
    { key: 'title', label: 'Project Title', width: '28%' },
    { key: 'type', label: 'Type', width: '13%' },
    { key: 'submissionDate', label: 'Submission Date', width: '15%', sortable: true },
    { key: 'status', label: 'Status', width: '16%' },
    { key: 'awaiting', label: 'Awaiting', width: '18%' },
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

  readonly pending = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    const items = this.raw()
      .filter((app) => type === 'all' || (app.form_code ?? '').toUpperCase() === type)
      .filter((app) => !query || this.getTitle(app).toLowerCase().includes(query));
    if (!this.sortDirection()) return items;
    return [...items].sort((a, b) => {
      const d = this.submittedTs(a) - this.submittedTs(b);
      return this.sortDirection() === 'asc' ? d : -d;
    });
  });

  ngOnInit(): void {
    this.requests
      .getPendingRequests({ page: 1, perPage: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.raw.set(res.data?.items ?? []),
        error: () => this.error.set('Could not load your pending applications. Please try again.'),
      });
  }

  onSortChange(column: string): void {
    const next = this.tableSort.getNextState(
      { column: this.sortColumn(), direction: this.sortDirection() },
      column,
    );
    this.sortColumn.set(next.column);
    this.sortDirection.set(next.direction);
  }

  private submittedTs(app: RequestSummaryDto): number {
    const iso = app.submitted_at ?? app.updated_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : 0;
  }

  getTitle = (app: RequestSummaryDto) => app.title?.trim() || '(Untitled Application)';
  getStatusLabel = (app: RequestSummaryDto) => app.status_name || app.status_code;
  getStatusColor = (app: RequestSummaryDto) => STATUS_COLORS[app.status_code] ?? '#6b7280';
  getFormTypeLabel = (app: RequestSummaryDto) => formTypeLabel(app.form_code, app.form_name);
  getFormRoute = (app: RequestSummaryDto) => formRoute(app.form_code);
  getNextActors = (app: RequestSummaryDto) => app.current_actor_role || '—';
  formatSubmitted = (app: RequestSummaryDto) => {
    const iso = app.submitted_at ?? app.updated_at ?? app.created_at;
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  };
  isRevisionRequired = (app: RequestSummaryDto) =>
    app.status_code.startsWith('pending_applicant_resubmission');
}
