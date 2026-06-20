import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

/**
 * All valid Journal application status values.
 * Controls visibility, editability, and workflow progression.
 */
export type JournalStatus =
  | 'draft'
  | 'submitted'
  | 'pending_hos'
  | 'pending_applicant_resubmission_hos'
  | 'rejected_hos'
  | 'pending_rmc'
  | 'pending_applicant_resubmission_rmc'
  | 'rejected_rmc'
  | 'pending_vc'
  | 'rejected_vc'
  | 'pending_hr'
  | 'rejected_hr'
  | 'pending_ceo'
  | 'rejected_ceo'
  | 'approved';

/** Statuses where the applicant can edit form fields */
const APPLICANT_EDITABLE: JournalStatus[] = [
  'draft',
  'pending_applicant_resubmission_hos',
  'pending_applicant_resubmission_rmc'
];

@Injectable({ providedIn: 'root' })
export class JournalWorkflowService {

  private auth = inject(AuthService);

  /** Current application status — driven purely by form metadata (ABAC) */
  status = signal<JournalStatus>('draft');

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

  /** VC comment editable during pending_vc */
  isVcEditable = computed(() => this.status() === 'pending_vc');

  /** HR comment editable during pending_hr */
  isHrEditable = computed(() => this.status() === 'pending_hr');

  /** CEO comment editable during pending_ceo */
  isCeoEditable = computed(() => this.status() === 'pending_ceo');

  // ── Comment toggle button visibility (which buttons appear per status) ─

  /** Show HOS toggle from submitted/pending_hos onward */
  showHosToggle = computed(() =>
    [
      'submitted',
      'pending_hos',
      'pending_applicant_resubmission_hos',
      'rejected_hos',
      'pending_rmc',
      'pending_applicant_resubmission_rmc',
      'rejected_rmc',
      'pending_vc',
      'rejected_vc',
      'pending_hr',
      'rejected_hr',
      'pending_ceo',
      'rejected_ceo',
      'approved'
    ].includes(this.status())
  );

  /** Show RMC toggle from pending_rmc onward */
  showRmcToggle = computed(() =>
    [
      'pending_rmc',
      'pending_applicant_resubmission_rmc',
      'rejected_rmc',
      'pending_vc',
      'rejected_vc',
      'pending_hr',
      'rejected_hr',
      'pending_ceo',
      'rejected_ceo',
      'approved'
    ].includes(this.status())
  );

  /** Show VC toggle from pending_vc onward */
  showVcToggle = computed(() =>
    [
      'pending_vc',
      'rejected_vc',
      'pending_hr',
      'rejected_hr',
      'pending_ceo',
      'rejected_ceo',
      'approved'
    ].includes(this.status())
  );

  /** Show HR toggle from pending_hr onward */
  showHrToggle = computed(() =>
    [
      'pending_hr',
      'rejected_hr',
      'pending_ceo',
      'rejected_ceo',
      'approved'
    ].includes(this.status())
  );

  /** Show CEO toggle from pending_ceo onward */
  showCeoToggle = computed(() =>
    [
      'pending_ceo',
      'rejected_ceo',
      'approved'
    ].includes(this.status())
  );
}
