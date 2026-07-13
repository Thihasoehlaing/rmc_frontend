import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';

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
  imports: [ReactiveFormsModule, ActionButtonComponent],
  templateUrl: './journal-review.component.html',
  styleUrl: './journal-review.component.scss',
})
export class JournalReviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly journalApi = inject(JournalApplicationApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly destroyRef = inject(DestroyRef);

  private requestId: number | null = null;
  private returnTo: string | null = null;
  downloadingAttachmentId = signal<number | null>(null);

  data = signal<JournalFormData | null>(null);
  actions = signal<WorkflowActionDto[]>([]);
  canAct = signal(false);
  approvals = signal<ApprovalDto[]>([]);
  sectionComments = signal<RequestCommentDto[]>([]);
  savingSectionComment = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  acting = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  backLabel = signal('Back');
  readonly sectionCommentControls: Record<string, FormControl<string | null>> = {
    journal_details: new FormControl(''),
    manuscript_details: new FormControl(''),
    supporting_documents: new FormControl(''),
    authors: new FormControl(''),
    costing_sponsorship: new FormControl(''),
  };

  readonly sectionNames: Record<string, string> = {
    journal_details: 'Journal Details',
    manuscript_details: 'Manuscript Details',
    supporting_documents: 'Supporting Documents',
    authors: 'Authors',
    costing_sponsorship: 'Costing & Sponsorship',
  };

  readonly request = computed(() => this.data()?.request ?? null);
  readonly journal = computed(() => this.data()?.journal ?? null);
  readonly staffAuthors = computed(() => this.data()?.apu_staff_co_authors ?? []);
  readonly studentAuthors = computed(() => this.data()?.apu_student_co_authors ?? []);
  readonly nonApuAuthors = computed(() => this.data()?.non_apu_co_authors ?? []);
  readonly costingItems = computed(() => this.data()?.costing_items ?? []);
  readonly attachments = computed(() => this.data()?.attachments ?? []);
  readonly totalAuthors = computed(
    () => this.staffAuthors().length + this.studentAuthors().length + this.nonApuAuthors().length,
  );
  readonly totalCostInRm = computed(() =>
    this.costingItems().reduce((sum, item) => sum + this.toNumber(item?.cost_in_rm), 0),
  );

  ngOnInit(): void {
    this.configureBackTarget();

    const requestCode = this.route.snapshot.paramMap.get('requestCode')?.trim();
    if (requestCode) {
      this.requests
        .getRequestByCode(requestCode)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: response => this.openResolvedRequest(response.data),
          error: () => {
            this.error.set('Unable to find this journal application.');
            this.loading.set(false);
          },
        });
      return;
    }

    // Accept the legacy numeric route or query-param entry point as a fallback.
    const raw =
      this.route.snapshot.paramMap.get('requestId') ??
      this.route.snapshot.queryParamMap.get('id');
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
            (comments.data ?? []).filter(comment => comment.comment_type === 'section_review'),
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
    return iso
      ? new Date(iso).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  actionType(action: WorkflowActionDto): 'primary' | 'danger' | 'secondary' {
    const code = action.action_code.toLowerCase();
    if (code.includes('approve') || code.includes('submit')) return 'primary';
    if (code.includes('reject')) return 'danger';
    return 'secondary';
  }

  actionTone(action: WorkflowActionDto): 'positive' | 'resubmit' | 'verified' | 'negative' {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (label.includes('reject') || label.includes('not supported') || label.includes('unverified') || label.includes('not recommended')) {
      return 'negative';
    }
    if (label.includes('resubmit')) return 'resubmit';
    if (label.includes('verified')) return 'verified';
    return 'positive';
  }

  actionIcon(action: WorkflowActionDto): string {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (label.includes('resubmit')) return 'replay';
    if (label.includes('reject') || label.includes('not supported') || label.includes('unverified') || label.includes('not recommended')) {
      return 'close';
    }
    if (label.includes('verified')) return 'verified';
    if (label.includes('recommend')) return 'thumb_up';
    return 'check';
  }

  prettyActor(code: string | null): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  fmtMoney(value: unknown): string {
    const number = this.toNumber(value);
    return number.toLocaleString('en-MY', {
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

  entityLabel(entityType: string | null | undefined): string {
    const value = (entityType ?? '').trim().toLowerCase();
    const labels: Record<string, string> = {
      reviewers_feedback: "Reviewers' Feedback",
      scopus_citescore_screenshot: 'Scopus CiteScore Screenshot',
      scopus_evidence_publication: 'Scopus Evidence of Publication',
      manuscript: 'Manuscript',
      acceptance_letter: 'Acceptance Letter',
      invoice: 'Invoice',
      proof_of_payment: 'Proof of Payment',
      supporting_document: 'Supporting Document',
      costing_supporting_document: 'Costing Supporting Document',
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

  commentsForSection(sectionCode: string): RequestCommentDto[] {
    return this.sectionComments().filter(comment => comment.section_code === sectionCode);
  }

  canWriteSectionComments(): boolean {
    const actor = (this.request()?.current_actor_role ?? '').toLowerCase();
    return this.canAct() && !actor.includes('applicant') && !actor.includes('finance');
  }

  saveSectionComment(sectionCode: string): void {
    if (this.requestId == null || this.savingSectionComment()) return;

    const control = this.sectionCommentControls[sectionCode];
    const commentText = (control?.value ?? '').trim();
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
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
        next: response => {
          this.sectionComments.update(comments => [response.data, ...comments]);
          control?.reset('');
          this.feedback.set({ type: 'success', text: 'Section comment saved.' });
        },
        error: err => {
          const msg = err?.error?.message || 'Could not save this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  downloadAttachment(file: any): void {
    if (this.requestId == null || !file?.id || this.downloadingAttachmentId()) return;

    const directUrl = file.download_url || file.file_url || file.url;
    if (directUrl) {
      this.openDownload({ ...file, download_url: directUrl });
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
        next: response => this.openDownload(response.data),
        error: err => {
          const msg = err?.error?.message || 'Could not prepare this attachment download.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  // ── Perform an action ───────────────────────────────────────────────────────
  perform(action: WorkflowActionDto): void {
    if (this.requestId == null || this.acting()) return;

    this.acting.set(true);
    this.feedback.set(null);
    this.requests
      .actOnRequest(this.requestId, {
        action_code: action.action_code,
        comment_text: null,
      })
      .pipe(
        finalize(() => this.acting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback.set({ type: 'success', text: `${action.action_name} recorded.` });
          setTimeout(() => this.navigateToReturnTarget('/submissions/inbox'), 1200);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to record your action. Please try again.';
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
      this.feedback.set({ type: 'error', text: 'Unable to print before the application is loaded.' });
      return;
    }

    window.open(this.requests.getPrintUrl(this.requestId), '_blank', 'noopener,noreferrer');
  }

  private configureBackTarget(): void {
    const query = this.route.snapshot.queryParamMap;
    this.returnTo = this.safeInternalPath(query.get('returnTo'));
    this.backLabel.set(
      query.get('returnLabel')?.trim() ||
        this.labelFromReturnPath(this.returnTo) ||
        'Back',
    );
  }

  private navigateToReturnTarget(fallback: string): void {
    void this.router.navigateByUrl(this.returnTo ?? fallback);
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

  private openDownload(file: JournalAttachmentDownload): void {
    const url = file.download_url || file.file_url || file.url;
    if (!url) {
      this.feedback.set({ type: 'error', text: 'Attachment download URL is unavailable.' });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.download = file.file_name || 'journal-attachment';
    anchor.click();
  }
}
