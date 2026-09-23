import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  WorkflowRequestsService,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import {
  actionRoute,
  formRoute,
  isApplicantResubmissionStatus,
  requestIdOf,
  showInboxApplicantInfo,
} from '../../../core/services/request-display.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SubmissionFormTabsComponent } from '../../../shared/components/submission-form-tabs/submission-form-tabs.component';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    PaginationComponent,
    TableActionIconComponent,
    RouterLink,
    SubmissionFormTabsComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  private readonly requests = inject(WorkflowRequestsService);
  private readonly formCache = inject(FormCacheService);
  private readonly auth = inject(AuthService);

  private allApplications = signal<RequestSummaryDto[]>([]);
  private forms = signal<CachedFormOption[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  codeDraft = signal('');
  applicantDraft = signal('');
  submissionDateDraft = signal('');
  codeQuery = signal('');
  applicantQuery = signal('');
  submissionDate = signal('');
  selectedForm = signal('all');
  sortDirection = signal<'asc' | 'desc'>('desc');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];

  readonly showApplicantInfo = computed(() =>
    showInboxApplicantInfo(this.auth.currentUser()?.role?.code),
  );

  readonly skeletonColumns = computed<SkeletonColumn[]>(() => [
    { width: '72px' },
    { width: '18%' },
    ...(this.showApplicantInfo() ? [{ width: '25%' }] : []),
    { width: '14%' },
    { width: '18%' },
    { width: '120px' },
  ]);

  /** Badge colour per workflow status code. */
  readonly statusColors: Record<string, string> = {
    fill_application: '#3b82f6',
    pending_applicant_resubmission_hos: '#f59e0b',
    pending_applicant_resubmission_rmc: '#f59e0b',
    pending_applicant_resubmission_reviewers: '#f59e0b',
    hos_request_resubmission: '#f59e0b',
    rmc_request_resubmission: '#f59e0b',
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

  /** Client-side code/applicant/submission-date search on top of the backend-filtered inbox. */
  readonly applications = computed(() => {
    const codeQuery = this.codeQuery().toLowerCase().trim();
    const applicantQuery = this.applicantQuery().toLowerCase().trim();
    const submissionDate = this.submissionDate();
    const form = this.selectedForm();
    const rows = this.allApplications();
    const items = rows
      .filter((app) => form === 'all' || (app.form_code ?? '').toUpperCase() === form)
      .filter((app) => !codeQuery || this.getCode(app).toLowerCase().includes(codeQuery))
      .filter((app) => !applicantQuery || this.applicantSearchText(app).includes(applicantQuery))
      .filter((app) => !submissionDate || this.dateInputValue(this.submissionIso(app)) === submissionDate);

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

  onCodeDraftChange(event: Event): void {
    this.codeDraft.set((event.target as HTMLInputElement).value);
  }

  onApplicantDraftChange(event: Event): void {
    this.applicantDraft.set((event.target as HTMLInputElement).value);
  }

  onSubmissionDateDraftChange(event: Event): void {
    this.submissionDateDraft.set((event.target as HTMLInputElement).value);
  }

  applyFilters(): void {
    this.codeQuery.set(this.codeDraft().trim());
    this.applicantQuery.set(this.applicantDraft().trim());
    this.submissionDate.set(this.submissionDateDraft());
    this.page.set(1);
  }

  resetFilters(): void {
    this.codeDraft.set('');
    this.applicantDraft.set('');
    this.submissionDateDraft.set('');
    this.codeQuery.set('');
    this.applicantQuery.set('');
    this.submissionDate.set('');
    this.setTab('all');
  }

  setTab(tab: string): void {
    this.selectedForm.set(tab);
    this.page.set(1);
  }

  refreshInbox(): void {
    this.resetFilters();
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
      forms: this.formCache.getActiveForms(true),
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
    return this.formatIsoDate(this.submissionIso(app));
  }

  getFormRoute(app: RequestSummaryDto): string {
    return actionRoute(app);
  }

  getEditRoute(app: RequestSummaryDto): string {
    return formRoute(app.form_code);
  }

  getEditQueryParams(app: RequestSummaryDto): { request_id: number | null } {
    return { request_id: requestIdOf(app) };
  }

  getDetailQueryParams(): { returnTo: string; returnLabel: string } {
    return {
      returnTo: '/submissions/inbox',
      returnLabel: 'Inbox',
    };
  }

  hasActiveFilters(): boolean {
    return Boolean(this.codeQuery() || this.applicantQuery() || this.submissionDate());
  }

  canPrint(app: RequestSummaryDto): boolean {
    return app.status_code.toLowerCase() !== 'draft';
  }

  canEditResubmission(app: RequestSummaryDto): boolean {
    return isApplicantResubmissionStatus(app.status_code) && requestIdOf(app) != null;
  }

  openPrint(app: RequestSummaryDto): void {
    const id = requestIdOf(app);
    if (id != null) {
      this.downloadPrint(id, this.getCode(app));
    }
  }

  getRowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  private submittedTs(app: RequestSummaryDto): number {
    const iso = this.submissionIso(app);
    return iso ? new Date(iso).getTime() : 0;
  }

  private submissionIso(app: RequestSummaryDto): string | null | undefined {
    return app.submitted_at ?? app.updated_at ?? app.created_at;
  }

  private applicantSearchText(app: RequestSummaryDto): string {
    return [
      app.applicant_name,
      app.applicant_staff_username,
      app.applicant_email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
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

  private ensureValidTab(): void {
    const tab = this.selectedForm();
    if (!this.formTabs().some((item) => item.value === tab)) {
      this.setTab('all');
    }
  }

  private downloadPrint(requestId: number, fallbackCode: string): void {
    this.requests.downloadPrint(requestId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;
        const fileName = this.printFileName(response.headers.get('content-disposition'), fallbackCode);
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
}
