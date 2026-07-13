import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import { STATUS_COLORS, formTypeLabel } from '../../../core/services/request-display.util';
import {
  RequestSummaryDto,
  WorkflowRequestsService,
} from '../../../core/services/workflow-requests.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { SubmissionFormTabsComponent } from '../../../shared/components/submission-form-tabs/submission-form-tabs.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [
    PaginationComponent,
    RouterLink,
    SubmissionsSearchComponent,
    SubmissionFormTabsComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.scss',
})
export class PendingComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly formCache = inject(FormCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private raw = signal<RequestSummaryDto[]>([]);
  private forms = signal<CachedFormOption[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  createdDate = signal('');
  selectedType = signal('all');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '72px' },
    { width: '24%' },
    { width: '18%' },
    { width: '18%' },
    { width: '96px' },
  ];

  readonly formTabs = computed(() => {
    const tabs = this.forms()
      .filter((form) => form.is_active !== false)
      .filter((form) => form.form_code.toUpperCase() !== 'EXTERNAL')
      .map((form) => ({
        value: form.form_code.toLowerCase(),
        label: form.form_name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All' }, ...tabs];
  });

  readonly pending = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const createdDate = this.createdDate();
    const type = this.selectedType();
    const items = this.raw()
      .filter((app) => (app.form_code ?? '').toUpperCase() !== 'EXTERNAL')
      .filter((app) => type === 'all' || (app.form_code ?? '').toLowerCase() === type)
      .filter((app) => !query || this.getCode(app).toLowerCase().includes(query))
      .filter((app) => !createdDate || this.dateInputValue(app.created_at) === createdDate);

    return [...items].sort((a, b) => this.createdTs(b) - this.createdTs(a));
  });

  readonly pagedPending = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.pending().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.pending().length / this.pageSize())));

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const tab = (params.get('tab') ?? 'all').toLowerCase();
        this.selectedType.set(tab);
        if (!params.has('tab')) {
          this.setTab(tab);
        }
      });

    forkJoin({
      requests: this.requests.getPendingRequests({ page: 1, perPage: 100 }),
      forms: this.formCache.getForms(true),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ requests, forms }) => {
          this.raw.set(requests.data?.items ?? []);
          this.forms.set(forms.data ?? []);
          this.ensureValidTab();
        },
        error: () => this.error.set('Could not load your pending applications. Please try again.'),
      });
  }

  setTab(tab: string): void {
    this.selectedType.set(tab);
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  onCreatedDateChange(event: Event): void {
    this.createdDate.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.createdDate.set('');
    this.page.set(1);
    this.setTab('all');
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  getRowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  getCode(app: RequestSummaryDto): string {
    return app.request_code?.trim() || 'Pending request';
  }

  getStatusLabel(app: RequestSummaryDto): string {
    return app.status_name || app.status_code;
  }

  getStatusColor(app: RequestSummaryDto): string {
    return STATUS_COLORS[app.status_code] ?? '#6b7280';
  }

  getFormTypeLabel(app: RequestSummaryDto): string {
    return formTypeLabel(app.form_code, app.form_name);
  }

  getDetailRoute(app: RequestSummaryDto): string {
    const code = encodeURIComponent(this.getCode(app));
    switch ((app.form_code ?? '').toUpperCase()) {
      case 'RDIG':
        return `/rdig/detail/${code}`;
      case 'CONFERENCE':
        return `/conference/detail/${code}`;
      case 'JOURNAL':
        return `/journal/detail/${code}`;
      default:
        return `/submissions/detail/${code}`;
    }
  }

  getDetailQueryParams(): { returnTo: string; returnLabel: string } {
    const tab = encodeURIComponent(this.selectedType());
    return {
      returnTo: `/submissions/pending?tab=${tab}`,
      returnLabel: 'Pending',
    };
  }

  formatCreatedDate(app: RequestSummaryDto): string {
    return this.formatIsoDate(app.created_at);
  }

  private createdTs(app: RequestSummaryDto): number {
    const iso = app.created_at;
    return iso ? new Date(iso).getTime() : 0;
  }

  private formatIsoDate(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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
    const tab = this.selectedType();
    if (!this.formTabs().some((item) => item.value === tab)) {
      this.setTab('all');
    }
  }
}
