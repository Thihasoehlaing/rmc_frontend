import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { AttachmentDownloadService } from '../../../../core/services/attachment-download.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import {
  JournalApplicationApiService,
  JournalAttachmentDownload,
  JournalFormData,
} from '../../services/journal-application-api.service';
import {
  ApprovalDto,
  RequestCommentDto,
  WorkflowActionDto,
  WorkflowRequestsService,
} from '../../../../core/services/workflow-requests.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { TableScrollHintComponent } from '../../../../shared/components/table-scroll-hint/table-scroll-hint.component';
import { ActionLoadingService } from '../../../../core/services/action-loading.service';
import { TextareaAutosizeDirective } from '../../../../shared/directives/textarea-autosize.directive';
import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { formatCountryForDisplay } from '../../../../shared/utils/country.util';
import { formatCurrencyAmount, formatMyrCurrency } from '../../../../shared/utils/currency.util';
import { formatMalaysiaDateTime, getApiDateTimeMs } from '../../../../shared/utils/date-time.util';

const SCOPUS_QUARTILE_LABELS: Readonly<Record<string, string>> = {
  Q1: 'Q1: 75th - 100th percentile',
  Q2: 'Q2: 50th - 74th percentile',
  Q3: 'Q3: 25th - 49th percentile',
};

const AUTHOR_ROLE_LABELS: Readonly<Record<string, string>> = {
  'first-author': 'First Author',
  'co-author': 'Corresponding Author',
  'corresponding-author': 'First and Corresponding Author',
};

const PROJECT_TYPE_LABELS: Readonly<Record<string, string>> = {
  'external-research': 'External Research Project',
  'non-research': 'Non-Research Project',
};

const COMMENT_MAX_LENGTH = 1000;

/**
 * journal-review.component.ts
 *
 * The REVIEWER view of a Journal application — the read-only counterpart to the
 * applicant's filling wizard. It's what HOS/RMC/reviewers/approvers see when
 * they open a Journal request from the inbox / pending / history, and what any
 * user sees for a submitted (non-draft) application. The application content is
 * presented read-only, alongside a review panel that renders whatever actions
 * the backend workflow currently allows this user (approve / reject / return /
 * …) plus a comment box, and the approval history.
 *
 * This is a sample of the "different view per user/context" pattern; the RDIG
 * and Conference forms can follow the same shape.
 */
@Component({
  selector: 'app-journal-review',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ActionButtonComponent,
    DataTableComponent,
    TableScrollHintComponent,
    TextareaAutosizeDirective,
    TableActionIconComponent,
    DialogComponent,
  ],
  templateUrl: './journal-review.component.html',
  styleUrl: './journal-review.component.scss',
})
export class JournalReviewComponent implements OnInit {
  private readonly attachmentDownload = inject(AttachmentDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly journalApi = inject(JournalApplicationApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionLoading = inject(ActionLoadingService);

  private requestId: number | null = null;
  private returnTo: string | null = null;
  downloadingAttachmentId = signal<number | null>(null);

  data = signal<JournalFormData | null>(null);
  actions = signal<WorkflowActionDto[]>([]);
  canAct = signal(false);
  approvals = signal<ApprovalDto[]>([]);
  sectionComments = signal<RequestCommentDto[]>([]);
  savingSectionComment = signal<string | null>(null);
  editingSectionCommentId = signal<number | null>(null);
  savingEditedSectionCommentId = signal<number | null>(null);
  deletingSectionCommentId = signal<number | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  acting = signal(false);
  rollbacking = signal(false);
  rollbackDialogOpen = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  backLabel = signal('Back');
  readonly sectionCommentControls: Record<string, FormControl<string | null>> = {
    journal_details: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    manuscript_details: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    supporting_documents: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    authors: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    costing_sponsorship: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
  };
  readonly sectionEditCommentControl = new FormControl('', [
    Validators.maxLength(COMMENT_MAX_LENGTH),
  ]);
  readonly actionCommentControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  readonly rollbackReasonControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  readonly commentMaxLength = COMMENT_MAX_LENGTH;

  readonly sectionNames: Record<string, string> = {
    journal_details: 'Journal Details',
    manuscript_details: 'Manuscript Details',
    supporting_documents: 'Supporting Documents',
    authors: 'Authors',
    costing_sponsorship: 'Costing & Sponsorship',
  };

  readonly request = computed(() => this.data()?.request ?? null);
  readonly latestApproval = computed(() => {
    const approvals = this.approvals();
    return approvals.length ? approvals[approvals.length - 1] : null;
  });
  readonly canRollbackLatestAction = computed(() => {
    if (!this.authService.inGroup('SystemAdmin')) return false;

    const latest = this.latestApproval();
    const request = this.request();
    if (!latest || !request) return false;
    if (latest.action_code?.toLowerCase() === 'admin_rollback') return false;
    if (!latest.from_status_code || !latest.to_status_code) return false;
    if (latest.from_status_code === latest.to_status_code) return false;
    return request.status_code === latest.to_status_code;
  });
  readonly journal = computed(() => this.data()?.journal ?? null);
  readonly scopusQuartileLabel = computed(() => {
    const quartile = this.journal()?.scopus_quartile?.trim().toUpperCase();
    return quartile ? (SCOPUS_QUARTILE_LABELS[quartile] ?? quartile) : '—';
  });
  readonly authorRoleLabel = computed(() => {
    const authorRole = this.journal()?.author_role?.trim().toLowerCase();
    return authorRole ? (AUTHOR_ROLE_LABELS[authorRole] ?? this.val(authorRole)) : this.val(null);
  });
  readonly projectTypeLabel = computed(() => {
    const projectType = this.journal()?.project_type?.trim().toLowerCase();
    return projectType
      ? (PROJECT_TYPE_LABELS[projectType] ?? this.val(projectType))
      : this.val(null);
  });
  readonly staffAuthors = computed(() => this.data()?.apu_staff_co_authors ?? []);
  readonly studentAuthors = computed(() => this.data()?.apu_student_co_authors ?? []);
  readonly nonApuAuthors = computed(() => this.data()?.non_apu_co_authors ?? []);
  readonly costingItems = computed(() => this.data()?.costing_items ?? []);
  readonly staffAuthorColumns: readonly DataTableColumn[] = [
    { key: 'name', label: 'Name', width: '280px' },
    { key: 'department', label: 'Department', width: '220px' },
    { key: 'affiliation', label: 'Affiliation', width: '220px' },
  ];
  readonly studentAuthorColumns: readonly DataTableColumn[] = [
    { key: 'tpNumber', label: 'TP Number', width: '150px' },
    { key: 'name', label: 'Name', width: '240px' },
    { key: 'department', label: 'School / Department', width: '220px' },
    { key: 'affiliation', label: 'Affiliation', width: '220px' },
  ];
  readonly nonApuAuthorColumns: readonly DataTableColumn[] = [
    { key: 'name', label: 'Name', width: '220px' },
    { key: 'institution', label: 'Institution', width: '220px' },
    { key: 'department', label: 'School / Department', width: '220px' },
    { key: 'organisationType', label: 'Organisation Type', width: '190px' },
    { key: 'country', label: 'Country', width: '160px' },
    { key: 'email', label: 'Email', width: '240px' },
  ];
  readonly costingColumns: readonly DataTableColumn[] = [
    { key: 'voteNumber', label: 'Vote Number', width: '190px' },
    { key: 'accountCode', label: 'Account Code', width: '190px' },
    { key: 'currency', label: 'Currency', width: '120px' },
    { key: 'foreignCost', label: 'Foreign Cost', width: '160px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '170px' },
    { key: 'costInRm', label: 'Cost in RM', width: '150px' },
    { key: 'description', label: 'Description', width: '320px' },
  ];
  readonly staffAuthorRows = computed(() =>
    this.staffAuthors().map((author) => ({
      name: this.val(author.staff_name),
      department: this.val(author.staff_department),
      affiliation: this.val(author.affiliation),
    })),
  );
  readonly studentAuthorRows = computed(() =>
    this.studentAuthors().map((author) => ({
      tpNumber: this.val(author.tp_number),
      name: this.val(author.full_name),
      department: this.val(author.school_department),
      affiliation: this.val(author.affiliation),
    })),
  );
  readonly nonApuAuthorRows = computed(() =>
    this.nonApuAuthors().map((author) => ({
      name: this.val(author.full_name),
      institution: this.val(author.institution_company_name),
      department: this.val(author.school_department),
      organisationType: this.val(author.organisation_type),
      country: this.val(formatCountryForDisplay(author.country)),
      email: this.val(author.email),
    })),
  );
  readonly costingRows = computed(() =>
    this.costingItems().map((item) => ({
      voteNumber: this.val(item.vote_number_snapshot || item.vote_number_description_snapshot),
      accountCode: this.val(item.account_code_snapshot || item.account_code_description_snapshot),
      currency: this.val(item.currency),
      foreignCost: this.fmtAmount(item.cost_in_foreign_currency),
      exchangeRate: this.val(item.exchange_rate),
      costInRm: this.fmtMoney(item.cost_in_rm),
      description: this.val(item.description),
    })),
  );
  readonly attachments = computed(() => this.data()?.attachments ?? []);
  readonly supportingAttachments = computed(() =>
    this.attachments().filter((file) => !this.isCostingAttachment(file?.entity_type)),
  );
  readonly costingAttachments = computed(() =>
    this.attachments().filter((file) => this.isCostingAttachment(file?.entity_type)),
  );
  readonly totalAuthors = computed(
    () => this.staffAuthors().length + this.studentAuthors().length + this.nonApuAuthors().length,
  );
  readonly totalCostInRm = computed(() =>
    this.costingItems().reduce((sum, item) => sum + this.toNumber(item?.cost_in_rm), 0),
  );
  readonly missingRequiredSectionNames = computed(() => {
    if (!this.requiresAllSectionComments()) return [];
    return Object.entries(this.sectionNames)
      .filter(([sectionCode]) => !this.hasCurrentActorSectionComment(sectionCode))
      .map(([, sectionName]) => sectionName);
  });

  ngOnInit(): void {
    this.configureBackTarget();

    const requestCode = this.route.snapshot.paramMap.get('requestCode')?.trim();
    if (requestCode) {
      this.requests
        .getRequestByCode(requestCode)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => this.openResolvedRequest(response.data),
          error: () => {
            this.error.set('Unable to find this journal application.');
            this.loading.set(false);
          },
        });
      return;
    }

    // Accept the legacy numeric route or query-param entry point as a fallback.
    const raw =
      this.route.snapshot.paramMap.get('requestId') ?? this.route.snapshot.queryParamMap.get('id');
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('No application id provided.');
      this.loading.set(false);
      return;
    }
    this.requestId = id;
    this.load();
  }

  private openResolvedRequest(request: { id?: number; request_id?: number }): void {
    const id = request.request_id ?? request.id;
    if (id == null || !Number.isFinite(id) || id <= 0) {
      this.error.set('This journal application has no valid request id.');
      this.loading.set(false);
      return;
    }

    this.requestId = id;
    this.load();
  }

  private load(): void {
    if (this.requestId == null) return;
    const id = this.requestId;
    this.loading.set(true);
    forkJoin({
      form: this.journalApi.getForm(id),
      approvals: this.requests.getApprovals(id, { page: 1, perPage: 100 }),
      comments: this.requests.getComments(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ form, approvals, comments }) => {
          this.data.set(form.data);
          this.actions.set((form.data.request?.available_actions ?? []) as WorkflowActionDto[]);
          this.canAct.set(Boolean(form.data.request?.can_act));
          this.approvals.set(approvals.data?.items ?? []);
          this.sectionComments.set(
            (comments.data ?? []).filter((comment) => comment.comment_type === 'section_review'),
          );
        },
        error: () => this.error.set('Unable to load this journal application.'),
      });
  }

  // ── Display helpers ─────────────────────────────────────────────────────────
  val(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  fmtDate(iso: string | null | undefined): string {
    return formatMalaysiaDateTime(iso, '—');
  }

  actionType(action: WorkflowActionDto): 'primary' | 'danger' | 'secondary' {
    const code = action.action_code.toLowerCase();
    if (code.includes('approve') || code.includes('submit')) return 'primary';
    if (code.includes('reject')) return 'danger';
    return 'secondary';
  }

  actionTone(action: WorkflowActionDto): 'positive' | 'resubmit' | 'verified' | 'negative' {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (
      label.includes('reject') ||
      label.includes('not supported') ||
      label.includes('unverified') ||
      label.includes('not recommended')
    ) {
      return 'negative';
    }
    if (label.includes('resubmit')) return 'resubmit';
    if (label.includes('verified')) return 'verified';
    return 'positive';
  }

  actionIcon(action: WorkflowActionDto): string {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (label.includes('resubmit')) return 'replay';
    if (
      label.includes('reject') ||
      label.includes('not supported') ||
      label.includes('unverified') ||
      label.includes('not recommended')
    ) {
      return 'close';
    }
    if (label.includes('verified')) return 'verified';
    if (label.includes('recommend')) return 'thumb_up';
    return 'check';
  }

  approvalActionLabel(history: ApprovalDto): string {
    return history.action_name?.trim() || this.prettyActor(history.action_code);
  }

  approvalActorLabel(history: ApprovalDto): string {
    if (history.action_code?.toLowerCase() === 'admin_rollback') {
      return 'System';
    }
    return this.val(history.staff_name || history.staff_username);
  }

  prettyActor(code: string | null): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  fmtMoney(value: unknown): string {
    return formatMyrCurrency(value, 'RM 0.00');
  }

  fmtAmount(value: unknown): string {
    return formatCurrencyAmount(value, '0.00');
  }

  fmtFileSize(value: unknown): string {
    const bytes = this.toNumber(value);
    if (!bytes) return 'File size unavailable';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  entityLabel(entityType: string | null | undefined): string {
    const value = (entityType ?? '').trim().toLowerCase();
    const labels: Record<string, string> = {
      reviewers_feedback: "Reviewers' Feedback",
      scopus_citescore_screenshot: 'Scopus CiteScore Screenshot',
      sri_approval: 'Approval by Strategic Research Institute (SRI)',
      scopus_evidence_publication: 'Scopus Evidence of Publication',
      manuscript: 'Manuscript',
      acceptance_letter: 'Acceptance Letter',
      invoice: 'Invoice',
      proof_of_payment: 'Proof of Payment',
      supporting_document: 'Supporting Document',
      costing_supporting_document: 'Costing Supporting Document',
      non_research_project_supporting_document: 'Non-Research Project Supporting Document',
      external_research_project_supporting_document:
        'External Research Project Supporting Document',
    };

    if (!value) return 'Supporting Document';
    return labels[value] ?? this.prettyActor(value);
  }

  actionDescription(action: WorkflowActionDto): string {
    if (action.next_status_code) {
      return `Moves request to ${this.prettyActor(action.next_status_code)}.`;
    }
    return action.requires_remarks ? 'Requires remarks before submission.' : 'No remarks required.';
  }

  actionCommentLength(): number {
    return (this.actionCommentControl.value ?? '').length;
  }

  sectionCommentLength(sectionCode: string): number {
    return (this.sectionCommentControls[sectionCode]?.value ?? '').length;
  }

  requiresAllSectionComments(): boolean {
    const actor = this.currentActorRole();
    return actor.includes('hos') || actor.includes('hod') || actor.includes('rmc');
  }

  requiresDecisionComment(): boolean {
    const actor = this.currentActorRole();
    return (
      this.canAct() &&
      this.actions().length > 0 &&
      !this.requiresAllSectionComments() &&
      !actor.includes('applicant') &&
      !actor.includes('finance')
    );
  }

  canPerformActions(): boolean {
    if (this.requiresAllSectionComments()) return this.missingRequiredSectionNames().length === 0;
    if (this.requiresDecisionComment()) {
      const comment = (this.actionCommentControl.value ?? '').trim();
      return Boolean(comment) && this.actionCommentControl.valid;
    }
    return true;
  }

  actionRequirementMessage(): string | null {
    if (this.requiresAllSectionComments()) {
      const missing = this.missingRequiredSectionNames();
      return missing.length
        ? `Save section comments for: ${missing.join(', ')}.`
        : 'All required section comments are saved. You can take action now.';
    }
    if (this.requiresDecisionComment()) {
      if (this.actionCommentControl.hasError('maxlength')) {
        return `Decision comment cannot exceed ${this.commentMaxLength} characters.`;
      }
      return 'Write a decision comment before taking action.';
    }
    return null;
  }

  private isCostingAttachment(entityType: string | null | undefined): boolean {
    const value = (entityType ?? '').trim().toLowerCase();
    return [
      'costing_supporting_document',
      'non_research_project_supporting_document',
      'external_research_project_supporting_document',
    ].includes(value);
  }

  private currentActorRole(): string {
    return (this.request()?.current_actor_role ?? '').toLowerCase();
  }

  commentsForSection(sectionCode: string): RequestCommentDto[] {
    return this.sectionComments().filter((comment) => comment.section_code === sectionCode);
  }

  canWriteSectionComments(): boolean {
    return this.canAct() && this.requiresAllSectionComments();
  }

  currentActorSectionComment(sectionCode: string): RequestCommentDto | null {
    return (
      this.commentsForSection(sectionCode).find((comment) =>
        this.canChangeSectionComment(comment),
      ) ?? null
    );
  }

  isEditingSectionComment(sectionCode: string): boolean {
    const comment = this.currentActorSectionComment(sectionCode);
    return Boolean(comment && this.editingSectionCommentId() === comment.id);
  }

  isSectionCommentSaving(sectionCode: string): boolean {
    const comment = this.currentActorSectionComment(sectionCode);
    return (
      this.savingSectionComment() === sectionCode ||
      Boolean(comment && this.savingEditedSectionCommentId() === comment.id)
    );
  }

  submitSectionComment(sectionCode: string): void {
    const comment = this.currentActorSectionComment(sectionCode);
    if (comment && this.editingSectionCommentId() === comment.id) {
      this.updateSectionComment(comment);
      return;
    }
    this.saveSectionComment(sectionCode);
  }

  hasCurrentActorSectionComment(sectionCode: string): boolean {
    return this.currentActorSectionComment(sectionCode) !== null;
  }

  canChangeSectionComment(comment: RequestCommentDto): boolean {
    if (!this.canWriteSectionComments()) return false;
    if (!this.isCurrentUserComment(comment)) return false;
    if (!this.isCurrentActorComment(comment)) return false;
    return this.isCurrentStatusWindowComment(comment);
  }

  private isCurrentUserComment(comment: RequestCommentDto): boolean {
    const currentUsername = this.authService.currentUser()?.username?.trim().toLowerCase();
    const commentUsername = comment.staff_username?.trim().toLowerCase();
    return Boolean(currentUsername && commentUsername && commentUsername === currentUsername);
  }

  private isCurrentActorComment(comment: RequestCommentDto): boolean {
    const actor = this.currentActorRole();
    const commentActor = (comment.actor_type_code ?? '').toLowerCase();
    return (
      (actor.includes('rmc') && commentActor.includes('rmc')) ||
      ((actor.includes('hos') || actor.includes('hod')) &&
        (commentActor.includes('hos') || commentActor.includes('hod')))
    );
  }

  private isCurrentStatusWindowComment(comment: RequestCommentDto): boolean {
    const startedAt = this.currentStatusStartedAt();
    const commentAt = this.parseTime(comment.created_at);
    return commentAt !== null && (startedAt === null || commentAt >= startedAt);
  }

  private currentStatusStartedAt(): number | null {
    const statusCode = this.request()?.status_code;
    const statusStart = this.approvals()
      .filter((approval) => approval.to_status_code === statusCode && approval.action_at)
      .map((approval) => this.parseTime(approval.action_at))
      .filter((time): time is number => time !== null)
      .sort((a, b) => b - a)[0];
    if (statusStart !== undefined) return statusStart;
    return (
      this.parseTime(this.request()?.submitted_at) ?? this.parseTime(this.request()?.created_at)
    );
  }

  private parseTime(value: string | null | undefined): number | null {
    return getApiDateTimeMs(value);
  }

  saveSectionComment(sectionCode: string): void {
    if (this.requestId == null || this.savingSectionComment()) return;
    if (this.currentActorSectionComment(sectionCode)) {
      this.feedback.set({ type: 'error', text: 'You already saved a comment for this section.' });
      return;
    }

    const control = this.sectionCommentControls[sectionCode];
    const commentText = (control?.value ?? '').trim();
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control?.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    this.savingSectionComment.set(sectionCode);
    this.feedback.set(null);
    this.requests
      .createSectionComment(this.requestId, {
        section_code: sectionCode,
        section_name: this.sectionNames[sectionCode] ?? this.prettyActor(sectionCode),
        comment_text: commentText,
      })
      .pipe(
        finalize(() => this.savingSectionComment.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.sectionComments.update((comments) => [response.data, ...comments]);
          control?.reset('');
          this.feedback.set({ type: 'success', text: 'Section comment saved.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not save this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  startEditSectionComment(comment: RequestCommentDto): void {
    if (!this.canChangeSectionComment(comment)) return;
    this.editingSectionCommentId.set(comment.id);
    if (comment.section_code) {
      this.sectionCommentControls[comment.section_code]?.setValue(comment.comment_text ?? '');
    }
    this.feedback.set(null);
  }

  cancelEditSectionComment(sectionCode?: string | null): void {
    this.editingSectionCommentId.set(null);
    this.sectionEditCommentControl.reset('');
    if (sectionCode) {
      this.sectionCommentControls[sectionCode]?.reset('');
    }
  }

  editedSectionCommentLength(): number {
    return (this.sectionEditCommentControl.value ?? '').length;
  }

  updateSectionComment(comment: RequestCommentDto): void {
    if (this.requestId == null || this.savingEditedSectionCommentId()) return;
    const control = comment.section_code ? this.sectionCommentControls[comment.section_code] : null;
    const commentText = (control?.value ?? '').trim();
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control?.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    this.savingEditedSectionCommentId.set(comment.id);
    this.feedback.set(null);
    this.requests
      .updateSectionComment(this.requestId, comment.id, { comment_text: commentText })
      .pipe(
        finalize(() => this.savingEditedSectionCommentId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) =>
            comments.map((item) => (item.id === data.id ? data : item)),
          );
          this.cancelEditSectionComment(data.section_code);
          this.feedback.set({ type: 'success', text: 'Section comment updated.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not update this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  deleteSectionComment(comment: RequestCommentDto): void {
    if (this.requestId == null || this.deletingSectionCommentId()) return;
    if (!this.canChangeSectionComment(comment)) return;

    this.deletingSectionCommentId.set(comment.id);
    this.feedback.set(null);
    this.requests
      .deleteSectionComment(this.requestId, comment.id)
      .pipe(
        finalize(() => this.deletingSectionCommentId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.sectionComments.update((comments) =>
            comments.filter((item) => item.id !== comment.id),
          );
          if (this.editingSectionCommentId() === comment.id) {
            this.cancelEditSectionComment(comment.section_code);
          }
          this.feedback.set({ type: 'success', text: 'Section comment deleted.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not delete this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  downloadAttachment(file: any, preview = false): void {
    if (this.requestId == null || !file?.id || this.downloadingAttachmentId()) return;

    const directUrl = file.download_url || file.file_url || file.url;
    if (directUrl) {
      this.openDownload({ ...file, download_url: directUrl }, preview);
      return;
    }

    this.downloadingAttachmentId.set(file.id);
    this.journalApi
      .getAttachmentDownloadUrl(this.requestId, file.id)
      .pipe(
        finalize(() => this.downloadingAttachmentId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.openDownload(response.data, preview),
        error: (err) => {
          const msg = err?.error?.message || 'Could not prepare this attachment download.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  // ── Perform an action ───────────────────────────────────────────────────────
  perform(action: WorkflowActionDto): void {
    if (this.requestId == null || this.acting()) return;

    if (!this.canPerformActions()) {
      this.feedback.set({
        type: 'error',
        text: this.actionRequirementMessage() || 'Please complete the required comments first.',
      });
      return;
    }

    this.acting.set(true);
    this.feedback.set(null);
    const loadingId = this.actionLoading.begin(`Processing ${action.action_name}`);
    let actionSucceeded = false;
    const actionComment = this.requiresDecisionComment()
      ? (this.actionCommentControl.value ?? '').trim()
      : null;
    this.requests
      .actOnRequest(this.requestId, {
        action_code: action.action_code,
        comment_text: actionComment,
      })
      .pipe(
        finalize(() => {
          this.acting.set(false);
          if (!actionSucceeded) {
            this.actionLoading.end(loadingId);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          actionSucceeded = true;
          this.feedback.set({ type: 'success', text: `${action.action_name} recorded.` });
          setTimeout(() => {
            void this.navigateToReturnTarget('/submissions/inbox').finally(() =>
              this.actionLoading.end(loadingId),
            );
          }, 1200);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to record your action. Please try again.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  openRollbackDialog(): void {
    if (!this.canRollbackLatestAction()) return;
    this.feedback.set(null);
    this.rollbackReasonControl.reset('');
    this.rollbackDialogOpen.set(true);
  }

  closeRollbackDialog(): void {
    if (this.rollbacking()) return;
    this.rollbackDialogOpen.set(false);
    this.rollbackReasonControl.reset('');
  }

  rollbackLatestAction(): void {
    if (this.requestId == null || this.rollbacking() || !this.canRollbackLatestAction()) return;

    const reason = (this.rollbackReasonControl.value ?? '').trim();

    if (!reason) {
      this.feedback.set({ type: 'error', text: 'Rollback reason is required.' });
      return;
    }

    if (this.rollbackReasonControl.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Rollback reason must be ${this.commentMaxLength} characters or fewer.`,
      });
      return;
    }

    this.rollbacking.set(true);
    this.feedback.set(null);
    const loadingId = this.actionLoading.begin('Rolling back request action');
    this.requests
      .rollbackRequestAction(this.requestId, { comment_text: reason })
      .pipe(
        finalize(() => {
          this.rollbacking.set(false);
          this.actionLoading.end(loadingId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback.set({ type: 'success', text: 'Request action rolled back.' });
          this.rollbackDialogOpen.set(false);
          this.rollbackReasonControl.reset('');
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not roll back this request.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  goBack(): void {
    if (this.returnTo) {
      void this.router.navigateByUrl(this.returnTo);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl('/submissions/inbox');
  }

  printRequest(): void {
    if (this.requestId == null) {
      this.feedback.set({
        type: 'error',
        text: 'Unable to print before the application is loaded.',
      });
      return;
    }

    this.requests
      .downloadPrint(this.requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) return;
          this.openPrintBlob(
            blob,
            this.printFileName(
              response.headers.get('content-disposition'),
              this.request()?.request_code || 'journal-request',
            ),
          );
        },
        error: () =>
          this.feedback.set({
            type: 'error',
            text: 'Could not download the print PDF. Please try again.',
          }),
      });
  }

  private configureBackTarget(): void {
    const query = this.route.snapshot.queryParamMap;
    this.returnTo = this.safeInternalPath(query.get('returnTo'));
    this.backLabel.set(
      query.get('returnLabel')?.trim() || this.labelFromReturnPath(this.returnTo) || 'Back',
    );
  }

  private navigateToReturnTarget(fallback: string): Promise<boolean> {
    return this.router.navigateByUrl(this.returnTo ?? fallback);
  }

  private safeInternalPath(value: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
      return null;
    }

    return trimmed;
  }

  private labelFromReturnPath(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('/submissions/pending')) return 'Pending';
    if (path.startsWith('/submissions/inbox')) return 'Inbox';
    if (path.startsWith('/submissions/admin-history')) return 'Admin History';
    if (path.startsWith('/submissions/history')) return 'History';
    return 'Back';
  }

  private toNumber(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private openPrintBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private printFileName(contentDisposition: string | null, fallbackCode: string): string {
    const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = match?.[1] ? decodeURIComponent(match[1]) : `${fallbackCode}.pdf`;
    return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  }

  private openDownload(file: JournalAttachmentDownload, preview = false): void {
    const url = file.download_url || file.file_url || file.url;
    if (!url) {
      this.feedback.set({ type: 'error', text: 'Attachment download URL is unavailable.' });
      return;
    }

    this.attachmentDownload.open(url, file.file_name || 'journal-attachment', preview);
  }
}
