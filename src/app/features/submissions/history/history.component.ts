import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
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
  private appSvc = inject(ApplicationService);
  private auth = inject(AuthService);
  private tableSort = inject(TableSortService);
  private raw = signal<any[]>([]);
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
  private readonly currentUserName = this.auth.currentUser()?.name ?? '';
  private readonly currentUserId = this.auth.currentUser()?.id ?? '';
  readonly availableTypes = computed(() => [
    'all',
    ...Array.from(
      new Set(
        this.raw()
          .map((a) => a.formType ?? '')
          .filter(Boolean),
      ),
    ).sort(),
  ]);
  readonly history = computed(() => {
    const q = this.searchQuery().toLowerCase().trim(),
      type = this.selectedType();
    const items = this.raw()
      .filter((app) => type === 'all' || (app.formType ?? '') === type)
      .filter((app) => !q || this.appSvc.getTitle(app).toLowerCase().includes(q));
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
    this.appSvc
      .getApplicationHistory()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (apps) => this.raw.set(apps),
        error: () =>
          this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.'),
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
  private submittedTime(app: any): number {
    return new Date(this.appSvc.getSubmittedAt(app) ?? 0).getTime();
  }
  private completedTime(app: any): number {
    const h: any[] = app.workflow?.history ?? [];
    return h.length ? new Date(h[h.length - 1].timestamp).getTime() : 0;
  }
  formatSubmissionDate = (app: any) => this.appSvc.formatDate(this.appSvc.getSubmittedAt(app));
  formatCompletedDate(app: any): string {
    const h: any[] = app.workflow?.history ?? [];
    return this.appSvc.formatDate(h.length ? h[h.length - 1].timestamp : null);
  }
  isApplicant(app: any): boolean {
    return (
      app.metadata?.applicantUserId === this.currentUserId ||
      (app.teamDetails?.leaderName ?? '') === this.currentUserName
    );
  }
  myAction(app: any): { action: string; timestamp: string; role: string } | null {
    return this.appSvc.getUserAction(app, this.currentUserName);
  }
  getActionLabel(app: any): string {
    if (this.isApplicant(app)) return this.getFinalDecision(app);
    const a = this.myAction(app);
    return a ? a.action.charAt(0).toUpperCase() + a.action.slice(1).replace(/_/g, ' ') : '—';
  }
  getActionClass(app: any): string {
    const label = this.getActionLabel(app).toLowerCase();
    if (label === 'approved' || label === 'approve' || label === 'submit')
      return 'action-chip--approve';
    if (label === 'rejected' || label.startsWith('reject')) return 'action-chip--reject';
    return 'action-chip--neutral';
  }
  getRoleLabel(app: any): string {
    return this.isApplicant(app) ? 'Applicant' : (this.myAction(app)?.role ?? '—');
  }
  private getFinalDecision(app: any): string {
    const status = this.appSvc.getStatus(app);
    return status === 'approved' ? 'Approved' : status.startsWith('rejected_') ? 'Rejected' : '—';
  }
  getFormTypeLabel = (app: any) => this.appSvc.getFormTypeLabel(app);
  getFormRoute = (app: any) => this.appSvc.getFormRoute(app);
  getSubmittedBy = (app: any) => app.teamDetails?.leaderName ?? '—';
}
