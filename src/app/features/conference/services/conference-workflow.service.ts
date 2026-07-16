import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserGroup } from '../../../core/interfaces/user.interface';

/**
 * All valid Conference application status values.
 * Controls visibility, editability, and workflow progression.
 */
export type ConferenceStatus =
  | 'draft'
  | 'normal_application'
  | 'hos_application'
  | 'hos_request_resubmission'
  | 'rmc_request_resubmission'
  | 'hos_pending'
  | 'hos_reject'
  | 'rmc_pending'
  | 'rmc_reject'
  | 'vc_pending'
  | 'vc_reject'
  | 'hr_pending'
  | 'hr_reject'
  | 'Approved';

/** Statuses where the applicant can edit form fields */
const APPLICANT_EDITABLE: ConferenceStatus[] = [
  'draft',
  'normal_application',
  'hos_application',
  'hos_request_resubmission',
  'rmc_request_resubmission',
];

@Injectable({ providedIn: 'root' })
export class ConferenceWorkflowService {
  private auth = inject(AuthService);

  /** Current application status - driven purely by form metadata (ABAC) */
  status = signal<ConferenceStatus>('draft');

  // Applicant editing

  /** True when the applicant can edit all form fields */
  isApplicantEditable = computed(() => APPLICANT_EDITABLE.includes(this.status()));

  /** True when form fields should be read-only */
  isFormReadOnly = computed(() => !this.isApplicantEditable());

  // Per-stage comment/approval editability (ABAC + logged-in user group)
  /** HOS comment editable only for HOS/Admin users during hos_pending */
  isHosEditable = computed(() => this.status() === 'hos_pending' && this.hasAnyGroup(['HOS', 'Admin']));

  /** RMC comment editable only for RMC/Admin users during rmc_pending */
  isRmcEditable = computed(() => this.status() === 'rmc_pending' && this.hasAnyGroup(['RMC', 'Admin']));

  /** VC comment editable only for VC/Admin users during vc_pending */
  isVcEditable = computed(() => this.status() === 'vc_pending' && this.hasAnyGroup(['VC', 'Admin']));

  /** HR comment editable only for HR/Admin users during hr_pending */
  isHrEditable = computed(() => this.status() === 'hr_pending' && this.hasAnyGroup(['HR', 'Admin']));

  private hasAnyGroup(groups: UserGroup[]): boolean {
    return groups.some((group) => this.auth.inGroup(group));
  }

  // ── Comment toggle button visibility (which buttons appear per status) ─

  /** Show HOS toggle from hos_application onward */
  showHosToggle = computed(() =>
    [
      'hos_application',
      'hos_request_resubmission',
      'hos_pending',
      'hos_reject',
      'rmc_request_resubmission',
      'rmc_pending',
      'rmc_reject',
      'vc_pending',
      'vc_reject',
      'hr_pending',
      'hr_reject',
      'Approved',
    ].includes(this.status()),
  );

  /** Show RMC toggle from rmc_pending onward */
  showRmcToggle = computed(() =>
    [
      'rmc_request_resubmission',
      'rmc_pending',
      'rmc_reject',
      'vc_pending',
      'vc_reject',
      'hr_pending',
      'hr_reject',
      'Approved',
    ].includes(this.status()),
  );

  /** Show VC toggle from vc_pending onward */
  showVcToggle = computed(() =>
    ['vc_pending', 'vc_reject', 'hr_pending', 'hr_reject', 'Approved'].includes(this.status()),
  );

  /** Show HR toggle from hr_pending onward */
  showHrToggle = computed(() => ['hr_pending', 'hr_reject', 'Approved'].includes(this.status()));

  // ── Approval card visibility (each stage only exposes the current actor's approval) ─

  /** HOS approval card — visible during hos_pending */
  isHosApprovalVisible = computed(() => this.status() === 'hos_pending');

  /** RMC approval card — visible during rmc_pending */
  isRmcApprovalVisible = computed(() => this.status() === 'rmc_pending');

  /** VC approval card — visible during vc_pending */
  isVcApprovalVisible = computed(() => this.status() === 'vc_pending');

  /** HR approval card — visible during hr_pending */
  isHrApprovalVisible = computed(() => this.status() === 'hr_pending');

  /** HOS approval options */
  readonly hosApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Request Resubmission', value: 'resubmit' },
    { label: 'Reject', value: 'reject' },
  ];

  /** RMC approval options */
  readonly rmcApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Request Resubmission', value: 'resubmit' },
    { label: 'Reject', value: 'reject' },
  ];

  /** VC approval options */
  readonly vcApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Reject', value: 'reject' },
  ];

  /** HR approval options */
  readonly hrApprovalOptions = [
    { label: 'Approve', value: 'approve' },
    { label: 'Reject', value: 'reject' },
  ];
}

