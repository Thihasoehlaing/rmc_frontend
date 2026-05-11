import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * All valid RA/GRA application status values.
 * Controls visibility, editability, and workflow progression.
 */
export type RagraStatus =
  | 'draft'
  | 'submitted'
  | 'pending_hos'
  | 'returned_by_hos'
  | 'recommended_by_hos'
  | 'rejected_by_hos'
  | 'pending_rmc'
  | 'returned_by_rmc'
  | 'approved_by_rmc'
  | 'rejected_by_rmc'
  | 'pending_hr'
  | 'approved_by_hr'
  | 'rejected_by_hr'
  | 'offer_letter_generated'
  | 'blocked';

/** Statuses where the applicant can edit form fields */
const APPLICANT_EDITABLE: RagraStatus[] = [
  'draft',
  'returned_by_hos',
  'returned_by_rmc'
];

export type RagraRound = '1st Round' | '2nd Round' | '3rd Round';

export interface RagraApplication {
  id: string;
  applicantName: string;
  positionRequested: string;
  applicationType: string;
  submissionDate: string | null;
  status: RagraStatus;
  round: RagraRound;
  lastUpdated: string;
  resubmissionDeadline: string | null;
  hosDecisionDate: string | null;
  rmcDecisionDate: string | null;
  hrDecisionDate: string | null;
  offerLetterDate: string | null;
}

/** Human-readable label for each status */
export const RAGRA_STATUS_LABELS: Record<RagraStatus, string> = {
  draft:                  'Draft',
  submitted:              'Submitted',
  pending_hos:            'Pending HOS Review',
  returned_by_hos:        'Returned for Revision by HOS',
  recommended_by_hos:     'Recommended by HOS',
  rejected_by_hos:        'Rejected by HOS',
  pending_rmc:            'Pending RMC Review',
  returned_by_rmc:        'Returned for Revision by RMC',
  approved_by_rmc:        'Approved by RMC',
  rejected_by_rmc:        'Rejected by RMC',
  pending_hr:             'Pending HR Review',
  approved_by_hr:         'Approved by HR',
  rejected_by_hr:         'Rejected by HR',
  offer_letter_generated: 'Offer Letter Generated',
  blocked:                'Blocked Due to Late Resubmission',
};

/** Badge colour variant for each status */
export type BadgeVariant = 'grey' | 'blue' | 'yellow' | 'orange' | 'green' | 'red' | 'dark-red';

export const RAGRA_STATUS_BADGE: Record<RagraStatus, BadgeVariant> = {
  draft:                  'grey',
  submitted:              'blue',
  pending_hos:            'yellow',
  returned_by_hos:        'orange',
  recommended_by_hos:     'green',
  rejected_by_hos:        'red',
  pending_rmc:            'yellow',
  returned_by_rmc:        'orange',
  approved_by_rmc:        'green',
  rejected_by_rmc:        'red',
  pending_hr:             'yellow',
  approved_by_hr:         'green',
  rejected_by_hr:         'red',
  offer_letter_generated: 'green',
  blocked:                'dark-red',
};

/** Status message shown to the applicant */
export const RAGRA_STATUS_MESSAGES: Record<RagraStatus, string> = {
  draft:
    'Your application is saved as a draft. Please complete and submit it.',
  submitted:
    'Your application has been submitted and is waiting for HOS review.',
  pending_hos:
    'Your application is currently under review by the Head of School (HOS).',
  returned_by_hos:
    'Your application has been returned for revision by HOS. Please revise and resubmit within the given timeline.',
  recommended_by_hos:
    'Your application has been recommended by HOS and is now pending RMC review.',
  rejected_by_hos:
    'Your application has been rejected by HOS. Please check your email for further details.',
  pending_rmc:
    'Your application is currently under review by the Research Management Centre (RMC).',
  returned_by_rmc:
    'Your application has been returned for revision by RMC. Please revise and resubmit within the given timeline.',
  approved_by_rmc:
    'Your application has been approved by RMC and is now pending HR review.',
  rejected_by_rmc:
    'Your application has been rejected by RMC. Please check your email for further details.',
  pending_hr:
    'Your application is currently under review by Human Resources (HR).',
  approved_by_hr:
    'Your application has been approved by HR. The offer letter will be generated shortly.',
  rejected_by_hr:
    'Your application has been rejected by HR. Please check your email for further details.',
  offer_letter_generated:
    'Your offer letter has been generated. Please check your notification/email.',
  blocked:
    'Your application has been blocked because resubmission was not completed within the required timeline.',
};

@Injectable({ providedIn: 'root' })
export class RagraWorkflowService {

  private auth = inject(AuthService);

  /** Current application status — driven purely by form metadata (ABAC) */
  status = signal<RagraStatus>('draft');

  // ── Applicant editing ─────────────────────────────────────────

  /** True when the applicant can edit all form fields */
  isApplicantEditable = computed(() =>
    APPLICANT_EDITABLE.includes(this.status())
  );

  /** True when form fields should be read-only */
  isFormReadOnly = computed(() => !this.isApplicantEditable());

  // ── Per-stage comment/approval editability (ABAC — status only) ─

  /** HOS comment editable during pending_hos */
  isHosEditable = computed(() => this.status() === 'pending_hos' || this.status() === 'submitted');

  /** RMC comment editable during pending_rmc */
  isRmcEditable = computed(() => this.status() === 'pending_rmc');

  /** HR comment editable during pending_hr */
  isHrEditable = computed(() => this.status() === 'pending_hr');

  // ── Comment toggle button visibility (which buttons appear per status) ─

  /** Show HOS toggle from submitted/pending_hos onward */
  showHosToggle = computed(() =>
    [
      'submitted',
      'pending_hos',
      'returned_by_hos',
      'recommended_by_hos',
      'rejected_by_hos',
      'pending_rmc',
      'returned_by_rmc',
      'approved_by_rmc',
      'rejected_by_rmc',
      'pending_hr',
      'approved_by_hr',
      'rejected_by_hr',
      'offer_letter_generated'
    ].includes(this.status())
  );

  /** Show RMC toggle from pending_rmc onward */
  showRmcToggle = computed(() =>
    [
      'pending_rmc',
      'returned_by_rmc',
      'approved_by_rmc',
      'rejected_by_rmc',
      'pending_hr',
      'approved_by_hr',
      'rejected_by_hr',
      'offer_letter_generated'
    ].includes(this.status())
  );

  /** Show HR toggle from pending_hr onward */
  showHrToggle = computed(() =>
    [
      'pending_hr',
      'approved_by_hr',
      'rejected_by_hr',
      'offer_letter_generated'
    ].includes(this.status())
  );

  // ── Legacy computed properties for backward compatibility ─────

  /** Mock application data — replace with API call when backend is ready */
  readonly application = signal<RagraApplication>({
    id:                   'RAGRA-2026-001',
    applicantName:        'Test Applicant',
    positionRequested:    'Graduate Research Assistant (PG Student)',
    applicationType:      'New',
    submissionDate:       '2026-05-10',
    status:               'pending_hos',
    round:                '1st Round',
    lastUpdated:          '2026-05-10',
    resubmissionDeadline: null,
    hosDecisionDate:      null,
    rmcDecisionDate:      null,
    hrDecisionDate:       null,
    offerLetterDate:      null,
  });

  readonly label  = computed(() => RAGRA_STATUS_LABELS[this.status()]);
  readonly badge  = computed(() => RAGRA_STATUS_BADGE[this.status()]);
  readonly message = computed(() => RAGRA_STATUS_MESSAGES[this.status()]);

  /** True when the applicant can still edit/continue the form */
  readonly canEdit = computed(() =>
    this.status() === 'draft'
  );

  /** True when the applicant must revise and resubmit */
  readonly needsRevision = computed(() =>
    this.status() === 'returned_by_hos' || this.status() === 'returned_by_rmc'
  );

  /** True when the application is in a terminal rejected/blocked state */
  readonly isRejected = computed(() =>
    ['rejected_by_hos', 'rejected_by_rmc', 'rejected_by_hr', 'blocked'].includes(this.status())
  );

  /** True when the offer letter is ready */
  readonly hasOfferLetter = computed(() =>
    this.status() === 'offer_letter_generated'
  );

  /** True when the application is submitted and under review (read-only) */
  readonly isUnderReview = computed(() =>
    ['submitted', 'pending_hos', 'recommended_by_hos',
     'pending_rmc', 'approved_by_rmc', 'pending_hr', 'approved_by_hr'].includes(this.status())
  );

  /**
   * Returns the active workflow step index (0-based) for the progress tracker.
   * Steps: 0=Submitted, 1=HOS, 2=RMC, 3=HR, 4=Offer Letter
   */
  readonly activeStepIndex = computed((): number => {
    switch (this.status()) {
      case 'draft':
        return -1;
      case 'submitted':
      case 'pending_hos':
      case 'returned_by_hos':
      case 'recommended_by_hos':
      case 'rejected_by_hos':
        return 1;
      case 'pending_rmc':
      case 'returned_by_rmc':
      case 'approved_by_rmc':
      case 'rejected_by_rmc':
        return 2;
      case 'pending_hr':
      case 'approved_by_hr':
      case 'rejected_by_hr':
        return 3;
      case 'offer_letter_generated':
        return 4;
      case 'blocked':
        return 1; // blocked at whichever stage it was at
      default:
        return 0;
    }
  });
}
