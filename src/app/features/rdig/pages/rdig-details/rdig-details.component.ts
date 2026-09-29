import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Location, NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, of, switchMap, tap, type Observable } from 'rxjs';

import {
  RdigApiService,
  RdigAttachmentDto,
  RdigBudgetItemDto,
  RdigBudgetSectionDto,
  RdigCoResearcherDto,
  RdigCollaboratorDto,
  RdigFormData,
  RdigResearchActivityDto,
  RdigRequestDto,
} from '../../services/rdig-api.service';
import {
  ApprovalDto,
  RdigReviewerReviewDto,
  RdigReviewerScoreSheetDto,
  RequestCommentDto,
  RequestSummaryDto,
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
import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';
import { ReviewBlockComponent } from '../../components/review-block/review-block.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { formatMyrCurrency } from '../../../../shared/utils/currency.util';
import { WORKFLOW_STAGE_META } from '../../../../core/interfaces/batch-sitting.interface';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import {
  RdigReviewerRecord,
  RdigReviewerService,
} from '../../../admin-settings/manage-rdig-reviewer/rdig-reviewer.service';

const COMMENT_MAX_LENGTH = 1000;

type ScoredComment = RequestCommentDto;

/** Every distinct comment author role in the RDIG workflow. */
export type CommentSource = 'hos' | 'rmc' | 'reviewer1' | 'reviewer2' | 'rdig_chair' | 'vc' | 'ceo';

/** HOS and RMC write one comment per group, per submission version. */
type GroupActor = 'hos' | 'rmc';
type GroupCode = 'team' | 'project' | 'output_budget' | 'declaration';

/** Reviewer 1 / Reviewer 2 write one comment under each specific field/table/section. */
type ReviewerActor = 'reviewer1' | 'reviewer2';

/** RDIG Chair / VC / CEO each write exactly one application-level comment. */
type WholeFormActor = 'rdig_chair' | 'vc' | 'ceo';

interface FieldCommentDef {
  fieldCode: string;
  label: string;
  /** Max score if this field carries a rating (0-10 or 0-5, matching the Form View). */
  maxScore?: number;
}

const GROUP_FIELD_CODE: Record<GroupCode, string> = {
  team: 'group_team_members',
  project: 'group_project_details',
  output_budget: 'group_output_budget',
  declaration: 'group_declaration',
};

const GROUP_LABEL: Record<GroupCode, string> = {
  team: 'Team Members',
  project: 'Project Details',
  output_budget: 'Research Output & Budget',
  declaration: 'Declaration',
};

/** DOM id of each group's <section>, so the requirement list can scroll straight to it. */
const GROUP_SECTION_ID: Record<GroupCode, string> = {
  team: 'group-team',
  project: 'group-project',
  output_budget: 'group-output-budget',
  declaration: 'group-declaration',
};

const WHOLE_FORM_FIELD_CODE: Record<WholeFormActor, string> = {
  rdig_chair: 'whole_form_rdig_chair',
  vc: 'whole_form_vc',
  ceo: 'whole_form_ceo',
};

/**
 * TODO(backend): comments carry no explicit `submission_version` column yet. Version
 * boundaries are approximated from the approvals/audit trail: every transition INTO a
 * `pending_applicant_resubmission_*` status marks the start of a new version. A
 * comment created before the most recent such boundary belongs to a past, permanently
 * read-only version.
 */
const RESUBMISSION_STATUS_PREFIX = 'pending_applicant_resubmission';

/**
 * rdig-details.component.ts — the REVIEWER/APPROVER read-only view of an RDIG
 * application. Every field mirrors `/rdig/application` exactly; the only additional
 * elements are reviewer/approver comments.
 *
 * Comment architecture:
 *  - HOS and RMC each write ONE comment per main group (Team Members, Project
 *    Details, Research Output & Budget, Declaration), one per submission version.
 *  - Reviewer 1 and Reviewer 2 each write comments under the scored areas. Their
 *    scoring sheet is persisted independently from comments and versioned by review cycle.
 *  - RDIG Chair, VC, CEO each write ONE application-level comment, edited from the
 *    fixed right-side panel.
 *  - Comments from other users are hidden by default. The right-side panel exposes a
 *    toggle per PERMITTED source; toggling shows/hides that source's comments inline,
 *    directly below their field/table/section/group. Sources the current viewer may
 *    not see render no toggle, counter, or empty space at all.
 *  - Visibility follows a strict, centralized hierarchy (canViewSource) — not a
 *    generic "up-chain sees everything" cascade.
 */
@Component({
  selector: 'app-rdig-details',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    ActionButtonComponent,
    DataTableComponent,
    TableScrollHintComponent,
    TableActionIconComponent,
    ReviewBlockComponent,
    CustomSubheaderComponent,
    DialogComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './rdig-details.component.html',
  styleUrl: './rdig-details.component.scss',
})
export class RdigDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly rdigApi = inject(RdigApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionLoading = inject(ActionLoadingService);
  private readonly rdigReviewerService = inject(RdigReviewerService);

  private requestId: number | null = null;
  private returnTo: string | null = null;
  downloadingAttachmentId = signal<number | null>(null);

  data = signal<RdigFormData | null>(null);
  actions = signal<WorkflowActionDto[]>([]);
  canAct = signal(false);
  approvals = signal<ApprovalDto[]>([]);

  /**
   * Approval history sorted newest-first regardless of API ordering — the timeline
   * (and its "current step" animation) must never depend on the backend returning
   * rows in a particular order.
   */
  readonly sortedApprovals = computed(() =>
    [...this.approvals()].sort(
      (a, b) => (this.parseTime(b.action_at) ?? 0) - (this.parseTime(a.action_at) ?? 0),
    ),
  );

  /**
   * The one workflow step the pulsing "active" dot may render on: the current
   * pending step when one exists for this viewer, otherwise the most recently
   * completed step. Since approvals only ever record completed steps, both cases
   * resolve to the same entry — the newest one — but expressed as its own method
   * (rather than relying on array order/`$first`) so exactly one dot is ever active.
   */
  isActiveApprovalStep(history: ApprovalDto): boolean {
    const latest = this.sortedApprovals()[0];
    return latest?.id === history.id;
  }

  sectionComments = signal<ScoredComment[]>([]);
  reviewerScoreSheet = signal<RdigReviewerScoreSheetDto | null>(null);
  scoresSaving = signal(false);
  editingCommentId = signal<number | null>(null);
  deletingCommentId = signal<number | null>(null);
  savingCommentKey = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  acting = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  backLabel = signal('Back');

  readonly actionCommentControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  readonly selectedReviewersControl = new FormControl<string[]>([], { nonNullable: true });
  readonly commentMaxLength = COMMENT_MAX_LENGTH;

  readonly reviewerSelectionOpen = signal(false);
  readonly reviewerDropdownOpen = signal(false);
  readonly reviewerSelectionError = signal<string | null>(null);
  readonly reviewerOptionsLoading = signal(false);
  readonly reviewerOptionsError = signal<string | null>(null);
  readonly reviewerOptions = signal<DropdownOption<string>[]>([]);
  readonly selectedReviewerUsernames = signal<readonly string[]>([]);
  readonly reviewerSelectionAction = computed(
    () => this.actions().find((action) => action.requires_reviewer_selection) ?? null,
  );

  reviewerSelectionCount(): number {
    return this.reviewerSelectionAction()?.reviewer_selection_count ?? 2;
  }

  reviewerSelectionConfirmed(): boolean {
    return this.selectedReviewerUsernames().length === this.reviewerSelectionCount();
  }

  selectedReviewerLabels(): string[] {
    const labels = new Map(this.reviewerOptions().map((option) => [option.value, option.label]));
    return this.selectedReviewerUsernames().map((username) => labels.get(username) ?? username);
  }

  selectedReviewerCount(): number {
    return this.selectedReviewersControl.value.length;
  }

  onReviewerDropdownOpenChange(isOpen: boolean): void {
    if (isOpen) this.reviewerDropdownOpen.set(true);
  }

  openReviewerSelection(): void {
    this.selectedReviewersControl.setValue([...this.selectedReviewerUsernames()]);
    this.reviewerSelectionError.set(null);
    this.reviewerDropdownOpen.set(false);
    this.reviewerSelectionOpen.set(true);
    if (!this.reviewerOptions().length) this.loadReviewerOptions();
  }

  closeReviewerSelection(): void {
    this.reviewerSelectionOpen.set(false);
    this.reviewerDropdownOpen.set(false);
    this.reviewerSelectionError.set(null);
    this.selectedReviewersControl.setValue([...this.selectedReviewerUsernames()]);
  }

  confirmReviewerSelection(): void {
    const selected = this.selectedReviewersControl.value;
    const requiredCount = this.reviewerSelectionCount();
    if (selected.length !== requiredCount) {
      this.reviewerSelectionError.set(
        `Select exactly ${requiredCount} different reviewers before continuing.`,
      );
      return;
    }
    this.selectedReviewerUsernames.set([...selected]);
    this.reviewerSelectionOpen.set(false);
    this.reviewerDropdownOpen.set(false);
    this.reviewerSelectionError.set(null);
    this.feedback.set({
      type: 'success',
      text: `${selected.length} reviewers selected. Choose Approve or Request Resubmission to continue.`,
    });
  }

  loadReviewerOptions(): void {
    if (this.reviewerOptionsLoading()) return;
    this.reviewerOptionsLoading.set(true);
    this.reviewerOptionsError.set(null);
    this.rdigReviewerService
      .listOptions()
      .pipe(
        finalize(() => this.reviewerOptionsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const options = (response.data ?? [])
            .filter((reviewer): reviewer is RdigReviewerRecord & { staff_username: string } =>
              Boolean(reviewer.staff_username?.trim()),
            )
            .map((reviewer) => this.toReviewerOption(reviewer));
          this.reviewerOptions.set(options);
          if (options.length < this.reviewerSelectionCount()) {
            this.reviewerOptionsError.set(
              `At least ${this.reviewerSelectionCount()} active RDIG reviewers are required.`,
            );
          }
        },
        error: (err) => {
          this.reviewerOptionsError.set(
            err?.error?.message || 'Unable to load reviewer options. Please try again.',
          );
        },
      });
  }

  private toReviewerOption(
    reviewer: RdigReviewerRecord & { staff_username: string },
  ): DropdownOption<string> {
    const username = reviewer.staff_username.trim().toLowerCase();
    const name = reviewer.staff_fullname?.trim() || username;
    const details = [username, reviewer.department, reviewer.job_title].filter(Boolean).join(' · ');
    return {
      value: username,
      label: name,
      description: details,
      searchText: `${name} ${details}`,
    };
  }

  // ── Right-side panel: per-source toggle state (hidden by default) ──────────────
  private readonly toggledSources = signal<ReadonlySet<CommentSource>>(new Set());

  /** Own comments are always visible (never gated); other sources follow the toggle. */
  isToggled(source: CommentSource): boolean {
    if (source === this.currentUserSource()) return true;
    return this.toggledSources().has(source);
  }

  toggleSource(source: CommentSource): void {
    if (source === this.currentUserSource()) return;
    if (!this.canViewSource(source)) return;
    this.toggledSources.update((current) => {
      const next = new Set(current);
      next.has(source) ? next.delete(source) : next.add(source);
      return next;
    });
  }

  /** Sources a toggle/counter/comment may ever be rendered for, in right-panel order. */
  readonly allSources: CommentSource[] = [
    'hos',
    'rmc',
    'reviewer1',
    'reviewer2',
    'rdig_chair',
    'vc',
    'ceo',
  ];

  labelForSource(source: CommentSource): string {
    return this.sourceLabel[source];
  }

  iconForSource(source: CommentSource): string {
    return this.sourceIcon[source];
  }

  readonly sourceLabel: Record<CommentSource, string> = {
    hos: 'HOS',
    rmc: 'RMC',
    reviewer1: 'Reviewer 1',
    reviewer2: 'Reviewer 2',
    rdig_chair: 'RDIG Chair',
    vc: 'Vice Chancellor',
    ceo: 'CEO',
  };

  readonly sourceIcon: Record<CommentSource, string> = {
    hos: 'supervisor_account',
    rmc: 'verified',
    reviewer1: 'rate_review',
    reviewer2: 'rate_review',
    rdig_chair: 'admin_panel_settings',
    vc: 'account_balance',
    ceo: 'business',
  };

  /**
   * Centralized visibility hierarchy (spec §8) — the single source of truth for
   * whether the CURRENT viewer may see a given source's comments anywhere on this
   * page (right-panel toggle, inline comment, counter). Authors always see their own.
   */
  canViewSource(source: CommentSource): boolean {
    if (source === this.currentUserSource()) return true;

    if (this.isCurrentActorHos()) return false;
    if (this.isCurrentUserReviewer(1) || this.isCurrentUserReviewer(2)) {
      return source === 'hos' || source === 'rmc';
    }

    if (this.isCurrentActorRmc()) {
      return source === 'hos' || source === 'reviewer1' || source === 'reviewer2';
    }
    if (this.isCurrentActorRdigChair()) {
      return (
        source === 'rmc' || source === 'hos' || source === 'reviewer1' || source === 'reviewer2'
      );
    }
    if (this.isCurrentActorVc()) {
      return (
        source === 'rdig_chair' ||
        source === 'rmc' ||
        source === 'hos' ||
        source === 'reviewer1' ||
        source === 'reviewer2'
      );
    }
    if (this.isCurrentActorCeo()) {
      return (
        source === 'vc' ||
        source === 'rdig_chair' ||
        source === 'rmc' ||
        source === 'hos' ||
        source === 'reviewer1' ||
        source === 'reviewer2'
      );
    }
    return false;
  }

  /** The source identity of the currently logged-in viewer, if they are a comment author. */
  private currentUserSource(): CommentSource | null {
    if (this.isCurrentActorHos()) return 'hos';
    if (this.isCurrentActorRmc()) return 'rmc';
    if (this.isCurrentUserReviewer(1)) return 'reviewer1';
    if (this.isCurrentUserReviewer(2)) return 'reviewer2';
    if (this.isCurrentActorRdigChair()) return 'rdig_chair';
    if (this.isCurrentActorVc()) return 'vc';
    if (this.isCurrentActorCeo()) return 'ceo';
    return null;
  }

  isCurrentUserSource(source: CommentSource): boolean {
    return source === this.currentUserSource();
  }

  /**
   * Sources shown in the right-side comment summary. A reviewer also sees their
   * own source and counter there; their inline comments remain always visible.
   */
  readonly permittedSources = computed(() => {
    const isReviewer = this.isCurrentUserReviewer(1) || this.isCurrentUserReviewer(2);
    return this.allSources.filter(
      (source) =>
        this.canViewSource(source) && (source !== this.currentUserSource() || isReviewer),
    );
  });

  /** Total (current + past version) comment count for a source — the toggle's counter badge. */
  commentCountForSource(source: CommentSource): number {
    if (source === 'rdig_chair' || source === 'vc' || source === 'ceo') {
      return this.wholeFormComment(source) ? 1 : 0;
    }
    return this.sectionComments().filter((c) => this.matchesSource(c, source)).length;
  }

  // ── Field-level comment definitions (Reviewer 1 / Reviewer 2 only, spec §11) ───
  readonly teamFields: FieldCommentDef[] = [
    { fieldCode: 'team_members_group', label: 'Team Combination and Expertise', maxScore: 10 },
  ];

  readonly projectFields: FieldCommentDef[] = [
    { fieldCode: 'project_classification', label: 'Application Type / Classification' },
    { fieldCode: 'project_title', label: 'Project Title' },
    { fieldCode: 'project_research_area', label: 'Research Area' },
    { fieldCode: 'project_esg', label: 'Appropriate ESGs' },
    { fieldCode: 'project_sdg', label: 'Appropriate SDGs' },
    { fieldCode: 'project_summary', label: 'Executive Summary', maxScore: 10 },
    { fieldCode: 'project_keywords', label: 'Keywords' },
    { fieldCode: 'project_intro', label: 'Introduction', maxScore: 10 },
    { fieldCode: 'project_problem', label: 'Problem Statement', maxScore: 5 },
    { fieldCode: 'project_aim', label: 'Research Aims and Objectives', maxScore: 5 },
    { fieldCode: 'project_questions', label: 'Research Questions', maxScore: 10 },
    { fieldCode: 'project_hypothesis', label: 'Hypothesis / Propositions', maxScore: 10 },
    { fieldCode: 'project_lit_review', label: 'Literature Review', maxScore: 10 },
    { fieldCode: 'project_methodology', label: 'Research Methodology', maxScore: 10 },
    { fieldCode: 'project_references', label: 'References' },
    {
      fieldCode: 'project_benefits',
      label: 'Benefits of Grant Utilisation to APU, Students and Stakeholders',
      maxScore: 10,
    },
    { fieldCode: 'project_vision', label: 'APU Vision and Mission Alignment' },
    { fieldCode: 'project_activities', label: 'Research Activities' },
  ];

  readonly outputBudgetFields: FieldCommentDef[] = [
    { fieldCode: 'output_overall', label: 'Research Outputs' },
    { fieldCode: 'budget_breakdown', label: 'Budget Breakdown' },
    { fieldCode: 'budget_summary', label: 'Budget - Fit for Purpose', maxScore: 10 },
  ];

  private readonly allFieldDefs: FieldCommentDef[] = [
    ...this.teamFields,
    ...this.projectFields,
    ...this.outputBudgetFields,
  ];
  private readonly scoredFieldDefs = this.allFieldDefs.filter((field) => field.maxScore != null);

  readonly fieldLabels: Record<string, string> = Object.fromEntries(
    this.allFieldDefs.map((f) => [f.fieldCode, f.label]),
  );
  private readonly fieldDefByCode = new Map(this.allFieldDefs.map((f) => [f.fieldCode, f]));

  fieldDef(fieldCode: string): FieldCommentDef | undefined {
    return this.fieldDefByCode.get(fieldCode);
  }

  /** Max possible total — sum of maxScore across every scoreable field. */
  private readonly maxTotalScore = this.scoredFieldDefs
    .reduce((sum, f) => sum + (f.maxScore ?? 0), 0);

  /**
   * Sum of a reviewer's own scores across every scoreable field, for the current
   * review cycle. The current reviewer sees live draft values immediately; other
   * viewers see the independently persisted score sheet.
   */
  private reviewerTotalScore(actor: ReviewerActor): number {
    return this.scoredFieldDefs
      .reduce((sum, f) => {
        const score = this.scoreForField(f.fieldCode, actor);
        return sum + (score ?? 0);
      }, 0);
  }

  /** Reviewer 1's own total score — only meaningful/shown to Reviewer 1 themselves. */
  readonly reviewer1TotalScore = computed(() => this.reviewerTotalScore('reviewer1'));
  /** Reviewer 2's own total score — only meaningful/shown to Reviewer 2 themselves. */
  readonly reviewer2TotalScore = computed(() => this.reviewerTotalScore('reviewer2'));
  readonly maxTotalScoreValue = this.maxTotalScore;

  /** True once the reviewer has recorded at least one score this version — live draft or saved. */
  hasReviewerScored(actor: ReviewerActor): boolean {
    return this.scoredFieldDefs.some((field) => this.scoreForField(field.fieldCode, actor) !== null);
  }

  /** Minimum total score (out of 100) a reviewer needs before Approve is offered. */
  readonly approveScoreThreshold = computed(
    () => this.reviewerScoreSheet()?.approval_threshold ?? 70,
  );

  /** The CURRENT viewer's own total score, when they are Reviewer 1 or Reviewer 2 — 0 otherwise. */
  readonly reviewerOwnTotalScore = computed(() => {
    if (this.isCurrentUserReviewer(1)) return this.reviewer1TotalScore();
    if (this.isCurrentUserReviewer(2)) return this.reviewer2TotalScore();
    return 0;
  });

  hasAnyReviewerScoreDraft(): boolean {
    const actor = this.currentReviewerActor();
    return actor ? this.hasReviewerScored(actor) : false;
  }

  /**
   * Approve is hidden (not merely disabled) for Reviewer 1/2 once they've started
   * scoring and their running total falls below the threshold — a reviewer who
   * hasn't scored anything yet still sees Approve, since "below threshold" isn't
   * meaningful until there's a score to judge.
   */
  isActionHiddenForLowScore(action: WorkflowActionDto): boolean {
    if (!(this.isCurrentUserReviewer(1) || this.isCurrentUserReviewer(2))) return false;
    if (this.actionTone(action) !== 'positive') return false;
    return (
      this.missingRequiredScoreLabels().length === 0 &&
      this.reviewerOwnTotalScore() < this.approveScoreThreshold()
    );
  }

  /** One FormControl per reviewer field comment, created lazily. */
  private readonly fieldCommentControls = new Map<string, FormControl<string | null>>();
  private readonly fieldScoreControls = new Map<string, FormControl<string | null>>();
  /** Signal mirror of each score control's live value, so the total updates as the reviewer picks a score. */
  private readonly fieldScoreSignals = new Map<string, ReturnType<typeof signal<string | null>>>();
  private readonly fieldCommentSignals = new Map<
    FormControl<string | null>,
    ReturnType<typeof signal<string | null>>
  >();

  private fieldKey(fieldCode: string, actor: ReviewerActor): string {
    return `${fieldCode}::${actor}`;
  }

  fieldCommentControl(fieldCode: string, actor: ReviewerActor): FormControl<string | null> {
    const key = this.fieldKey(fieldCode, actor);
    let control = this.fieldCommentControls.get(key);
    if (!control) {
      control = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
      this.fieldCommentControls.set(key, control);
    }
    return control;
  }

  /** Draft text currently in a reviewer field comment box (reactive). */
  fieldCommentDraft(fieldCode: string, actor: ReviewerActor): string {
    return this.liveText(this.fieldCommentControl(fieldCode, actor), this.fieldCommentSignals);
  }

  fieldScoreControl(fieldCode: string, actor: ReviewerActor): FormControl<string | null> {
    const key = this.fieldKey(fieldCode, actor);
    let control = this.fieldScoreControls.get(key);
    if (!control) {
      control = new FormControl('');
      this.fieldScoreControls.set(key, control);
      const mirror = signal(control.value);
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((v) => mirror.set(v));
      this.fieldScoreSignals.set(key, mirror);
    }
    return control;
  }

  /** Live (not-yet-submitted) score for a field, reactive to every user edit. */
  private liveFieldScore(fieldCode: string, actor: ReviewerActor): number | null {
    const key = this.fieldKey(fieldCode, actor);
    if (!this.fieldScoreSignals.has(key)) this.fieldScoreControl(fieldCode, actor);
    const raw = this.fieldScoreSignals.get(key)?.();
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private currentReviewerActor(): ReviewerActor | null {
    if (this.isCurrentUserReviewer(1)) return 'reviewer1';
    if (this.isCurrentUserReviewer(2)) return 'reviewer2';
    return null;
  }

  private savedReviewerReview(actor: ReviewerActor): RdigReviewerReviewDto | null {
    const reviewerNo = actor === 'reviewer1' ? 1 : 2;
    return this.reviewerScoreSheet()?.reviews.find((review) => review.reviewer_no === reviewerNo) ?? null;
  }

  private savedFieldScore(fieldCode: string, actor: ReviewerActor): number | null {
    return (
      this.savedReviewerReview(actor)?.scores.find((score) => score.criterion_code === fieldCode)
        ?.score ?? null
    );
  }

  scoreForField(fieldCode: string, actor: ReviewerActor): number | null {
    if (this.currentReviewerActor() === actor) {
      const live = this.liveFieldScore(fieldCode, actor);
      if (live !== null) return live;
    }
    return this.savedFieldScore(fieldCode, actor);
  }

  scoreOptions(maximum: number): number[] {
    return Array.from({ length: maximum + 1 }, (_, index) => index);
  }

  canEditFieldScore(actor: ReviewerActor): boolean {
    return this.canWriteFieldComment(actor);
  }

  private hydrateScoreControls(): void {
    const actor = this.currentReviewerActor();
    if (!actor) return;
    this.scoredFieldDefs.forEach((field) => {
      const saved = this.savedFieldScore(field.fieldCode, actor);
      this.fieldScoreControl(field.fieldCode, actor).setValue(
        saved === null ? '' : String(saved),
        { emitEvent: true },
      );
    });
  }

  readonly missingRequiredScoreLabels = computed(() => {
    const actor = this.currentReviewerActor();
    if (!actor) return [];
    return this.scoredFieldDefs
      .filter((field) => this.scoreForField(field.fieldCode, actor) === null)
      .map((field) => field.label);
  });

  readonly requiredScoreCount = this.scoredFieldDefs.length;

  completedReviewerScoreCount(): number {
    return this.requiredScoreCount - this.missingRequiredScoreLabels().length;
  }

  hasUnsavedReviewerScores(): boolean {
    const actor = this.currentReviewerActor();
    if (!actor) return false;
    return this.scoredFieldDefs.some(
      (field) => this.liveFieldScore(field.fieldCode, actor) !== this.savedFieldScore(field.fieldCode, actor),
    );
  }

  private reviewerScorePayload(): Array<{ criterion_code: string; score: number }> {
    const actor = this.currentReviewerActor();
    if (!actor) return [];
    return this.scoredFieldDefs.flatMap((field) => {
      const score = this.scoreForField(field.fieldCode, actor);
      return score === null ? [] : [{ criterion_code: field.fieldCode, score }];
    });
  }

  private saveReviewerScores$(): Observable<unknown> {
    if (this.requestId == null || !this.currentReviewerActor()) return of(null);
    const scores = this.reviewerScorePayload();
    if (!scores.length || !this.hasUnsavedReviewerScores()) return of(null);
    this.scoresSaving.set(true);
    return this.requests.saveRdigReviewerScores(this.requestId, { scores }).pipe(
      tap(({ data }) => this.reviewerScoreSheet.set(data)),
      finalize(() => this.scoresSaving.set(false)),
    );
  }

  saveReviewerScores(): void {
    if (this.scoresSaving() || !this.hasUnsavedReviewerScores()) return;
    this.feedback.set(null);
    this.saveReviewerScores$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.feedback.set({ type: 'success', text: 'Reviewer scores saved.' }),
        error: (err) => {
          const message = err?.error?.message || 'Could not save reviewer scores.';
          this.feedback.set({ type: 'error', text: message });
        },
      });
  }

  /**
   * Mirrors a text FormControl's live value as a signal, so drafts can gate action
   * buttons reactively. Uses a plain signal fed by a subscription (not `toSignal`)
   * because this is called lazily from template getters — inside a reactive/change
   * detection context, where `toSignal()` itself is forbidden (NG0602).
   */
  private liveText(
    control: FormControl<string | null>,
    signals: Map<FormControl<string | null>, ReturnType<typeof signal<string | null>>>,
  ): string {
    let mirror = signals.get(control);
    if (!mirror) {
      mirror = signal(control.value);
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((v) => mirror!.set(v));
      signals.set(control, mirror);
    }
    return (mirror() ?? '').trim();
  }

  // ── HOS / RMC — one comment per group, per submission version ──────────────────
  private readonly groupCommentControls = new Map<string, FormControl<string | null>>();
  private readonly groupCommentSignals = new Map<
    FormControl<string | null>,
    ReturnType<typeof signal<string | null>>
  >();

  private groupKey(group: GroupCode, actor: GroupActor): string {
    return `${group}::${actor}`;
  }

  groupCommentControl(group: GroupCode, actor: GroupActor): FormControl<string | null> {
    const key = this.groupKey(group, actor);
    let control = this.groupCommentControls.get(key);
    if (!control) {
      control = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
      this.groupCommentControls.set(key, control);
    }
    return control;
  }

  /** Draft text currently in a group's comment box (reactive). */
  groupCommentDraft(group: GroupCode, actor: GroupActor): string {
    return this.liveText(this.groupCommentControl(group, actor), this.groupCommentSignals);
  }

  readonly groups: GroupCode[] = ['team', 'project', 'output_budget', 'declaration'];
  groupLabel(group: GroupCode): string {
    return GROUP_LABEL[group];
  }

  // ── RDIG Chair / VC / CEO — single whole-form comment (right-side panel) ───────
  readonly rdigChairCommentControl = new FormControl('', [
    Validators.maxLength(COMMENT_MAX_LENGTH),
  ]);
  readonly vcCommentControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  readonly ceoCommentControl = new FormControl('', [Validators.maxLength(COMMENT_MAX_LENGTH)]);
  private readonly wholeFormCommentSignals = new Map<
    FormControl<string | null>,
    ReturnType<typeof signal<string | null>>
  >();

  /** Draft text currently in a whole-form comment box (reactive). */
  wholeFormCommentDraft(role: WholeFormActor): string {
    return this.liveText(this.wholeFormControl(role), this.wholeFormCommentSignals);
  }

  private wholeFormControl(role: WholeFormActor): FormControl<string | null> {
    return role === 'rdig_chair'
      ? this.rdigChairCommentControl
      : role === 'vc'
        ? this.vcCommentControl
        : this.ceoCommentControl;
  }

  readonly request = computed(() => this.data()?.request ?? null);
  readonly rdig = computed(() => this.data()?.rdig ?? null);
  readonly coResearchers = computed(() => this.data()?.apu_co_researchers ?? []);
  readonly collaborators = computed(() => this.data()?.collaborators ?? []);
  readonly researchActivities = computed(() => this.data()?.research_activities ?? []);
  readonly budgetSections = computed(() => this.data()?.budget_sections ?? []);
  readonly budgetItems = computed(() => this.data()?.budget_items ?? []);
  readonly attachments = computed(() => this.data()?.attachments ?? []);

  readonly coResearcherColumns: readonly DataTableColumn[] = [
    { key: 'name', label: 'Staff Name', width: '200px' },
    { key: 'department', label: 'School / Department', width: '200px' },
    { key: 'expertise', label: 'Area of Expertise', width: '220px' },
    { key: 'role', label: 'Roles in Project', width: '220px' },
  ];
  readonly collaboratorColumns: readonly DataTableColumn[] = [
    { key: 'title', label: 'Title', width: '90px' },
    { key: 'name', label: 'Full Name', width: '180px' },
    { key: 'email', label: 'Email Address', width: '200px' },
    { key: 'institution', label: 'Institution / Company', width: '200px' },
    { key: 'orgType', label: 'Type of Organisation', width: '180px' },
    { key: 'position', label: 'Position / Designation', width: '180px' },
    { key: 'department', label: 'School / Dept / Faculty', width: '200px' },
    { key: 'country', label: 'Country', width: '120px' },
    { key: 'funding', label: 'Matched Funding', width: '150px' },
    { key: 'roles', label: 'Roles of Collaborator', width: '220px' },
    { key: 'supportLetter', label: 'Support Letter', width: '130px' },
  ];
  readonly budgetColumns: readonly DataTableColumn[] = [
    { key: 'description', label: 'Description of Expense', width: '340px' },
    { key: 'amount', label: 'Amount (RM)', width: '160px' },
    { key: 'remarks', label: 'Remarks', width: '260px' },
  ];

  readonly coResearcherRows = computed(() =>
    this.coResearchers().map((item) => ({
      name: this.val(item.staff_name),
      department: this.val(item.staff_department),
      expertise: this.val(item.area_of_expertise),
      role: this.val(item.role_in_project),
    })),
  );
  readonly collaboratorRows = computed(() =>
    this.collaborators().map((item) => ({
      title: this.val(item.title),
      name: this.val(item.full_name),
      email: this.val(item.email),
      institution: this.val(item.institution_company_name),
      orgType: this.val(item.organisation_type),
      position: this.val(item.position),
      department: this.val(item.department),
      country: this.val(item.country_code),
      funding: this.fmtMoney(item.matched_funding_amount),
      roles: this.val(item.role_in_project),
      supportLetter: item.support_letter_attachment_id ? 'Attached' : '—',
    })),
  );
  /**
   * Gantt chart — reuses the same activity data as the table (no separate model),
   * matching the Application Form View's Research Activities Gantt preview.
   * The month axis spans 0 through the longer of the project duration or the
   * furthest activity end month, so every activity is always fully visible.
   */
  readonly ganttMonths = computed(() => {
    const durationMonths = this.toNumber(this.rdig()?.project_duration_months);
    const furthestEnd = this.researchActivities().reduce(
      (max, item) => Math.max(max, this.toNumber(item.end_month)),
      0,
    );
    const span = Math.max(durationMonths, furthestEnd, 1);
    return Array.from({ length: span + 1 }, (_, i) => i);
  });

  ganttTimeline(startMonth: unknown, endMonth: unknown): boolean[] {
    const start = this.toNumber(startMonth);
    const end = this.toNumber(endMonth);
    return this.ganttMonths().map((month) => month >= start && month <= end && end >= start);
  }
  readonly budgetSectionsWithItems = computed(() =>
    this.budgetSections().map((section) => ({
      section,
      rows: this.budgetItems()
        .filter((item) => item.rdig_budget_section_id === (section.id ?? section.budget_section_id))
        .map((item) => ({
          description: this.val(item.description),
          amount: this.fmtMoney(item.amount_rm),
          remarks: this.val(item.remarks),
        })),
    })),
  );

  private readonly budgetSectionTitles: Readonly<Record<string, string>> = {
    V11000: 'V11000 - Student Allowances',
    V21000: 'V21000 - Travelling and Accommodation',
    V27000: 'V27000 - Research Materials & Supplies',
    V29000: 'V29000 - Special Services',
  };

  budgetSectionTitle(section: RdigBudgetSectionDto): string {
    const code = (section.section_code ?? '').trim().toUpperCase();
    const canonicalTitle = this.budgetSectionTitles[code];
    if (canonicalTitle) return canonicalTitle;

    const name = section.section_name?.trim() ?? '';
    return code && name ? `${code} - ${name}` : name || code || 'Budget Section';
  }

  readonly totalBudget = computed(() => this.toNumber(this.rdig()?.total_budget_request));
  readonly totalTeamSize = computed(
    () => this.coResearchers().length + this.collaborators().length,
  );
  readonly researchClusterLabel = computed(() =>
    this.val(
      this.rdig()?.research_cluster_name_snapshot ||
        this.rdig()?.research_cluster_name ||
        this.rdig()?.research_cluster_id,
    ),
  );
  readonly researchDomainLabel = computed(() =>
    this.val(
      this.rdig()?.research_domain_name_snapshot ||
        this.rdig()?.research_domain_name ||
        this.rdig()?.research_domain_id,
    ),
  );
  readonly subResearchDomainLabel = computed(() =>
    this.val(
      this.rdig()?.sub_research_domain_name_snapshot ||
        this.rdig()?.sub_research_domain_name ||
        this.rdig()?.sub_research_domain_id,
    ),
  );
  readonly esgLabel = computed(() =>
    this.joinSelectionNames(
      this.data()?.esg_selections,
      'esg_name_snapshot',
      'esg_id',
      this.rdig()?.esg_names || this.rdig()?.esgs,
    ),
  );
  readonly sdgLabel = computed(() =>
    this.joinSelectionNames(
      this.data()?.sdg_selections,
      'sdg_name_snapshot',
      'sdg_id',
      this.rdig()?.sdg_names || this.rdig()?.sdgs,
    ),
  );

  readonly currentStageWindowTitle = computed(() => {
    const stage = this.currentWorkflowStageMeta();
    return stage?.label ?? 'Current Stage';
  });

  readonly currentBatchName = computed(() => this.val(this.request()?.batch?.batch_name));

  readonly currentStageWindowOpensLabel = computed(() => {
    const stage = this.currentWorkflowStageMeta();
    return this.fmtDate(this.stageWindowForLabel(stage?.label)?.stage_start_date);
  });

  readonly currentStageWindowClosesLabel = computed(() => {
    const stage = this.currentWorkflowStageMeta();
    return this.fmtDate(this.stageWindowForLabel(stage?.label)?.stage_end_date);
  });

  private currentWorkflowStageMeta() {
    const normalizedStatus = this.status();
    return (
      WORKFLOW_STAGE_META.find((stage) =>
        stage.rdigStatuses.some((status) => status.toLowerCase() === normalizedStatus),
      ) ?? null
    );
  }

  private stageWindowLabel(stageLabel: string): string {
    const window = this.stageWindowForLabel(stageLabel);
    const start = this.fmtDate(window?.stage_start_date);
    const end = this.fmtDate(window?.stage_end_date);
    if (start === '—' && end === '—') return '—';
    return `${start} – ${end}`;
  }

  private stageWindowForLabel(stageLabel: string | null | undefined) {
    if (!stageLabel) return null;
    return (
      this.request()?.batch?.stage_windows?.find(
        (stage) => stage.stage_name.trim().toLowerCase() === stageLabel.trim().toLowerCase(),
      ) ?? null
    );
  }

  private joinSelectionNames<T extends object>(
    selections: T[] | null | undefined,
    nameKey: keyof T,
    idKey: keyof T,
    fallback: unknown,
  ): string {
    const values = (selections ?? [])
      .map((item) => item[nameKey] || item[idKey])
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));
    return values.length ? values.join(', ') : this.val(fallback);
  }

  // ── Reviewer identity ──────────────────────────────────────────────────────
  private readonly reviewer1Username = computed(() => this.reviewerUsernameByNo(1));
  private readonly reviewer2Username = computed(() => this.reviewerUsernameByNo(2));

  private reviewerUsernameByNo(reviewerNo: 1 | 2): string | null {
    const reviewers = this.request()?.rdig_reviewers ?? [];
    const match = reviewers.find((r) => r.reviewer_no === reviewerNo && r.is_active);
    return match?.username?.trim().toLowerCase() ?? null;
  }

  private isCurrentUserReviewer(reviewerNo: 1 | 2): boolean {
    const currentUsername = this.authService.currentUser()?.username?.trim().toLowerCase();
    if (!currentUsername) return false;
    const reviewerUsername = reviewerNo === 1 ? this.reviewer1Username() : this.reviewer2Username();
    return Boolean(reviewerUsername && reviewerUsername === currentUsername);
  }

  /** Template-facing identity checks — each reviewer sees only their own score counter. */
  isCurrentUserReviewer1(): boolean {
    return this.isCurrentUserReviewer(1);
  }
  isCurrentUserReviewer2(): boolean {
    return this.isCurrentUserReviewer(2);
  }
  isCurrentActorRmcPublic(): boolean {
    return this.isCurrentActorRmc();
  }

  private currentActorRole(): string {
    return (this.request()?.current_actor_role ?? '').toLowerCase();
  }

  private isCurrentActorHos(): boolean {
    const a = this.currentActorRole();
    return a.includes('hos') || a.includes('hod');
  }
  private isCurrentActorRmc(): boolean {
    return this.currentActorRole().includes('rmc');
  }
  private isCurrentActorRdigChair(): boolean {
    const a = this.currentActorRole();
    return a.includes('rdig_chair') || a.includes('rdigchair') || a.includes('chair');
  }
  private isCurrentActorVc(): boolean {
    return this.currentActorRole().includes('vc');
  }
  private isCurrentActorCeo(): boolean {
    return this.currentActorRole().includes('ceo');
  }

  // ── Status / editable-window gates (mirrors RdigWorkflowService's stage gates) ──
  private status(): string {
    return (this.request()?.status_code ?? '').trim().toLowerCase();
  }
  private isHosEditableStatus(): boolean {
    const s = this.status();
    return s === 'pending_hos' || s === 'pending_hos_review';
  }
  private isRmcEditableStatus(): boolean {
    const s = this.status();
    return s === 'pending_rmc' || s === 'pending_rmc_review';
  }
  private isReviewerEditableStatus(): boolean {
    return this.status() === 'pending_reviewers';
  }
  private isRdigChairEditableStatus(): boolean {
    return this.status() === 'pending_rdig_chair';
  }
  private isVcEditableStatus(): boolean {
    return this.status() === 'pending_vc';
  }
  private isCeoEditableStatus(): boolean {
    return this.status() === 'pending_ceo';
  }

  canWriteGroupComment(actor: GroupActor): boolean {
    if (actor === 'hos')
      return this.canAct() && this.isCurrentActorHos() && this.isHosEditableStatus();
    return this.canAct() && this.isCurrentActorRmc() && this.isRmcEditableStatus();
  }

  canWriteFieldComment(actor: ReviewerActor): boolean {
    if (actor === 'reviewer1')
      return this.canAct() && this.isCurrentUserReviewer(1) && this.isReviewerEditableStatus();
    return this.canAct() && this.isCurrentUserReviewer(2) && this.isReviewerEditableStatus();
  }

  canWriteWholeFormComment(role: WholeFormActor): boolean {
    if (role === 'rdig_chair')
      return this.canAct() && this.isCurrentActorRdigChair() && this.isRdigChairEditableStatus();
    if (role === 'vc') return this.canAct() && this.isCurrentActorVc() && this.isVcEditableStatus();
    return this.canAct() && this.isCurrentActorCeo() && this.isCeoEditableStatus();
  }

  /** True while the current viewer uses the whole-form side panel (RDIG Chair/VC/CEO). */
  isWholeFormCommentViewer(): boolean {
    return this.isCurrentActorRdigChair() || this.isCurrentActorVc() || this.isCurrentActorCeo();
  }

  currentActorLabel(): string {
    if (this.isCurrentActorHos()) return 'HOS';
    if (this.isCurrentActorRmc()) return 'RMC';
    if (this.isCurrentUserReviewer(1)) return 'Reviewer 1';
    if (this.isCurrentUserReviewer(2)) return 'Reviewer 2';
    if (this.isCurrentActorRdigChair()) return 'RDIG Chair';
    if (this.isCurrentActorVc()) return 'Vice Chancellor';
    if (this.isCurrentActorCeo()) return 'CEO';
    return this.prettyActor(this.request()?.current_actor_role ?? null);
  }

  // ── Submission-version approximation ────────────────────────────────────────
  readonly currentSubmissionVersion = computed(() => this.resubmissionBoundaries().length + 1);

  private resubmissionBoundaries(): number[] {
    return this.approvals()
      .filter((a) => (a.to_status_code ?? '').toLowerCase().startsWith(RESUBMISSION_STATUS_PREFIX))
      .map((a) => this.parseTime(a.action_at))
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);
  }

  commentSubmissionVersion(comment: RequestCommentDto): number {
    const createdAt = this.parseTime(comment.created_at);
    if (createdAt === null) return this.currentSubmissionVersion();
    let version = 1;
    for (const boundary of this.resubmissionBoundaries()) {
      if (createdAt >= boundary) version += 1;
    }
    return version;
  }

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
            this.error.set('Unable to find this RDIG application.');
            this.loading.set(false);
          },
        });
      return;
    }

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
      this.error.set('This RDIG application has no valid request id.');
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
      form: this.rdigApi.getForm(id),
      approvals: this.requests.getApprovals(id, { page: 1, perPage: 100 }),
      comments: this.requests.getComments(id),
      scores: this.requests.getRdigReviewerScores(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ form, approvals, comments, scores }) => {
          this.data.set(form.data);
          this.actions.set((form.data.request?.available_actions ?? []) as WorkflowActionDto[]);
          this.canAct.set(Boolean(form.data.request?.can_act));
          this.approvals.set(approvals.data?.items ?? []);
          this.sectionComments.set(
            ((comments.data ?? []) as ScoredComment[]).filter(
              (comment) => comment.comment_type === 'section_review',
            ),
          );
          this.reviewerScoreSheet.set(scores.data);
          this.hydrateWholeFormControls();
          this.hydrateGroupControls();
          this.hydrateScoreControls();
        },
        error: () => this.error.set('Unable to load this RDIG application.'),
      });
  }

  private hydrateWholeFormControls(): void {
    (['rdig_chair', 'vc', 'ceo'] as WholeFormActor[]).forEach((role) => {
      const mine = this.sectionComments().find(
        (c) => c.section_code === WHOLE_FORM_FIELD_CODE[role] && this.isCurrentUserComment(c),
      );
      if (mine) this.wholeFormControl(role).setValue(mine.comment_text ?? '');
    });
  }

  private hydrateGroupControls(): void {
    (['hos', 'rmc'] as GroupActor[]).forEach((actor) => {
      this.groups.forEach((group) => {
        const mine = this.currentVersionGroupComment(group, actor);
        if (mine && this.isCurrentUserComment(mine)) {
          this.groupCommentControl(group, actor).setValue(mine.comment_text ?? '');
        }
      });
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

  fmtMoney(value: unknown): string {
    return formatMyrCurrency(value, 'RM 0.00');
  }

  fmtFileSize(value: unknown): string {
    const bytes = this.toNumber(value);
    if (!bytes) return 'File size unavailable';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  actionType(action: WorkflowActionDto): 'primary' | 'danger' | 'secondary' {
    const code = action.action_code.toLowerCase();
    if (code.includes('approve') || code.includes('submit')) return 'primary';
    if (code.includes('reject')) return 'danger';
    return 'secondary';
  }

  /**
   * Semantic colour tone for a workflow action button — Approve (green),
   * Request Resubmission (yellow/amber), Reject (red), everything else neutral.
   * Checked in this order because "resubmission" must never fall through to the
   * default 'positive' (green) tone just because it also contains "sub".
   */
  actionTone(
    action: WorkflowActionDto,
  ): 'positive' | 'resubmit' | 'verified' | 'negative' | 'neutral' {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (
      label.includes('reject') ||
      label.includes('not supported') ||
      label.includes('unverified') ||
      label.includes('not recommended')
    ) {
      return 'negative';
    }
    if (label.includes('resubmit') || label.includes('resubmission')) return 'resubmit';
    if (label.includes('approve') || label.includes('approval')) return 'positive';
    if (label.includes('verified') || label.includes('recommend')) return 'verified';
    return 'neutral';
  }

  actionIcon(action: WorkflowActionDto): string {
    const label = `${action.action_code} ${action.action_name}`.toLowerCase();
    if (label.includes('resubmit') || label.includes('resubmission')) return 'replay';
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
    if (label.includes('approve') || label.includes('approval')) return 'check';
    return 'arrow_forward';
  }

  approvalActionLabel(history: ApprovalDto): string {
    return history.action_name?.trim() || this.prettyActor(history.action_code);
  }

  prettyActor(code: string | null): string {
    if (!code) return '—';
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  }

  prettyActorRole(code: string | null): string {
    const value = (code ?? '').trim().toLowerCase();
    if (!value) return '—';
    if (value.includes('hos') || value.includes('hod')) return 'HOS';
    if (value.includes('rmc')) return 'RMC';
    if (value.includes('reviewer1') || value === 'reviewer_1') return 'Reviewer 1';
    if (value.includes('reviewer2') || value === 'reviewer_2') return 'Reviewer 2';
    if (value.includes('reviewer')) return 'Reviewer';
    if (value.includes('rdig_chair') || value.includes('rdigchair')) return 'RDIG Chair';
    if (value.includes('vc')) return 'Vice Chancellor';
    if (value.includes('ceo')) return 'CEO';
    if (value.includes('applicant')) return 'Applicant';
    return this.prettyActor(code);
  }

  entityLabel(entityType: string | null | undefined): string {
    const value = (entityType ?? '').trim().toLowerCase();
    const labels: Record<string, string> = {
      rdig_collaborator_support_letter: 'Collaborator Support Letter',
      rdig_budget_quotation: 'Budget Quotation',
      rdig_ethics_approval: 'Ethics Approval',
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

  requiresAllGroupComments(): boolean {
    return this.isCurrentActorHos() || this.isCurrentActorRmc();
  }

  /** Reviewer 1/2 must comment on every field before their action can proceed. */
  requiresAllFieldComments(): boolean {
    return this.isCurrentUserReviewer(1) || this.isCurrentUserReviewer(2);
  }

  /** RDIG Chair / VC / CEO must fill their one application-level comment before acting. */
  requiresWholeFormComment(): boolean {
    return this.isCurrentActorRdigChair() || this.isCurrentActorVc() || this.isCurrentActorCeo();
  }

  requiresDecisionComment(): boolean {
    const actor = this.currentActorRole();
    return (
      this.canAct() &&
      this.actions().length > 0 &&
      !this.requiresAllGroupComments() &&
      !this.requiresAllFieldComments() &&
      !this.requiresWholeFormComment() &&
      !actor.includes('applicant') &&
      !actor.includes('finance')
    );
  }

  canPerformActions(): boolean {
    if (this.requiresAllGroupComments()) return this.missingRequiredGroupLabels().length === 0;
    if (this.requiresAllFieldComments()) {
      return (
        this.missingRequiredFieldLabels().length === 0 &&
        this.missingRequiredScoreLabels().length === 0
      );
    }
    if (this.requiresWholeFormComment()) return this.hasRequiredWholeFormComment();
    if (this.requiresDecisionComment()) {
      const comment = (this.actionCommentControl.value ?? '').trim();
      return Boolean(comment) && this.actionCommentControl.valid;
    }
    return true;
  }

  /** Collapsed by default — the missing-comments list expands only on request. */
  readonly requirementListExpanded = signal(false);
  toggleRequirementList(): void {
    this.requirementListExpanded.update((v) => !v);
  }

  /** Short one-line summary shown when the requirement list is collapsed. */
  actionRequirementSummary(): string | null {
    if (this.requiresAllGroupComments()) {
      const missing = this.missingRequiredGroupLabels();
      return missing.length
        ? `${missing.length} comment${missing.length === 1 ? '' : 's'} still required.`
        : 'All required comments are complete. You can take action now.';
    }
    if (this.requiresAllFieldComments()) {
      const missingComments = this.missingRequiredFieldLabels().length;
      const missingScores = this.missingRequiredScoreLabels().length;
      if (!missingComments && !missingScores) {
        return 'All required comments and scores are complete. You can take action now.';
      }
      const parts = [];
      if (missingComments) parts.push(`${missingComments} comment${missingComments === 1 ? '' : 's'}`);
      if (missingScores) parts.push(`${missingScores} score${missingScores === 1 ? '' : 's'}`);
      return `${parts.join(' and ')} still required.`;
    }
    return null;
  }

  /** True when the requirement box has a detailed list worth expanding (group/field, not whole-form). */
  hasRequirementDetails(): boolean {
    return this.requiresAllGroupComments() || this.requiresAllFieldComments();
  }

  actionRequirementMessage(): string | null {
    if (this.requiresAllGroupComments()) {
      const missing = this.missingRequiredGroupLabels();
      return missing.length
        ? `Save section comments for: ${missing.join(', ')}.`
        : 'All required section comments are saved. You can take action now.';
    }
    if (this.requiresAllFieldComments()) {
      const missingComments = this.missingRequiredFieldLabels();
      const missingScores = this.missingRequiredScoreLabels();
      if (missingComments.length) return `Save comments for: ${missingComments.join(', ')}.`;
      if (missingScores.length) return `Enter scores for: ${missingScores.join(', ')}.`;
      return 'All required comments and scores are saved. You can take action now.';
    }
    if (this.requiresWholeFormComment()) {
      return this.hasRequiredWholeFormComment()
        ? 'Your comment is complete. You can take action now.'
        : 'Write your comment before taking action.';
    }
    if (this.requiresDecisionComment()) {
      if (this.actionCommentControl.hasError('maxlength')) {
        return `Your comment cannot exceed ${this.commentMaxLength} characters.`;
      }
      return 'Write your comment before taking action.';
    }
    return null;
  }

  /** HOS/RMC must write a comment (draft or already-saved) on every group before acting. */
  readonly missingRequiredGroupLabels = computed(() => {
    if (!this.requiresAllGroupComments()) return [];
    const actor: GroupActor = this.isCurrentActorHos() ? 'hos' : 'rmc';
    return this.groups
      .filter((g) => !this.hasCurrentActorGroupComment(g, actor))
      .map((g) => this.groupLabel(g));
  });

  /** Reviewer 1/2 must save a comment for each of the 11 scored areas before acting. */
  readonly missingRequiredFieldLabels = computed(() => {
    if (!this.requiresAllFieldComments()) return [];
    const actor: ReviewerActor = this.isCurrentUserReviewer(1) ? 'reviewer1' : 'reviewer2';
    return this.scoredFieldDefs
      .filter((f) => !this.hasCurrentActorFieldComment(f.fieldCode, actor))
      .map((f) => f.label);
  });

  /** DOM id for a field's comment editor, so the requirement list can scroll straight to it. */
  fieldCommentAnchorId(fieldCode: string, actor: ReviewerActor): string {
    return `field-comment-${fieldCode}-${actor}`;
  }

  fieldScoreAnchorId(fieldCode: string, actor: ReviewerActor): string {
    return `field-score-${fieldCode}-${actor}`;
  }

  /** Missing required comments, paired with the DOM id to scroll to when clicked. */
  readonly missingRequirementItems = computed(() => {
    if (this.requiresAllGroupComments()) {
      const actor: GroupActor = this.isCurrentActorHos() ? 'hos' : 'rmc';
      return this.groups
        .filter((g) => !this.hasCurrentActorGroupComment(g, actor))
        .map((g) => ({ label: this.groupLabel(g), anchorId: GROUP_SECTION_ID[g] }));
    }
    if (this.requiresAllFieldComments()) {
      const actor: ReviewerActor = this.isCurrentUserReviewer(1) ? 'reviewer1' : 'reviewer2';
      const commentItems = this.scoredFieldDefs
        .filter((f) => !this.hasCurrentActorFieldComment(f.fieldCode, actor))
        .map((f) => ({ label: `${f.label} comment`, anchorId: this.fieldCommentAnchorId(f.fieldCode, actor) }));
      const scoreItems = this.scoredFieldDefs
        .filter((f) => this.scoreForField(f.fieldCode, actor) === null)
        .map((f) => ({ label: `${f.label} score`, anchorId: this.fieldScoreAnchorId(f.fieldCode, actor) }));
      return [...commentItems, ...scoreItems];
    }
    return [];
  });

  /** Smoothly scrolls the main content to a missing comment's field/section. */
  scrollToRequirementItem(anchorId: string): void {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** RDIG Chair/VC/CEO must have a non-empty whole-form comment (draft or already-saved) before acting. */
  hasRequiredWholeFormComment(): boolean {
    const role: WholeFormActor = this.isCurrentActorRdigChair()
      ? 'rdig_chair'
      : this.isCurrentActorVc()
        ? 'vc'
        : 'ceo';
    const existing = this.wholeFormComment(role);
    if (existing && this.isCurrentUserComment(existing)) return true;
    return Boolean(this.wholeFormCommentDraft(role));
  }

  // ── HOS / RMC group comments: read ──────────────────────────────────────────
  commentsForGroup(group: GroupCode, actor: GroupActor): ScoredComment[] {
    const source: CommentSource = actor;
    return this.sectionComments()
      .filter((c) => c.section_code === GROUP_FIELD_CODE[group] && this.matchesSource(c, source))
      .sort((a, b) => (this.parseTime(b.created_at) ?? 0) - (this.parseTime(a.created_at) ?? 0));
  }

  currentVersionGroupComment(group: GroupCode, actor: GroupActor): ScoredComment | null {
    const version = this.currentSubmissionVersion();
    return (
      this.commentsForGroup(group, actor).find(
        (c) => this.commentSubmissionVersion(c) === version,
      ) ?? null
    );
  }

  historyGroupComments(group: GroupCode, actor: GroupActor): ScoredComment[] {
    const version = this.currentSubmissionVersion();
    return this.commentsForGroup(group, actor).filter(
      (c) => this.commentSubmissionVersion(c) !== version,
    );
  }

  hasCurrentActorGroupComment(group: GroupCode, actor: GroupActor): boolean {
    const comment = this.currentVersionGroupComment(group, actor);
    return Boolean(comment && this.isCurrentUserComment(comment));
  }

  isEditingGroupComment(group: GroupCode, actor: GroupActor): boolean {
    const comment = this.currentVersionGroupComment(group, actor);
    return Boolean(comment && this.isEditingComment(comment.id));
  }

  startEditGroupComment(group: GroupCode, actor: GroupActor, comment: ScoredComment): void {
    if (!this.canChangeComment(comment, () => this.canWriteGroupComment(actor))) return;
    this.editingCommentId.set(comment.id);
    this.groupCommentControl(group, actor).setValue(comment.comment_text ?? '');
    this.feedback.set(null);
  }

  cancelEditGroupComment(group: GroupCode, actor: GroupActor): void {
    this.editingCommentId.set(null);
    this.groupCommentControl(group, actor).reset('');
  }

  deleteGroupComment(group: GroupCode, actor: GroupActor, comment: ScoredComment): void {
    if (!this.canChangeComment(comment, () => this.canWriteGroupComment(actor))) return;
    this.deleteComment(comment, () => {
      if (this.editingCommentId() === comment.id) this.cancelEditGroupComment(group, actor);
    });
  }

  canChangeGroupComment(group: GroupCode, actor: GroupActor, comment: ScoredComment): boolean {
    return this.canChangeComment(comment, () => this.canWriteGroupComment(actor));
  }

  isGroupCommentSaving(group: GroupCode, actor: GroupActor): boolean {
    return this.savingCommentKey() === this.groupKey(group, actor);
  }

  submitGroupComment(group: GroupCode, actor: GroupActor): void {
    const existing = this.currentVersionGroupComment(group, actor);
    if (existing && this.isEditingGroupComment(group, actor)) {
      this.updateGroupComment(group, actor, existing);
      return;
    }
    this.saveGroupComment(group, actor);
  }

  private saveGroupComment(group: GroupCode, actor: GroupActor): void {
    if (this.requestId == null || this.isGroupCommentSaving(group, actor)) return;
    if (this.currentVersionGroupComment(group, actor)) {
      this.feedback.set({ type: 'error', text: 'You already saved a comment for this section.' });
      return;
    }

    const control = this.groupCommentControl(group, actor);
    const commentText = this.groupCommentDraft(group, actor);
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    const key = this.groupKey(group, actor);
    this.savingCommentKey.set(key);
    this.feedback.set(null);
    this.requests
      .createSectionComment(this.requestId, {
        section_code: GROUP_FIELD_CODE[group],
        section_name: this.groupLabel(group),
        comment_text: commentText,
      })
      .pipe(
        finalize(() => this.savingCommentKey.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) => [data, ...comments]);
          control.reset('');
          this.feedback.set({ type: 'success', text: 'Section comment saved.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not save this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  private updateGroupComment(group: GroupCode, actor: GroupActor, comment: ScoredComment): void {
    if (this.requestId == null || this.isGroupCommentSaving(group, actor)) return;
    if (!this.canChangeGroupComment(group, actor, comment)) return;

    const control = this.groupCommentControl(group, actor);
    const commentText = this.groupCommentDraft(group, actor);
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    const key = this.groupKey(group, actor);
    this.savingCommentKey.set(key);
    this.feedback.set(null);
    this.requests
      .updateSectionComment(this.requestId, comment.id, { comment_text: commentText })
      .pipe(
        finalize(() => this.savingCommentKey.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) =>
            comments.map((item) => (item.id === data.id ? data : item)),
          );
          this.cancelEditGroupComment(group, actor);
          this.feedback.set({ type: 'success', text: 'Section comment updated.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not update this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  // ── Field-level comments (Reviewer 1 / Reviewer 2): read ────────────────────
  commentsForField(fieldCode: string, actor: ReviewerActor): ScoredComment[] {
    const source: CommentSource = actor;
    return this.sectionComments()
      .filter((c) => c.section_code === fieldCode && this.matchesSource(c, source))
      .sort((a, b) => (this.parseTime(b.created_at) ?? 0) - (this.parseTime(a.created_at) ?? 0));
  }

  currentVersionFieldComment(fieldCode: string, actor: ReviewerActor): ScoredComment | null {
    const version = this.currentSubmissionVersion();
    return (
      this.commentsForField(fieldCode, actor).find(
        (c) => this.commentSubmissionVersion(c) === version,
      ) ?? null
    );
  }

  hasCurrentActorFieldComment(fieldCode: string, actor: ReviewerActor): boolean {
    const comment = this.currentVersionFieldComment(fieldCode, actor);
    return Boolean(comment && this.isCurrentUserComment(comment));
  }

  historyFieldComments(fieldCode: string, actor: ReviewerActor): ScoredComment[] {
    const version = this.currentSubmissionVersion();
    return this.commentsForField(fieldCode, actor).filter(
      (c) => this.commentSubmissionVersion(c) !== version,
    );
  }

  private matchesSource(comment: RequestCommentDto, source: CommentSource): boolean {
    const code = (comment.actor_type_code ?? '').toLowerCase();
    switch (source) {
      case 'hos':
        return code.includes('hos') || code.includes('hod');
      case 'rmc':
        return code.includes('rmc');
      case 'reviewer1':
        return this.matchesReviewerSource(comment, 1);
      case 'reviewer2':
        return this.matchesReviewerSource(comment, 2);
      case 'rdig_chair':
        return code.includes('rdig_chair') || code.includes('rdigchair') || code.includes('chair');
      case 'vc':
        return code.includes('vc');
      case 'ceo':
        return code.includes('ceo');
    }
  }

  private matchesReviewerSource(comment: RequestCommentDto, reviewerNo: 1 | 2): boolean {
    const code = (comment.actor_type_code ?? '').trim().toLowerCase();
    if (code.includes(`reviewer${reviewerNo}`) || code === `reviewer_${reviewerNo}`) return true;
    if (!code.includes('reviewer')) return false;

    const commentUsername = comment.staff_username?.trim().toLowerCase();
    return Boolean(commentUsername && commentUsername === this.reviewerUsernameByNo(reviewerNo));
  }

  isEditingFieldComment(fieldCode: string, actor: ReviewerActor): boolean {
    const comment = this.currentVersionFieldComment(fieldCode, actor);
    return Boolean(comment && this.isEditingComment(comment.id));
  }

  startEditFieldComment(fieldCode: string, actor: ReviewerActor, comment: ScoredComment): void {
    if (!this.canChangeComment(comment, () => this.canWriteFieldComment(actor))) return;
    this.editingCommentId.set(comment.id);
    this.fieldCommentControl(fieldCode, actor).setValue(comment.comment_text ?? '');
    this.feedback.set(null);
  }

  cancelEditFieldComment(fieldCode: string, actor: ReviewerActor): void {
    this.editingCommentId.set(null);
    this.fieldCommentControl(fieldCode, actor).reset('');
  }

  deleteFieldComment(fieldCode: string, actor: ReviewerActor, comment: ScoredComment): void {
    if (!this.canChangeComment(comment, () => this.canWriteFieldComment(actor))) return;
    this.deleteComment(comment, () => {
      if (this.editingCommentId() === comment.id) this.cancelEditFieldComment(fieldCode, actor);
    });
  }

  canChangeFieldComment(fieldCode: string, actor: ReviewerActor, comment: ScoredComment): boolean {
    return this.canChangeComment(comment, () => this.canWriteFieldComment(actor));
  }

  isFieldCommentSaving(fieldCode: string, actor: ReviewerActor): boolean {
    return this.savingCommentKey() === this.fieldKey(fieldCode, actor);
  }

  submitFieldComment(field: FieldCommentDef, actor: ReviewerActor): void {
    const existing = this.currentVersionFieldComment(field.fieldCode, actor);
    if (existing && this.isEditingFieldComment(field.fieldCode, actor)) {
      this.updateFieldComment(field, actor, existing);
      return;
    }
    this.saveFieldComment(field, actor);
  }

  private saveFieldComment(field: FieldCommentDef, actor: ReviewerActor): void {
    if (this.requestId == null || this.isFieldCommentSaving(field.fieldCode, actor)) return;
    if (this.currentVersionFieldComment(field.fieldCode, actor)) {
      this.feedback.set({ type: 'error', text: 'You already saved a comment for this section.' });
      return;
    }

    const control = this.fieldCommentControl(field.fieldCode, actor);
    const commentText = this.fieldCommentDraft(field.fieldCode, actor);
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    const key = this.fieldKey(field.fieldCode, actor);
    this.savingCommentKey.set(key);
    this.feedback.set(null);
    this.requests
      .createSectionComment(this.requestId, {
        section_code: field.fieldCode,
        section_name: field.label,
        comment_text: commentText,
      })
      .pipe(
        finalize(() => this.savingCommentKey.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) => [data, ...comments]);
          control.reset('');
          this.feedback.set({ type: 'success', text: 'Section comment saved.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not save this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  private updateFieldComment(
    field: FieldCommentDef,
    actor: ReviewerActor,
    comment: ScoredComment,
  ): void {
    if (this.requestId == null || this.isFieldCommentSaving(field.fieldCode, actor)) return;
    if (!this.canChangeFieldComment(field.fieldCode, actor, comment)) return;

    const control = this.fieldCommentControl(field.fieldCode, actor);
    const commentText = this.fieldCommentDraft(field.fieldCode, actor);
    if (!commentText) {
      this.feedback.set({ type: 'error', text: 'Please write a comment before saving.' });
      return;
    }
    if (control.invalid) {
      this.feedback.set({
        type: 'error',
        text: `Comment cannot exceed ${this.commentMaxLength} characters.`,
      });
      return;
    }

    const key = this.fieldKey(field.fieldCode, actor);
    this.savingCommentKey.set(key);
    this.feedback.set(null);
    this.requests
      .updateSectionComment(this.requestId, comment.id, {
        comment_text: commentText,
      })
      .pipe(
        finalize(() => this.savingCommentKey.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.sectionComments.update((comments) =>
            comments.map((item) => (item.id === data.id ? data : item)),
          );
          this.cancelEditFieldComment(field.fieldCode, actor);
          this.feedback.set({ type: 'success', text: 'Section comment updated.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not update this section comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  // ── Whole-form comments: RDIG Chair / VC / CEO ──────────────────────────────
  private wholeFormComment(role: WholeFormActor): ScoredComment | null {
    return (
      this.sectionComments().find((c) => c.section_code === WHOLE_FORM_FIELD_CODE[role]) ?? null
    );
  }

  readonly rdigChairWholeFormComment = computed(() => this.wholeFormComment('rdig_chair'));
  readonly vcWholeFormComment = computed(() => this.wholeFormComment('vc'));
  readonly ceoWholeFormComment = computed(() => this.wholeFormComment('ceo'));

  canEditWholeFormComment(role: WholeFormActor): boolean {
    if (!this.canWriteWholeFormComment(role)) return false;
    const comment = this.wholeFormComment(role);
    return !comment || this.isCurrentUserComment(comment);
  }

  // ── Shared comment CRUD plumbing ────────────────────────────────────────────
  private isEditingComment(id: number): boolean {
    return this.editingCommentId() === id;
  }

  /** Can only ever change your own comment, and only for the CURRENT submission version. */
  private canChangeComment(comment: ScoredComment, canWrite: () => boolean): boolean {
    if (!canWrite()) return false;
    if (!this.isCurrentUserComment(comment)) return false;
    if (this.commentSubmissionVersion(comment) !== this.currentSubmissionVersion()) return false;
    return true;
  }

  private deleteComment(comment: ScoredComment, onDone: () => void): void {
    if (this.requestId == null || this.deletingCommentId()) return;
    this.deletingCommentId.set(comment.id);
    this.feedback.set(null);
    this.requests
      .deleteSectionComment(this.requestId, comment.id)
      .pipe(
        finalize(() => this.deletingCommentId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.sectionComments.update((comments) =>
            comments.filter((item) => item.id !== comment.id),
          );
          onDone();
          this.feedback.set({ type: 'success', text: 'Comment deleted.' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Could not delete this comment.';
          this.feedback.set({ type: 'error', text: msg });
        },
      });
  }

  isCurrentUserComment(comment: RequestCommentDto): boolean {
    const currentUsername = this.authService.currentUser()?.username?.trim().toLowerCase();
    const commentUsername = comment.staff_username?.trim().toLowerCase();
    return Boolean(currentUsername && commentUsername && commentUsername === currentUsername);
  }

  private parseTime(value: string | null | undefined): number | null {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  }

  downloadAttachment(file: RdigAttachmentDto): void {
    if (!file?.id) return;
    const url = file.file_url;
    if (!url) {
      this.feedback.set({ type: 'error', text: 'Attachment download URL is unavailable.' });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.download = file.file_name || 'rdig-attachment';
    anchor.click();
  }

  // ── Perform an action ───────────────────────────────────────────────────────
  /** Builds whole-form comments that are saved together with executive workflow actions. */
  private pendingCommentSaves$(): Observable<unknown>[] {
    const saves: Observable<unknown>[] = [];
    if (this.requestId == null) return saves;
    const requestId = this.requestId;

    if (this.requiresWholeFormComment()) {
      const role: WholeFormActor = this.isCurrentActorRdigChair()
        ? 'rdig_chair'
        : this.isCurrentActorVc()
          ? 'vc'
          : 'ceo';
      const draft = this.wholeFormCommentDraft(role);
      const existing = this.wholeFormComment(role);
      if (draft && existing && this.isCurrentUserComment(existing)) {
        saves.push(
          this.requests.updateSectionComment(requestId, existing.id, { comment_text: draft }),
        );
      } else if (draft && !existing) {
        saves.push(
          this.requests.createSectionComment(requestId, {
            section_code: WHOLE_FORM_FIELD_CODE[role],
            section_name: this.prettyActorRole(role),
            comment_text: draft,
          }),
        );
      }
    }

    return saves;
  }

  perform(action: WorkflowActionDto): void {
    if (this.requestId == null || this.acting()) return;

    if (!this.canPerformActions()) {
      this.feedback.set({
        type: 'error',
        text: this.actionRequirementMessage() || 'Please complete the required review first.',
      });
      return;
    }

    if (action.requires_reviewer_selection && !this.reviewerSelectionConfirmed()) {
      this.feedback.set({
        type: 'error',
        text: `Choose exactly ${this.reviewerSelectionCount()} reviewers before approving.`,
      });
      this.openReviewerSelection();
      return;
    }

    this.acting.set(true);
    this.feedback.set(null);
    const loadingId = this.actionLoading.begin(`Processing ${action.action_name}`);
    let actionSucceeded = false;
    const actionComment = this.requiresDecisionComment()
      ? (this.actionCommentControl.value ?? '').trim()
      : null;

    const commentSaves = this.pendingCommentSaves$();
    const requestId = this.requestId;
    const saveComments$: Observable<unknown> = commentSaves.length
      ? forkJoin(commentSaves)
      : of(null);
    saveComments$
      .pipe(
        switchMap(() => this.saveReviewerScores$()),
        switchMap(() =>
          this.requests.actOnRequest(requestId, {
            action_code: action.action_code,
            comment_text: actionComment,
            selected_reviewer_usernames: action.requires_reviewer_selection
              ? [...this.selectedReviewerUsernames()]
              : undefined,
          }),
        ),
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

    window.open(this.requests.getPrintUrl(this.requestId), '_blank', 'noopener,noreferrer');
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
}
