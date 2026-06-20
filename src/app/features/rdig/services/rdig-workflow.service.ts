import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

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
  | 'rejected_ceo'
  | 'approved';

/** Statuses where the applicant can edit form fields */
const APPLICANT_EDITABLE: RdigStatus[] = [
  'fill_application',
  'pending_applicant_resubmission_hos',
  'pending_applicant_resubmission_reviewers',
];

// ── Workflow Configuration ─────────────────────────────────────────────────

/**
 * Describes a single possible status transition from a given stage.
 * Decision-based transitions match `approvals[decisionField] === decisionValue`.
 * Applicant transitions (no decisionField) always fire unconditionally.
 */
export interface WorkflowTransition {
  /** Human-readable action name stored in the history entry */
  action: string;
  /** Target status after this transition */
  nextStatus: RdigStatus;
  /** The approvals FormGroup field that holds the decision, if applicable */
  decisionField?: string;
  /** The value of that field that triggers this transition */
  decisionValue?: string;
  /** Increment metadata.applicationVersion (used on HOS resubmission) */
  incrementVersion?: boolean;
  /** Increment metadata.reviewers_version (used on reviewer resubmission) */
  incrementReviewersVersion?: boolean;
}

/** Per-stage workflow metadata: who acts, what transitions are possible */
export interface WorkflowStageConfig {
  /** Human-readable role label for history entries */
  actorRole: string;
  /** Roles that must act at the *next* status after a transition */
  transitions: WorkflowTransition[];
}

/**
 * RDIG_WORKFLOW_CONFIG — the single source of truth for all status transitions.
 *
 * Flow summary:
 *   fill_application → pending_hos
 *   pending_hos → pending_rmc | pending_applicant_resubmission_hos | rejected_hos
 *   pending_applicant_resubmission_hos → pending_hos_review (version++)
 *   pending_hos_review → pending_rmc | rejected_hos
 *   pending_rmc → pending_reviewers | rejected_rmc
 *   pending_applicant_resubmission_reviewers → pending_rmc_review (reviewersVersion++)
 *   pending_rmc_review → pending_rdig_chair | rejected_rmc
 *   pending_reviewers → pending_rdig_chair | pending_applicant_resubmission_reviewers
 *   pending_rdig_chair → pending_vc | rejected_rdig_chair
 *   pending_vc → pending_ceo | rejected_vc
 *   pending_ceo → approved | rejected_ceo
 */
export const RDIG_WORKFLOW_CONFIG: Record<RdigStatus, WorkflowStageConfig> = {

  fill_application: {
    actorRole: 'Applicant',
    transitions: [
      { action: 'submit', nextStatus: 'pending_hos' },
    ],
  },

  pending_applicant_resubmission_hos: {
    actorRole: 'Applicant',
    transitions: [
      { action: 'resubmit', nextStatus: 'pending_hos_review', incrementVersion: true },
    ],
  },

  pending_applicant_resubmission_reviewers: {
    actorRole: 'Applicant',
    transitions: [
      { action: 'resubmit', nextStatus: 'pending_rmc_review', incrementReviewersVersion: true },
    ],
  },

  pending_hos: {
    actorRole: 'HOS',
    transitions: [
      { action: 'approve',   nextStatus: 'pending_rmc',                        decisionField: 'hosStatus', decisionValue: 'approve' },
      { action: 'resubmit',  nextStatus: 'pending_applicant_resubmission_hos', decisionField: 'hosStatus', decisionValue: 'resubmit' },
      { action: 'reject',    nextStatus: 'rejected_hos',                       decisionField: 'hosStatus', decisionValue: 'reject' },
    ],
  },

  pending_hos_review: {
    actorRole: 'HOS',
    transitions: [
      { action: 'approve', nextStatus: 'pending_rmc',  decisionField: 'hosStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_hos', decisionField: 'hosStatus', decisionValue: 'reject' },
    ],
  },

  rejected_hos: { actorRole: 'HOS', transitions: [] },

  pending_rmc: {
    actorRole: 'RMC',
    transitions: [
      { action: 'approve', nextStatus: 'pending_reviewers', decisionField: 'rmcStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_rmc',      decisionField: 'rmcStatus', decisionValue: 'reject' },
    ],
  },

  pending_rmc_review: {
    actorRole: 'RMC',
    transitions: [
      { action: 'approve', nextStatus: 'pending_rdig_chair', decisionField: 'rmcStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_rmc',       decisionField: 'rmcStatus', decisionValue: 'reject' },
    ],
  },

  rejected_rmc: { actorRole: 'RMC', transitions: [] },

  pending_reviewers: {
    actorRole: 'Reviewer',
    transitions: [
      { action: 'approve',   nextStatus: 'pending_rdig_chair',                   decisionField: 'reviewer2Decision', decisionValue: 'approve' },
      { action: 'resubmit',  nextStatus: 'pending_applicant_resubmission_reviewers', decisionField: 'reviewer2Decision', decisionValue: 'resubmission' },
    ],
  },

  pending_rdig_chair: {
    actorRole: 'RDIG Chair',
    transitions: [
      { action: 'approve', nextStatus: 'pending_vc',           decisionField: 'rdigChairStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_rdig_chair',  decisionField: 'rdigChairStatus', decisionValue: 'reject' },
    ],
  },

  rejected_rdig_chair: { actorRole: 'RDIG Chair', transitions: [] },

  pending_vc: {
    actorRole: 'VC',
    transitions: [
      { action: 'approve', nextStatus: 'pending_ceo', decisionField: 'vcStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_vc', decisionField: 'vcStatus', decisionValue: 'reject' },
    ],
  },

  rejected_vc: { actorRole: 'VC', transitions: [] },

  pending_ceo: {
    actorRole: 'CEO',
    transitions: [
      { action: 'approve', nextStatus: 'approved',    decisionField: 'ceoStatus', decisionValue: 'approve' },
      { action: 'reject',  nextStatus: 'rejected_ceo', decisionField: 'ceoStatus', decisionValue: 'reject' },
    ],
  },

  rejected_ceo: { actorRole: 'CEO', transitions: [] },

  approved: { actorRole: 'CEO', transitions: [] },
};

/**
 * Maps a target status to the roles that are expected to act next.
 * Used to populate `WorkflowState.nextRoles` after each transition.
 */
export function getNextRoles(status: RdigStatus): string[] {
  switch (status) {
    case 'pending_hos':
    case 'pending_hos_review':
      return ['HOS'];
    case 'pending_applicant_resubmission_hos':
    case 'pending_applicant_resubmission_reviewers':
    case 'fill_application':
      return ['Applicant'];
    case 'pending_rmc':
    case 'pending_rmc_review':
      return ['RMC'];
    case 'pending_reviewers':
      return ['Reviewer1', 'Reviewer2'];
    case 'pending_rdig_chair':
      return ['RDIG_Chair'];
    case 'pending_vc':
      return ['VC'];
    case 'pending_ceo':
      return ['CEO'];
    default:
      return [];
  }
}

@Injectable({ providedIn: 'root' })
export class RdigWorkflowService {

  private auth = inject(AuthService);

  /** Current application status — driven purely by form metadata (ABAC) */
  status = signal<RdigStatus>('fill_application');

  /** True only when the logged-in user is the current actor for this application. */
  currentUserCanAct = signal<boolean>(true);

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
    this.currentUserCanAct() && APPLICANT_EDITABLE.includes(this.status())
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
    this.currentUserCanAct() && (this.status() === 'pending_hos' || this.status() === 'pending_hos_review')
  );

  /** RMC comment/approval + reviewer assignment editable during pending_rmc and pending_rmc_review */
  isRmcEditable = computed(() =>
    this.currentUserCanAct() && (this.status() === 'pending_rmc' || this.status() === 'pending_rmc_review')
  );

  /** Reviewer 1 fields editable: only during pending_reviewers AND only for the assigned Reviewer 1 */
  isReviewer1Editable = computed(() =>
    this.currentUserCanAct() && this.status() === 'pending_reviewers' && this.isCurrentUserReviewer1()
  );

  /** Reviewer 2 fields editable: only during pending_reviewers AND only for the assigned Reviewer 2 */
  isReviewer2Editable = computed(() =>
    this.currentUserCanAct() && this.status() === 'pending_reviewers' && this.isCurrentUserReviewer2()
  );

  /** RDIG Chair comment/approval editable only during pending_rdig_chair */
  isRdigChairEditable = computed(() => this.currentUserCanAct() && this.status() === 'pending_rdig_chair');

  /** VC comment/approval editable only during pending_vc */
  isVcEditable = computed(() => this.currentUserCanAct() && this.status() === 'pending_vc');

  /** CEO comment/approval editable only during pending_ceo */
  isCeoEditable = computed(() => this.currentUserCanAct() && this.status() === 'pending_ceo');

  // ── Score dropdown editability ─────────────────────────────────

  /** Score dropdowns are only interactive during pending_reviewers */
  isScoreEditable = computed(() => this.currentUserCanAct() && this.status() === 'pending_reviewers');

  // ── Reviewer assignment visibility ─────────────────────────────

  /** Reviewer Assignment section visible ONLY during pending_rmc */
  isReviewerAssignmentVisible = computed(() => this.currentUserCanAct() && this.status() === 'pending_rmc');

  // ── Score summary visibility ──────────────────────────────────

  /**
   * Score summary:
   *   - Hidden during all applicant/HOS stages and rejections
   *   - Visible at pending_rmc / pending_rmc_review only when reviewers_version > 1
   *   - Always visible from pending_reviewers onward (including approved)
   */
  isScoreSummaryVisible = computed(() => {
    const s = this.status();
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
      'approved',
    ].includes(s);
  });

  // ── Comment toggle button visibility (which buttons appear per status) ─

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
      'approved',
    ].includes(this.status())
  );

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
      'approved',
    ].includes(this.status())
  );

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
      'approved',
    ].includes(this.status())
  );

  showR1Toggle = computed(() => {
    if (!this.showReviewerToggles()) return false;
    if (this.status() === 'pending_reviewers') return this.isCurrentUserReviewer1();
    return true;
  });

  showR2Toggle = computed(() => {
    if (!this.showReviewerToggles()) return false;
    if (this.status() === 'pending_reviewers') return this.isCurrentUserReviewer2();
    return true;
  });

  showRdigChairToggle = computed(() =>
    ['pending_rdig_chair', 'rejected_rdig_chair', 'pending_vc', 'rejected_vc', 'pending_ceo', 'rejected_ceo', 'approved'].includes(this.status())
  );

  showVcToggle = computed(() =>
    ['pending_vc', 'rejected_vc', 'pending_ceo', 'rejected_ceo', 'approved'].includes(this.status())
  );

  showCeoToggle = computed(() =>
    this.status() === 'pending_ceo' || this.status() === 'rejected_ceo' || this.status() === 'approved'
  );

  // ── Approval card visibility ─

  isHosApprovalVisible = computed(() =>
    this.currentUserCanAct() && (this.status() === 'pending_hos' || this.status() === 'pending_hos_review')
  );

  isRmcApprovalVisible = computed(() =>
    this.currentUserCanAct() && (this.status() === 'pending_rmc' || this.status() === 'pending_rmc_review')
  );

  isReviewer1ApprovalVisible = computed(() =>
    this.currentUserCanAct() && this.status() === 'pending_reviewers' && this.isCurrentUserReviewer1()
  );

  isReviewer2ApprovalVisible = computed(() =>
    this.currentUserCanAct() && this.status() === 'pending_reviewers' && this.isCurrentUserReviewer2()
  );

  isRdigChairApprovalVisible = computed(() => this.currentUserCanAct() && this.status() === 'pending_rdig_chair');

  isVcApprovalVisible = computed(() => this.currentUserCanAct() && this.status() === 'pending_vc');

  isCeoApprovalVisible = computed(() => this.currentUserCanAct() && this.status() === 'pending_ceo');

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

  readonly rmcApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Reject', value: 'reject' },
  ];

  reviewer1DecisionOptions(totalScore: number) {
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

  // ── Workflow transition helpers ────────────────────────────────

  /**
   * Determines the workflow transition to execute for the current submit action.
   *
   * For applicant stages (fill_application, resubmission stages) there is only one
   * unconditional transition. For reviewer stages, the transition is selected by
   * matching `approvals[decisionField] === decisionValue`.
   *
   * Returns null when no matching transition is found (e.g. Reviewer1 saves without
   * a Reviewer2 decision being set).
   */
  determineTransition(
    currentStatus: RdigStatus,
    approvals: Record<string, string>,
  ): (WorkflowTransition & { actorRole: string }) | null {
    const config = RDIG_WORKFLOW_CONFIG[currentStatus];
    if (!config || config.transitions.length === 0) return null;

    // Applicant stages have a single unconditional transition
    const applicantStatuses: RdigStatus[] = [
      'fill_application',
      'pending_applicant_resubmission_hos',
      'pending_applicant_resubmission_reviewers',
    ];
    if (applicantStatuses.includes(currentStatus)) {
      return { ...config.transitions[0], actorRole: config.actorRole };
    }

    // Custom logic for pending_reviewers (waiting for both decisions)
    if (currentStatus === 'pending_reviewers') {
      const r1 = approvals['reviewer1Decision'];
      const r2 = approvals['reviewer2Decision'];
      
      // If BOTH reviewers have reached a decision
      if (r1 && r2) {
        if (r1 === 'resubmission' || r2 === 'resubmission') {
          return { action: 'resubmit', nextStatus: 'pending_applicant_resubmission_reviewers', actorRole: 'Reviewer' };
        }
        if (r1 === 'approve' && r2 === 'approve') {
          return { action: 'approve', nextStatus: 'pending_rdig_chair', actorRole: 'Reviewer' };
        }
      }
      // If not both decided yet, do not transition
      return null;
    }

    // Reviewer / approver stages: match on decision field value
    const matched = config.transitions.find(t =>
      t.decisionField ? approvals[t.decisionField] === t.decisionValue : true,
    );
    return matched ? { ...matched, actorRole: config.actorRole } : null;
  }
}
