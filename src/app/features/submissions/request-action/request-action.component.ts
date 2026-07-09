import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';

import {
  ApprovalDto,
  RequestContextDto,
  RequestSummaryDto,
  WorkflowActionDto,
  WorkflowRequestsService,
} from '../../../core/services/workflow-requests.service';
import { formTypeLabel, STATUS_COLORS } from '../../../core/services/request-display.util';

@Component({
  selector: 'app-request-action',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-action.component.html',
  styleUrl: './request-action.component.scss',
})
export class RequestActionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requests = inject(WorkflowRequestsService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  request = signal<RequestSummaryDto | null>(null);
  context = signal<RequestContextDto | null>(null);
  actions = signal<WorkflowActionDto[]>([]);
  approvals = signal<ApprovalDto[]>([]);
  comments = signal<any[]>([]);
  commentText = signal('');
  reviewerUsernames = signal('');

  readonly selectedTitle = computed(() => this.request()?.title?.trim() || this.request()?.request_code || 'Application');
  readonly hasReviewerSelection = computed(() =>
    this.actions().some((action) => action.requires_reviewer_selection),
  );

  ngOnInit(): void {
    const requestId = Number(this.route.snapshot.paramMap.get('requestId'));
    if (!Number.isFinite(requestId)) {
      this.error.set('Invalid request id.');
      this.loading.set(false);
      return;
    }

    this.requests
      .getRequestWorkflow(requestId)
      .pipe(
        switchMap((workflow) =>
          forkJoin({
            context: this.requests.getFormContext(workflow.data.form_code, requestId),
            actions: this.requests.getAvailableActions(requestId),
            approvals: this.requests.getApprovals(requestId, { page: 1, perPage: 50 }),
            comments: this.requests.getComments(requestId),
          }),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ context, actions, approvals, comments }) => {
          this.context.set(context.data);
          this.request.set(context.data.request ?? null);
          this.actions.set(actions.data?.available_actions ?? []);
          this.approvals.set(approvals.data?.items ?? []);
          this.comments.set(comments.data ?? []);
        },
        error: () => this.error.set('Could not load the action page.'),
      });
  }

  submitAction(action: WorkflowActionDto): void {
    const requestId = this.request()?.request_id ?? this.request()?.id;
    if (requestId == null) return;
    if (action.requires_remarks && !this.commentText().trim()) {
      this.error.set('Comment is required for this action.');
      return;
    }

    const selected_reviewer_usernames = this.reviewerUsernames()
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    this.saving.set(true);
    this.error.set(null);
    this.requests
      .actOnRequest(requestId, {
        action_code: action.action_code,
        comment_text: this.commentText().trim() || null,
        selected_reviewer_usernames,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Action completed successfully.');
          setTimeout(() => this.router.navigate(['/submissions/inbox']), 900);
        },
        error: (err) => this.error.set(err?.error?.message || 'Could not complete this action.'),
      });
  }

  formLabel(): string {
    const req = this.request();
    return formTypeLabel(req?.form_code, req?.form_name);
  }

  statusColor(): string {
    const req = this.request();
    return req ? STATUS_COLORS[req.status_code] ?? '#6b7280' : '#6b7280';
  }
}
