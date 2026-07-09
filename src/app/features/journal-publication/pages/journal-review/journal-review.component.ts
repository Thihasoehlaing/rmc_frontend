import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import {
  JournalApplicationApiService,
  JournalFormData,
} from '../../services/journal-application-api.service';
import {
  ApprovalDto,
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
  private readonly journalApi = inject(JournalApplicationApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly destroyRef = inject(DestroyRef);

  private requestId: number | null = null;

  data = signal<JournalFormData | null>(null);
  actions = signal<WorkflowActionDto[]>([]);
  canAct = signal(false);
  approvals = signal<ApprovalDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  acting = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly comment = new FormControl('');

  readonly request = computed(() => this.data()?.request ?? null);
  readonly journal = computed(() => this.data()?.journal ?? null);
  readonly staffAuthors = computed(() => this.data()?.apu_staff_co_authors ?? []);
  readonly studentAuthors = computed(() => this.data()?.apu_student_co_authors ?? []);
  readonly nonApuAuthors = computed(() => this.data()?.non_apu_co_authors ?? []);
  readonly costingItems = computed(() => this.data()?.costing_items ?? []);
  readonly attachments = computed(() => this.data()?.attachments ?? []);

  ngOnInit(): void {
    // Accept the id as a route param (/journal/review/:requestId — how the inbox
    // links here) or a query param (?id=), whichever is present.
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

  private load(): void {
    if (this.requestId == null) return;
    const id = this.requestId;
    this.loading.set(true);
    forkJoin({
      form: this.journalApi.getForm(id),
      actions: this.requests.getAvailableActions(id),
      approvals: this.requests.getApprovals(id, { page: 1, perPage: 100 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ form, actions, approvals }) => {
          this.data.set(form.data);
          this.actions.set(actions.data?.available_actions ?? []);
          this.canAct.set(actions.data?.can_act ?? false);
          this.approvals.set(approvals.data?.items ?? []);
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

  prettyActor(code: string | null): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  // ── Perform an action ───────────────────────────────────────────────────────
  perform(action: WorkflowActionDto): void {
    if (this.requestId == null || this.acting()) return;
    const commentText = (this.comment.value ?? '').trim();
    if (action.requires_remarks && !commentText) {
      this.feedback.set({ type: 'error', text: `A remark is required to ${action.action_name}.` });
      return;
    }

    this.acting.set(true);
    this.feedback.set(null);
    this.requests
      .actOnRequest(this.requestId, {
        action_code: action.action_code,
        comment_text: commentText || null,
      })
      .pipe(
        finalize(() => this.acting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback.set({ type: 'success', text: `${action.action_name} recorded.` });
          setTimeout(() => this.router.navigate(['/submissions/inbox']), 1200);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to record your action. Please try again.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/submissions/inbox']);
  }
}
