import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  STATUS_COLORS,
  formRoute,
  formTypeLabel,
  requestIdOf,
} from '../../../core/services/request-display.util';
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
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    NgClass,
    PaginationComponent,
    RouterLink,
    SubmissionsSearchComponent,
    SubmissionFormTabsComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
    DialogComponent,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly auth = inject(AuthService);
  private readonly formCache = inject(FormCacheService);
  private readonly toast = inject(ToastService);
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
  rollbackRequestId = signal<number | null>(null);
  rollbackTarget = signal<RequestSummaryDto | null>(null);
  rollbackReason = signal('');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly isAdminHistory = computed(
    () => this.route.snapshot.routeConfig?.path === 'admin-history',
  );
  readonly showExternalProjectColumns = computed(
    () => this.isAdminHistory() && this.selectedType() === 'external',
  );
  readonly searchPlaceholder = computed(() => {
    if (!this.isAdminHistory()) return 'Search by code';
    return this.showExternalProjectColumns()
      ? 'Search by code, applicant, project leader or account code'
      : 'Search by code or applicant';
  });

  readonly skeletonColumns = computed<SkeletonColumn[]>(() => [
    { width: '72px' },
    { width: '24%' },
    ...(this.isAdminHistory() ? [{ width: '18%' }] : []),
    ...(this.showExternalProjectColumns() ? [{ width: '18%' }, { width: '16%' }] : []),
    { width: '18%' },
    { width: '18%' },
    { width: '96px' },
  ]);

  readonly formTabs = computed(() => {
    const includeExternal = this.isAdminHistory();
    const tabs = this.forms()
      .filter((form) => includeExternal || form.form_code.toUpperCase() !== 'EXTERNAL')
      .map((form) => ({
        value: form.form_code.toLowerCase(),
        label: form.form_name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All' }, ...tabs];
  });

  readonly history = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const createdDate = this.createdDate();
    const type = this.selectedType();
    const includeExternal = this.isAdminHistory();
    const items = this.raw()
      .filter((app) => includeExternal || (app.form_code ?? '').toUpperCase() !== 'EXTERNAL')
      .filter((app) => type === 'all' || (app.form_code ?? '').toLowerCase() === type)
      .filter((app) => !query || this.matchesSearch(app, query))
      .filter((app) => !createdDate || this.dateInputValue(app.created_at) === createdDate);

    return [...items].sort((a, b) => this.completedTs(b) - this.completedTs(a));
  });

  readonly pagedHistory = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.history().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.history().length / this.pageSize())),
  );

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = (params.get('tab') ?? 'all').toLowerCase();
      this.selectedType.set(tab);
      if (!params.has('tab')) {
        this.setTab(tab);
      }
    });

    this.loadHistory();
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.error.set(null);
    const list$ = this.isAdminHistory()
      ? this.requests.getAdminHistory({ page: 1, perPage: 100 })
      : this.requests.getHistoryRequests({ page: 1, perPage: 100 });

    forkJoin({
      requests: list$,
      forms: this.formCache.getActiveForms(true),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ requests, forms }) => {
          this.raw.set(requests.data?.items ?? []);
          this.forms.set(forms.data ?? []);
          this.ensureValidTab();
        },
        error: () => this.error.set('Could not load your history. Please try again.'),
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
    return app.request_code?.trim() || 'History request';
  }

  getStatusLabel(app: RequestSummaryDto): string {
    return app.status_name || app.status_code;
  }

  getStatusColor(app: RequestSummaryDto): string {
    return STATUS_COLORS[app.status_code] ?? '#6b7280';
  }

  getApplicantLabel(app: RequestSummaryDto): string {
    return app.applicant_name?.trim() || app.applicant_staff_username?.trim() || '-';
  }

  getProjectLeader(app: RequestSummaryDto): string {
    return app.project_leader?.trim() || '-';
  }

  getProjectAccountCode(app: RequestSummaryDto): string {
    return app.project_account_code?.trim() || '-';
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
      case 'EXTERNAL':
        return `/external-project-data-entry/detail/${code}`;
      default:
        return `/submissions/detail/${code}`;
    }
  }

  isExternalDraft(app: RequestSummaryDto): boolean {
    return (
      (app.form_code ?? '').toUpperCase() === 'EXTERNAL' &&
      ['draft', 'fill_application', 'normal_application'].includes(app.status_code.toLowerCase())
    );
  }

  getPrimaryActionRoute(app: RequestSummaryDto): string {
    return this.isExternalDraft(app) ? formRoute(app.form_code) : this.getDetailRoute(app);
  }

  getPrimaryActionQueryParams(app: RequestSummaryDto): Record<string, string | number> {
    if (this.isExternalDraft(app)) {
      const requestId = requestIdOf(app);
      return requestId == null ? {} : { request_id: requestId };
    }

    return this.getDetailQueryParams();
  }

  getPrimaryActionTitle(app: RequestSummaryDto): string {
    return this.isExternalDraft(app) ? 'Continue application' : 'View detail';
  }

  getPrimaryActionIcon(app: RequestSummaryDto): 'edit' | 'view' {
    return this.isExternalDraft(app) ? 'edit' : 'view';
  }

  canEditExternalForm(app: RequestSummaryDto): boolean {
    return (
      this.isAdminHistory() &&
      this.auth.inGroup('RMC') &&
      (app.form_code ?? '').toUpperCase() === 'EXTERNAL' &&
      !this.isExternalDraft(app) &&
      requestIdOf(app) != null
    );
  }

  getExternalEditQueryParams(app: RequestSummaryDto): Record<string, string | number> {
    const requestId = requestIdOf(app);
    return {
      ...(requestId == null ? {} : { request_id: requestId }),
      admin_edit: 'true',
      ...this.getDetailQueryParams(),
    };
  }

  getDetailQueryParams(): { returnTo: string; returnLabel: string } {
    const tab = encodeURIComponent(this.selectedType());
    const basePath = this.isAdminHistory() ? '/submissions/admin-history' : '/submissions/history';
    return {
      returnTo: `${basePath}?tab=${tab}`,
      returnLabel: this.isAdminHistory() ? 'Admin History' : 'History',
    };
  }

  canPrint(app: RequestSummaryDto): boolean {
    if ((app.form_code ?? '').toUpperCase() === 'EXTERNAL') {
      return false;
    }

    return app.status_code.toLowerCase() !== 'draft';
  }

  canRollback(app: RequestSummaryDto): boolean {
    if (!this.isAdminHistory() || !this.auth.inGroup('SystemAdmin')) return false;

    const latest = app.last_action;
    if (!latest || latest.action_code?.toLowerCase() === 'admin_rollback') return false;
    if (!latest.from_status_code || !latest.to_status_code) return false;
    if (latest.from_status_code === latest.to_status_code) return false;
    return app.status_code === latest.to_status_code;
  }

  openRollbackDialog(app: RequestSummaryDto): void {
    if (!this.canRollback(app)) return;
    this.rollbackTarget.set(app);
    this.rollbackReason.set('');
  }

  closeRollbackDialog(): void {
    if (this.rollbackRequestId() != null) return;
    this.rollbackTarget.set(null);
    this.rollbackReason.set('');
  }

  confirmRollback(): void {
    const app = this.rollbackTarget();
    const requestId = app?.id ?? app?.request_id;
    if (!app || requestId == null || !this.canRollback(app)) return;

    const reason = this.rollbackReason().trim();
    if (!reason) {
      this.toast.error('Rollback reason is required.');
      return;
    }

    this.rollbackRequestId.set(requestId);
    this.requests
      .rollbackRequestAction(requestId, { comment_text: reason })
      .pipe(finalize(() => this.rollbackRequestId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Request action rolled back.');
          this.rollbackTarget.set(null);
          this.rollbackReason.set('');
          this.loadHistory();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Could not roll back this request.'),
      });
  }

  openPrint(app: RequestSummaryDto): void {
    const id = app.id ?? app.request_id;
    if (id != null) {
      this.downloadPrint(id, this.getCode(app));
    }
  }

  getActionClass(app: RequestSummaryDto): string {
    const status = app.status_code.toLowerCase();
    if (status === 'approved' || status.includes('approve')) return 'status-chip--approve';
    if (status.includes('reject')) return 'status-chip--reject';
    return 'status-chip--neutral';
  }

  formatCreatedDate(app: RequestSummaryDto): string {
    return this.formatIsoDate(app.created_at);
  }

  private completedTs(app: RequestSummaryDto): number {
    const iso = app.updated_at ?? app.submitted_at ?? app.created_at;
    return iso ? new Date(iso).getTime() : 0;
  }

  private matchesSearch(app: RequestSummaryDto, query: string): boolean {
    const values: Array<string | null | undefined> = [this.getCode(app)];
    if (this.isAdminHistory()) {
      values.push(app.applicant_name, app.applicant_staff_username, app.applicant_email);
    }
    if ((app.form_code ?? '').toUpperCase() === 'EXTERNAL') {
      values.push(app.project_leader, app.project_account_code);
    }
    return values.some((value) => (value ?? '').toLowerCase().includes(query));
  }

  private formatIsoDate(iso: string | null | undefined): string {
    return formatDisplayDate(iso);
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

  private downloadPrint(requestId: number, fallbackCode: string): void {
    this.requests.downloadPrint(requestId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;
        const fileName = this.printFileName(
          response.headers.get('content-disposition'),
          fallbackCode,
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Could not download the print PDF. Please try again.'),
    });
  }

  private printFileName(contentDisposition: string | null, fallbackCode: string): string {
    const match = contentDisposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : `${fallbackCode}.pdf`;
  }

  private ensureValidTab(): void {
    const tab = this.selectedType();
    if (!this.formTabs().some((item) => item.value === tab)) {
      this.setTab('all');
    }
  }
}
