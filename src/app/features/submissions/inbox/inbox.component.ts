import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import { actionRoute, requestIdOf } from '../../../core/services/request-display.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { SubmissionFormTabsComponent } from '../../../shared/components/submission-form-tabs/submission-form-tabs.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    PaginationComponent,
    TableActionIconComponent,
    RouterLink,
    SubmissionsSearchComponent,
    SubmissionFormTabsComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly formCache = inject(FormCacheService);

  private allApplications = signal<RequestSummaryDto[]>([]);
  private forms = signal<CachedFormOption[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  createdDate = signal('');
  selectedForm = signal('all');
  sortDirection = signal<'asc' | 'desc'>('desc');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '72px' },
    { width: '24%' },
    { width: '14%' },
    { width: '18%' },
    { width: '18%' },
    { width: '96px' },
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

  /** Client-side code/date search on top of the backend-filtered inbox. */
  readonly applications = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const createdDate = this.createdDate();
    const form = this.selectedForm();
    const rows = this.allApplications();
    const items = rows
      .filter((app) => form === 'all' || (app.form_code ?? '').toUpperCase() === form)
      .filter((app) => !query || this.getCode(app).toLowerCase().includes(query))
      .filter((app) => !createdDate || this.dateInputValue(app.created_at) === createdDate);

    return [...items].sort((first, second) => {
      const diff = this.submittedTs(first) - this.submittedTs(second);
      return this.sortDirection() === 'asc' ? diff : -diff;
    });
  });

  readonly pagedApplications = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.applications().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.applications().length / this.pageSize())),
  );

  readonly formTabs = computed(() => {
    const tabs = this.forms()
      .filter((form) => form.is_active !== false)
      .filter((form) => form.form_code.toUpperCase() !== 'EXTERNAL')
      .map((form) => ({
        value: form.form_code.toUpperCase(),
        label: form.form_name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All' }, ...tabs];
  });

  ngOnInit(): void {
    this.loadInbox();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  onCreatedDateChange(event: Event): void {
    this.createdDate.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  setTab(tab: string): void {
    this.selectedForm.set(tab);
    this.page.set(1);
  }

  refreshInbox(): void {
    this.searchQuery.set('');
    this.createdDate.set('');
    this.setTab('all');
    this.loadInbox();
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  toggleSubmissionDateSort(): void {
    this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  private loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      requests: this.requests.getInbox({ page: 1, perPage: 100 }),
      forms: this.formCache.getForms(true),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ requests, forms }) => {
          this.allApplications.set(requests.data?.items ?? []);
          this.forms.set(forms.data ?? []);
          this.ensureValidTab();
        },
        error: () => this.error.set('Could not load your inbox. Please try again.'),
      });
  }

  getCode(app: RequestSummaryDto): string {
    return app.request_code?.trim() || `REQ-${requestIdOf(app) ?? ''}`;
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
    return this.formatIsoDate(iso);
  }

  getCreatedDate(app: RequestSummaryDto): string {
    return this.formatIsoDate(app.created_at);
  }

  getFormRoute(app: RequestSummaryDto): string {
    return actionRoute(app);
  }

  getRowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  private submittedTs(app: RequestSummaryDto): number {
    const iso = app.submitted_at ?? app.updated_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : 0;
  }

  private formatIsoDate(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';
  }

  private dateInputValue(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private ensureValidTab(): void {
    const tab = this.selectedForm();
    if (!this.formTabs().some((item) => item.value === tab)) {
      this.setTab('all');
    }
  }
}
