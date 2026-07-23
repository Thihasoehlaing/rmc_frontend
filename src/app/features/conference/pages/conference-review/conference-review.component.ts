import { Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import {
  ApprovalDto,
  RequestCommentDto,
  WorkflowActionDto,
  WorkflowRequestsService,
} from '../../../../core/services/workflow-requests.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { TableScrollHintComponent } from '../../../../shared/components/table-scroll-hint/table-scroll-hint.component';
import {
  ConferenceApiService,
  ConferenceAttachmentDto,
  ConferenceFormData,
} from '../../services/conference-api.service';
import { CONFERENCE_REVIEW_PREVIEW } from './conference-review.preview-data';

const COMMENT_MAX_LENGTH = 500;

@Component({
  selector: 'app-conference-review',
  standalone: true,
  imports: [ReactiveFormsModule, ActionButtonComponent, TableScrollHintComponent],
  templateUrl: './conference-review.component.html',
  // The conference and journal detail views intentionally share one visual contract.
  styleUrl: '../../../journal-publication/pages/journal-review/journal-review.component.scss',
})
export class ConferenceReviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly conferenceApi = inject(ConferenceApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private requestId: number | null = null;
  private returnTo: string | null = null;

  readonly data = signal<ConferenceFormData | null>(null);
  readonly actions = signal<WorkflowActionDto[]>([]);
  readonly canAct = signal(false);
  readonly approvals = signal<ApprovalDto[]>([]);
  readonly sectionComments = signal<RequestCommentDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly acting = signal(false);
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly backLabel = signal('Back');
  readonly downloadingAttachmentId = signal<number | null>(null);
  readonly savingSectionComment = signal<string | null>(null);

  readonly sectionCommentControls: Record<string, FormControl<string | null>> = {
    conference_details: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    authors: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    supporting_documents: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
    costing_sponsorship: new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]),
  };
  readonly actionCommentControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  readonly commentMaxLength = COMMENT_MAX_LENGTH;

  readonly sectionNames: Record<string, string> = {
    conference_details: 'Conference Details',
    authors: 'Authors',
    supporting_documents: 'Supporting Documents',
    costing_sponsorship: 'Costing & Sponsorship',
  };

  readonly request = computed(() => this.data()?.request ?? null);
  readonly conference = computed(() => this.data()?.conference ?? null);
  readonly staffAuthors = computed(() => this.data()?.apu_staff_co_authors ?? []);
  readonly studentAuthors = computed(() => this.data()?.apu_student_co_authors ?? []);
  readonly nonApuAuthors = computed(() => this.data()?.non_apu_co_authors ?? []);
  readonly costingItems = computed(() => this.data()?.costing_items ?? []);
  readonly travelEvents = computed(() => this.data()?.travel_events ?? []);
  readonly travellingColleagues = computed(() => this.data()?.travelling_colleagues ?? []);
  readonly attachments = computed(() => this.data()?.attachments ?? []);
  readonly supportingAttachments = computed(() =>
    this.attachments().filter((file) => !this.isCostingAttachment(file.entity_type)),
  );
  readonly costingAttachments = computed(() =>
    this.attachments().filter((file) => this.isCostingAttachment(file.entity_type)),
  );
  readonly totalCostInRm = computed(() =>
    this.costingItems().reduce((total, item) => total + this.toNumber(item.cost_in_rm), 0),
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
    if (!requestCode) {
      this.error.set('No conference request code provided.');
      this.loading.set(false);
      return;
    }

    if (requestCode.toLowerCase() === 'preview') {
      this.loadPreview();
      return;
    }

    this.requests
      .getRequestByCode(requestCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => this.openResolvedRequest(data),
        error: () => {
          this.error.set('Unable to find this conference application.');
          this.loading.set(false);
        },
      });
  }

  private loadPreview(): void {
    this.data.set(CONFERENCE_REVIEW_PREVIEW.form);
    this.actions.set(CONFERENCE_REVIEW_PREVIEW.form.request.available_actions ?? []);
    this.canAct.set(Boolean(CONFERENCE_REVIEW_PREVIEW.form.request.can_act));
    this.approvals.set(CONFERENCE_REVIEW_PREVIEW.approvals);
    this.sectionComments.set(CONFERENCE_REVIEW_PREVIEW.comments);
    this.loading.set(false);
  }

  private openResolvedRequest(request: { id?: number; request_id?: number }): void {
    const id = request.request_id ?? request.id;
    if (id == null || !Number.isFinite(id) || id <= 0) {
      this.error.set('This conference application has no valid request id.');
      this.loading.set(false);
      return;
    }
    this.requestId = id;
    this.load(id);
  }

  private load(id: number): void {
    forkJoin({
      form: this.conferenceApi.getForm(id),
      approvals: this.requests.getApprovals(id, { page: 1, perPage: 100 }),
      comments: this.requests.getComments(id),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ form, approvals, comments }) => {
          this.data.set(form.data);
          this.actions.set(form.data.request.available_actions ?? []);
          this.canAct.set(Boolean(form.data.request.can_act));
          this.approvals.set(approvals.data?.items ?? []);
          this.sectionComments.set(
            (comments.data ?? []).filter((comment) => comment.comment_type === 'section_review'),
          );
        },
        error: () => this.error.set('Unable to load this conference application.'),
      });
  }

  val(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  authorshipLabel(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      'first-author': 'First Author',
      'corresponding-author': 'Corresponding Author',
      both: 'First and Corresponding Author',
    };
    return labels[value ?? ''] ?? this.val(value);
  }

  fmtDate(value: string | null | undefined): string {
    return value
      ? new Date(value).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  fmtDateOnly(value: string | null | undefined): string {
    return value
      ? new Date(value).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  fmtMoney(value: unknown): string {
    return this.toNumber(value).toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  fmtFileSize(value: unknown): string {
    const bytes = this.toNumber(value);
    if (!bytes) return 'File size unavailable';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  prettyActor(code: string | null): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  approvalActionLabel(history: ApprovalDto): string {
    return history.action_name?.trim() || this.prettyActor(history.action_code);
  }

  commentsForSection(sectionCode: string): RequestCommentDto[] {
    return this.sectionComments().filter((comment) => comment.section_code === sectionCode);
  }

  canWriteSectionComments(): boolean {
    return this.canAct() && this.requiresAllSectionComments();
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

  private hasCurrentActorSectionComment(sectionCode: string): boolean {
    const currentUsername = this.authService.currentUser()?.username?.trim().toLowerCase();
    return this.commentsForSection(sectionCode).some((comment) => {
      const commentUsername = comment.staff_username?.trim().toLowerCase();
      if (currentUsername && commentUsername) return commentUsername === currentUsername;

      const actor = (this.request()?.current_actor_role ?? '').toLowerCase();
      const commentActor = (comment.actor_type_code ?? '').toLowerCase();
      return (
        (actor.includes('rmc') && commentActor.includes('rmc')) ||
        ((actor.includes('hos') || actor.includes('hod')) &&
          (commentActor.includes('hos') || commentActor.includes('hod')))
      );
    });
  }

  private currentActorRole(): string {
    return (this.request()?.current_actor_role ?? '').toLowerCase();
  }

  saveSectionComment(sectionCode: string): void {
    if (this.requestId == null || this.savingSectionComment()) return;
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
    this.requests
      .createSectionComment(this.requestId, {
        section_code: sectionCode,
        section_name: this.sectionNames[sectionCode],
        comment_text: commentText,
      })
      .pipe(
        finalize(() => this.savingSectionComment.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) => [data, ...comments]);
          control.reset('');
          this.feedback.set({ type: 'success', text: 'Section comment saved.' });
        },
        error: (err) =>
          this.feedback.set({
            type: 'error',
            text: err?.error?.message || 'Could not save this section comment.',
          }),
      });
  }

  entityLabel(entityType: string | null | undefined): string {
    const raw = (entityType ?? '').trim().replace(/^conference_/i, '');
    const key = raw.toLowerCase();
    const labels: Record<string, string> = {
      acceptancenotification: 'Acceptance Notification',
      reviewersfeedback: "Reviewers' Feedback",
      scopusevidencepublication: 'Scopus Evidence of Publication',
      sriapproval: 'Approval by Strategic Research Institute (SRI)',
      turnitinreport: 'Turnitin Report',
      finalpaperdraft: 'Final Paper Draft',
      conferenceinvoice: 'Conference Invoice',
      costing_supporting_document: 'Costing Supporting Document',
    };

    if (!raw) return 'Supporting Document';
    return labels[key] ?? this.prettyActor(raw.replace(/([a-z0-9])([A-Z])/g, '$1_$2'));
  }

  private isCostingAttachment(entityType: string | null | undefined): boolean {
    const value = (entityType ?? '')
      .trim()
      .toLowerCase()
      .replace(/^conference_/, '');
    return value === 'costing_supporting_document';
  }

  downloadAttachment(file: ConferenceAttachmentDto): void {
    if (this.requestId == null || !file.id || this.downloadingAttachmentId()) return;
    const directUrl = file.download_url || file.file_url || file.url;
    if (directUrl) {
      this.openDownload(file);
      return;
    }
    this.downloadingAttachmentId.set(file.id);
    this.conferenceApi
      .getAttachmentDownloadUrl(this.requestId, file.id)
      .pipe(
        finalize(() => this.downloadingAttachmentId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => this.openDownload(data),
        error: (err) =>
          this.feedback.set({
            type: 'error',
            text: err?.error?.message || 'Could not prepare this attachment download.',
          }),
      });
  }

  actionType(action: WorkflowActionDto): 'primary' | 'danger' | 'secondary' {
    const code = action.action_code.toLowerCase();
    if (code.includes('approve') || code.includes('submit')) return 'primary';
    return code.includes('reject') ? 'danger' : 'secondary';
  }

  actionTone(action: WorkflowActionDto): 'positive' | 'resubmit' | 'verified' | 'negative' {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (
      ['reject', 'not supported', 'unverified', 'not recommended'].some((word) =>
        label.includes(word),
      )
    )
      return 'negative';
    if (label.includes('resubmit')) return 'resubmit';
    if (label.includes('verified')) return 'verified';
    return 'positive';
  }

  actionIcon(action: WorkflowActionDto): string {
    const tone = this.actionTone(action);
    if (tone === 'negative') return 'close';
    if (tone === 'resubmit') return 'replay';
    if (tone === 'verified') return 'verified';
    return 'check';
  }

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
    const actionComment = this.requiresDecisionComment()
      ? (this.actionCommentControl.value ?? '').trim()
      : null;
    this.requests
      .actOnRequest(this.requestId, { action_code: action.action_code, comment_text: actionComment })
      .pipe(
        finalize(() => this.acting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback.set({ type: 'success', text: `${action.action_name} recorded.` });
          setTimeout(
            () => void this.router.navigateByUrl(this.returnTo ?? '/submissions/inbox'),
            1200,
          );
        },
        error: (err) =>
          this.feedback.set({
            type: 'error',
            text: err?.error?.message || 'Failed to record your action. Please try again.',
          }),
      });
  }

  goBack(): void {
    if (this.returnTo) {
      void this.router.navigateByUrl(this.returnTo);
    } else if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/submissions/inbox');
    }
  }

  printRequest(): void {
    if (this.requestId != null) {
      window.open(this.requests.getPrintUrl(this.requestId), '_blank', 'noopener,noreferrer');
    }
  }

  private configureBackTarget(): void {
    const query = this.route.snapshot.queryParamMap;
    this.returnTo = this.safeInternalPath(query.get('returnTo'));
    this.backLabel.set(query.get('returnLabel')?.trim() || this.labelFromReturnPath(this.returnTo));
  }

  private safeInternalPath(value: string | null): string | null {
    const path = value?.trim();
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  }

  private labelFromReturnPath(path: string | null): string {
    if (path?.startsWith('/submissions/pending')) return 'Pending';
    if (path?.startsWith('/submissions/inbox')) return 'Inbox';
    if (path?.startsWith('/submissions/admin-history')) return 'Admin History';
    if (path?.startsWith('/submissions/history')) return 'History';
    return 'Back';
  }

  private toNumber(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private openDownload(file: ConferenceAttachmentDto): void {
    const url = file.download_url || file.file_url || file.url;
    if (!url) {
      this.feedback.set({ type: 'error', text: 'Attachment download URL is unavailable.' });
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.download = file.file_name || 'conference-attachment';
    anchor.click();
  }
}
