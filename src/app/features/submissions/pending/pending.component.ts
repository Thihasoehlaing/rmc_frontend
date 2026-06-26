import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService, TERMINAL_STATUSES } from '../../../core/services/application.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { finalize } from 'rxjs';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

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
  private appSvc = inject(ApplicationService);
  private tableSort = inject(TableSortService);
  private raw = signal<any[]>([]);
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
    ...Array.from(
      new Set(
        this.raw()
          .filter(
            (app) =>
              app.isDraft !== true &&
              !TERMINAL_STATUSES.has(this.appSvc.getStatus(app)) &&
              this.appSvc.getStatus(app) !== 'fill_application',
          )
          .map((app) => app.formType ?? '')
          .filter(Boolean),
      ),
    ).sort(),
  ]);
  readonly pending = computed(() => {
    const query = this.searchQuery().toLowerCase().trim(),
      type = this.selectedType();
    const items = this.raw()
      .filter((app) => {
        const status = this.appSvc.getStatus(app),
          nextRoles: string[] = app.workflow?.nextRoles ?? [];
        return (
          app.isDraft !== true &&
          !TERMINAL_STATUSES.has(status) &&
          status !== 'fill_application' &&
          !nextRoles.includes('Applicant') &&
          (type === 'all' || (app.formType ?? '') === type)
        );
      })
      .filter((app) => !query || this.appSvc.getTitle(app).toLowerCase().includes(query));
    if (!this.sortDirection()) return items;
    return [...items].sort((a, b) => {
      const d =
        new Date(this.appSvc.getSubmittedAt(a) ?? 0).getTime() -
        new Date(this.appSvc.getSubmittedAt(b) ?? 0).getTime();
      return this.sortDirection() === 'asc' ? d : -d;
    });
  });
  ngOnInit(): void {
    this.appSvc
      .getMyApplications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (apps) => this.raw.set(apps),
        error: () =>
          this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.'),
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
  getStatusLabel = (app: any) => this.appSvc.getStatusLabel(app);
  getStatusColor = (app: any) => this.appSvc.getStatusColor(app);
  getFormTypeLabel = (app: any) => this.appSvc.getFormTypeLabel(app);
  getFormRoute = (app: any) => this.appSvc.getFormRoute(app);
  getNextActors(app: any): string {
    const roles: string[] = app.workflow?.nextRoles ?? [];
    return roles.length ? roles.join(', ') : '—';
  }
  formatSubmitted = (app: any) => this.appSvc.formatDate(this.appSvc.getSubmittedAt(app));
  isRevisionRequired = (app: any) =>
    this.appSvc.getStatus(app).startsWith('pending_applicant_resubmission');
}
