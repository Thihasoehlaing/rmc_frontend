import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * All valid RDIG application status values.
 * Controls visibility, editability, and workflow progression.
 */
export type RdigStatus =
  | 'fill_application'
  | 'pending_applicant_resubmission_hos'
  | 'pending_applicant_resubmission_reviewers'
  | 'pending_hos'
  | 'pending_hos_review'
  | 'rejected_hos'
  | 'pending_rmc'
  | 'pending_rmc_review'
  | 'rejected_rmc'
  | 'pending_reviewers'
  | 'pending_rdig_chair'
  | 'rejected_rdig_chair'
  | 'pending_vc'
  | 'rejected_vc'
  | 'pending_ceo'
  | 'rejected_ceo';

/** Statuses where the applicant can edit form fields */
const APPLICANT_EDITABLE: RdigStatus[] = [
  'fill_application',
  'pending_applicant_resubmission_hos',
  'pending_applicant_resubmission_reviewers',
];

@Injectable({ providedIn: 'root' })
export class RdigWorkflowService {

  private auth = inject(AuthService);

  /** Current application status — driven purely by form metadata (ABAC) */
  status = signal<RdigStatus>('fill_application');

  /** Current application version — used for HOS approval options */
  version = signal<number>(1);

  /**
   * reviewers_version — integer attribute that gates score visibility at RMC stage.
   * Hidden field; set from form metadata when loading an existing application.
   */
  reviewersVersion = signal<number>(1);

  // ── Applicant editing ─────────────────────────────────────────

  /** True when the applicant can edit all form fields */
  isApplicantEditable = computed(() =>
    APPLICANT_EDITABLE.includes(this.status())
  );

  /** True when form fields should be read-only */
  isFormReadOnly = computed(() => !this.isApplicantEditable());

  // ── Dynamic reviewer identity (set by parent component from form values) ──

  /** User ID of the assigned Reviewer 1 for this application */
  reviewer1UserId = signal<string>('4');
  /** User ID of the assigned Reviewer 2 for this application */
  reviewer2UserId = signal<string>('');

  /** True when the current logged-in user is the assigned Reviewer 1 */
  isCurrentUserReviewer1 = computed(() =>
    !!this.reviewer1UserId() && this.auth.currentUser()?.id === this.reviewer1UserId()
  );

  /** True when the current logged-in user is the assigned Reviewer 2 */
  isCurrentUserReviewer2 = computed(() =>
    !!this.reviewer2UserId() && this.auth.currentUser()?.id === this.reviewer2UserId()
  );

  // ── Per-stage comment/approval editability (ABAC — status only) ─

  /** HOS comment/approval editable during pending_hos and pending_hos_review */
  isHosEditable = computed(() =>
    this.status() === 'pending_hos' || this.status() === 'pending_hos_review'
  );

  /** RMC comment/approval + reviewer assignment editable during pending_rmc and pending_rmc_review */
  isRmcEditable = computed(() =>
    this.status() === 'pending_rmc' || this.status() === 'pending_rmc_review'
  );

  /** Reviewer 1 fields editable: only during pending_reviewers AND only for the assigned Reviewer 1 */
  isReviewer1Editable = computed(() =>
    this.status() === 'pending_reviewers' && this.isCurrentUserReviewer1()
  );

  /** Reviewer 2 fields editable: only during pending_reviewers AND only for the assigned Reviewer 2 */
  isReviewer2Editable = computed(() =>
    this.status() === 'pending_reviewers' && this.isCurrentUserReviewer2()
  );

  /** RDIG Chair comment/approval editable only during pending_rdig_chair */
  isRdigChairEditable = computed(() => this.status() === 'pending_rdig_chair');
 
  /** VC comment/approval editable only during pending_vc */
  isVcEditable = computed(() => this.status() === 'pending_vc');

  /** CEO comment/approval editable only during pending_ceo */
  isCeoEditable = computed(() => this.status() === 'pending_ceo');

  // ── Score dropdown editability ─────────────────────────────────

  /** Score dropdowns are only interactive during pending_reviewers */
  isScoreEditable = computed(() => this.status() === 'pending_reviewers');

  // ── Reviewer assignment visibility ─────────────────────────────

  /** Reviewer Assignment section visible ONLY during pending_rmc */
  isReviewerAssignmentVisible = computed(() => this.status() === 'pending_rmc');

  // ── Score summary visibility ──────────────────────────────────

  /**
   * Score summary:
   *   - Hidden during all applicant/HOS stages and rejections
   *   - Visible at pending_rmc / pending_rmc_review only when reviewers_version > 1
   *   - Always visible from pending_reviewers onward
   */
  isScoreSummaryVisible = computed(() => {
    const s = this.status();
    // Hidden during applicant, HOS, and all rejected stages
    if ([
      'fill_application',
      'pending_applicant_resubmission_hos',
      'pending_applicant_resubmission_reviewers',
      'pending_hos',
      'pending_hos_review',
      'rejected_hos',
      'rejected_rmc',
      'rejected_rdig_chair',
      'rejected_vc',
      'rejected_ceo',
    ].includes(s)) return false;
    if (s === 'pending_rmc' || s === 'pending_rmc_review') return this.reviewersVersion() > 1;
    return [
      'pending_reviewers',
      'pending_rdig_chair',
      'pending_vc',
      'pending_ceo',
    ].includes(s);
  });

  // ── Comment toggle button visibility (which buttons appear per status) ─

  /**
   * Show HOS toggle when:
   * - Applicant reviews HOS feedback (pending_applicant_resubmission_hos)
   * - HOS is actively reviewing (pending_hos / pending_hos_review)
   * - Downstream stages where prior HOS comments are visible
   * - Any rejected_* stage (show history up to that rejection point)
   */
  showHosToggle = computed(() =>
    [
      'pending_applicant_resubmission_hos',
      'pending_hos',
      'pending_hos_review',
      'rejected_hos',
      'pending_rmc',
      'pending_rmc_review',
      'rejected_rmc',
      'pending_reviewers',
      'pending_rdig_chair',
      'rejected_rdig_chair',
      'pending_vc',
      'rejected_vc',
      'pending_ceo',
      'rejected_ceo',
    ].includes(this.status())
  );

  /** Show RMC toggle from pending_rmc onward (and at rejected_rmc/chair/vc/ceo) */
  showRmcToggle = computed(() =>
    [
      'pending_rmc',
      'pending_rmc_review',
      'rejected_rmc',
      'pending_reviewers',
      'pending_rdig_chair',
      'rejected_rdig_chair',
      'pending_vc',
      'rejected_vc',
      'pending_ceo',
      'rejected_ceo',
    ].includes(this.status())
  );

  /**
   * Show reviewer toggles when:
   * - Applicant reviews reviewer feedback (pending_applicant_resubmission_reviewers)
   * - RMC second review where reviewer comments are visible (pending_rmc_review)
   * - Reviewers are actively reviewing (pending_reviewers)
   * - Downstream stages (chair / vc / ceo)
   */
  showReviewerToggles = computed(() =>
    [
      'pending_applicant_resubmission_reviewers',
      'pending_rmc_review',
      'pending_reviewers',
      'pending_rdig_chair',
      'pending_vc',
      'pending_ceo',
      'rejected_rmc',
      'rejected_rdig_chair',
      'rejected_vc',
      'rejected_ceo',
    ].includes(this.status())
  );

  /**
   * Reviewer 1 toggle visibility:
   * - At pending_reviewers: only the assigned Reviewer 1 sees this button
   * - At all other stages where reviewer blocks are shown: everyone sees it
   */
  showR1Toggle = computed(() => {
    if (!this.showReviewerToggles()) return false;
    if (this.status() === 'pending_reviewers') return this.isCurrentUserReviewer1();
    return true;
  });

  /**
   * Reviewer 2 toggle visibility:
   * - At pending_reviewers: only the assigned Reviewer 2 sees this button
   * - At all other stages where reviewer blocks are shown: everyone sees it
   */
  showR2Toggle = computed(() => {
    if (!this.showReviewerToggles()) return false;
    if (this.status() === 'pending_reviewers') return this.isCurrentUserReviewer2();
    return true;
  });

  /** Show RDIG Chair toggle from pending_rdig_chair onward (and at rejected_rdig_chair/vc/ceo) */
  showRdigChairToggle = computed(() =>
    ['pending_rdig_chair', 'rejected_rdig_chair', 'pending_vc', 'rejected_vc', 'pending_ceo', 'rejected_ceo'].includes(this.status())
  );

  /** Show VC toggle from pending_vc onward (and at rejected_vc/ceo) */
  showVcToggle = computed(() =>
    ['pending_vc', 'rejected_vc', 'pending_ceo', 'rejected_ceo'].includes(this.status())
  );

  /** Show CEO toggle only at pending_ceo or rejected_ceo */
  showCeoToggle = computed(() => this.status() === 'pending_ceo' || this.status() === 'rejected_ceo');

  // ── Approval card visibility (each stage only exposes the current actor's approval) ─

  /** HOS approval card — editable only while HOS is the active reviewer */
  isHosApprovalVisible = computed(() =>
    this.status() === 'pending_hos' || this.status() === 'pending_hos_review'
  );

  /** RMC approval card — editable only while RMC is the active reviewer */
  isRmcApprovalVisible = computed(() =>
    this.status() === 'pending_rmc' || this.status() === 'pending_rmc_review'
  );

  /** Reviewer 2 decision card — only visible when current user IS the assigned Reviewer 2 */
  isReviewerApprovalVisible = computed(() =>
    this.status() === 'pending_reviewers' && this.isCurrentUserReviewer2()
  );

  /** RDIG Chair approval card — only the chair sees their own approval */
  isRdigChairApprovalVisible = computed(() => this.status() === 'pending_rdig_chair');

  /** VC approval card — only the VC sees their own approval */
  isVcApprovalVisible = computed(() => this.status() === 'pending_vc');

  /** CEO approval card — only the CEO sees their own approval */
  isCeoApprovalVisible = computed(() => this.status() === 'pending_ceo');

  // ── HOS approval options (version-dependent) ──────────────────

  hosApprovalOptions = computed(() => {
    if (this.version() >= 2) {
      return [
        { label: 'Approve', value: 'approve' },
        { label: 'Reject', value: 'reject' },
      ];
    }
    return [
      { label: 'Approve', value: 'approve' },
      { label: 'Resubmit', value: 'resubmit' },
      { label: 'Reject', value: 'reject' },
    ];
  });

  /** RMC approval options */
  readonly rmcApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Reject', value: 'reject' },
  ];

  /** Reviewer 2 decision options based on total score */
  reviewer2DecisionOptions(totalScore: number) {
    if (totalScore >= 70) {
      return [
        { label: 'Approve', value: 'approve' },
        { label: 'Resubmission', value: 'resubmission' },
      ];
    }
    return [
      { label: 'Resubmission', value: 'resubmission' },
    ];
  }
}
