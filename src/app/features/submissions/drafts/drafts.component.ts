import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import { formRoute } from '../../../core/services/request-display.util';
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

/** Statuses that represent an unsubmitted, still-editable application. */
const DRAFT_STATUSES = new Set(['draft', 'fill_application', 'normal_application']);

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [
    TableActionIconComponent,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.scss',
  providers: [TableSortService],
})
export class DraftsComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly router = inject(Router);
  private readonly tableSort = inject(TableSortService);

  private raw = signal<RequestSummaryDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedType = signal('all');
  sortColumn = signal<string | null>(null);
  sortDirection = signal<SortDirection>(null);

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '55%' },
    { width: '25%' },
    { width: 'var(--size-table-column-actions)' },
  ];
  readonly columns: DataTableColumn[] = [
    { key: 'title', label: 'Project Title', width: '55%' },
    { key: 'lastSaved', label: 'Last Saved', width: '25%', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly drafts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    const items = this.raw()
      .filter((app) => DRAFT_STATUSES.has(app.status_code))
      .filter((app) => type === 'all' || (app.form_code ?? '').toUpperCase() === type)
      .filter((app) => !query || this.getTitle(app).toLowerCase().includes(query));
    if (!this.sortDirection()) return items;
    return [...items].sort((a, b) => {
      const d = this.savedTs(a) - this.savedTs(b);
      return this.sortDirection() === 'asc' ? d : -d;
    });
  });

  readonly availableTypes = computed(() => [
    'all',
    ...Array.from(new Set(this.raw().map((a) => (a.form_code ?? '').toUpperCase()).filter(Boolean)))
      .filter((code) => code !== 'EXTERNAL')
      .sort(),
  ]);

  ngOnInit(): void {
    this.requests
      .getMyRequests({ page: 1, perPage: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.raw.set(res.data?.items ?? []),
        error: () => this.error.set('Could not load your drafts. Please try again.'),
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

  openDraft(app: RequestSummaryDto): void {
    this.router.navigate([formRoute(app.form_code)], { queryParams: { id: app.id } });
  }

  getTitle(app: RequestSummaryDto): string {
    return app.title?.trim() || '(Untitled Draft)';
  }

  private savedTs(app: RequestSummaryDto): number {
    const iso = app.updated_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : 0;
  }

  formatDate(app: RequestSummaryDto): string {
    const iso = app.updated_at ?? app.created_at;
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  }
}
