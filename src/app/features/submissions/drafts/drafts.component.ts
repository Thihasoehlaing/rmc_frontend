import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import { AuthService } from '../../../core/services/auth.service';
import { formRoute, formTypeLabel, requestIdOf } from '../../../core/services/request-display.util';
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

/** Statuses that represent an unsubmitted, still-editable application. */
const DRAFT_STATUSES = new Set(['draft', 'fill_application', 'normal_application']);

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [
    PaginationComponent,
    TableActionIconComponent,
    SubmissionsSearchComponent,
    SubmissionFormTabsComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.scss',
})
export class DraftsComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly formCache = inject(FormCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  private raw = signal<RequestSummaryDto[]>([]);
  private forms = signal<CachedFormOption[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deletingRequestId = signal<number | null>(null);
  searchQuery = signal('');
  createdDate = signal('');
  selectedType = signal('all');
  sortDirection = signal<'asc' | 'desc'>('desc');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly isSystemAdmin = computed(() => this.auth.inGroup('SystemAdmin'));
  readonly canDeleteDrafts = computed(() => {
    const username = this.auth.currentUser()?.username?.trim().toLowerCase();
    return this.isSystemAdmin() && username === 'thiha.hlaing';
  });

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '72px' },
    { width: '24%' },
    { width: '18%' },
    { width: '18%' },
    { width: '18%' },
    { width: '180px' },
  ];

  readonly formTabs = computed(() => {
    const tabs = this.forms()
      .filter((form) => form.form_code.toUpperCase() !== 'EXTERNAL')
      .map((form) => ({
        value: form.form_code.toLowerCase(),
        label: form.form_name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All' }, ...tabs];
  });

  readonly drafts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const createdDate = this.createdDate();
    const type = this.selectedType();
    const items = this.raw()
      .filter((app) => DRAFT_STATUSES.has((app.status_code ?? '').toLowerCase()))
      .filter((app) => (app.form_code ?? '').toUpperCase() !== 'EXTERNAL')
      .filter((app) => type === 'all' || (app.form_code ?? '').toLowerCase() === type)
      .filter((app) => !query || this.getCode(app).toLowerCase().includes(query))
      .filter((app) => !createdDate || this.dateInputValue(app.created_at) === createdDate);

    return [...items].sort((a, b) => {
      const diff = this.savedTs(a) - this.savedTs(b);
      return this.sortDirection() === 'asc' ? diff : -diff;
    });
  });

  readonly pagedDrafts = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.drafts().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.drafts().length / this.pageSize())));

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
      requests: this.requests.getMyRequests({
        page: 1,
        perPage: 100,
        admin: this.isSystemAdmin(),
      }),
      forms: this.formCache.getActiveForms(true),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ requests, forms }) => {
          this.raw.set(requests.data?.items ?? []);
          this.forms.set(forms.data ?? []);
          this.ensureValidTab();
        },
        error: () => this.error.set('Could not load your drafts. Please try again.'),
      });
  }

  toggleLastSavedSort(): void {
    this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
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

  openDraft(app: RequestSummaryDto): void {
    const requestId = requestIdOf(app);
    if (requestId == null) return;
    this.router.navigate([formRoute(app.form_code)], {
      queryParams: {
        request_id: requestId,
        ...(this.isSystemAdmin() ? { admin_view: 'true' } : {}),
      },
    });
  }

  deleteDraft(app: RequestSummaryDto): void {
    const requestId = requestIdOf(app);
    if (requestId == null || this.deletingRequestId() != null || !this.canDeleteDrafts()) return;

    const code = this.getCode(app);
    if (!confirm(`Delete draft ${code} and all related data? This cannot be undone.`)) {
      return;
    }

    this.deletingRequestId.set(requestId);
    this.error.set(null);
    this.requests
      .deleteDraftRequest(requestId)
      .pipe(finalize(() => this.deletingRequestId.set(null)))
      .subscribe({
        next: () => {
          this.raw.update((items) => items.filter((item) => requestIdOf(item) !== requestId));
          if (this.page() > this.totalPages()) {
            this.page.set(this.totalPages());
          }
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Could not delete this draft. Please try again.');
        },
      });
  }

  getOpenActionLabel(): string {
    return this.isSystemAdmin() ? 'View draft' : 'Continue draft';
  }

  getCode(app: RequestSummaryDto): string {
    return app.request_code?.trim() || `REQ-${requestIdOf(app) ?? ''}`;
  }

  getStatus(app: RequestSummaryDto): string {
    return app.status_name?.trim() || app.status_code;
  }

  getFormName(app: RequestSummaryDto): string {
    return formTypeLabel(app.form_code, app.form_name);
  }

  getRowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  formatDate(app: RequestSummaryDto): string {
    const iso = app.updated_at ?? app.created_at;
    return this.formatIsoDate(iso);
  }

  formatCreatedDate(app: RequestSummaryDto): string {
    return this.formatIsoDate(app.created_at);
  }

  private formatIsoDate(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
  }

  private savedTs(app: RequestSummaryDto): number {
    const iso = app.updated_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : 0;
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
