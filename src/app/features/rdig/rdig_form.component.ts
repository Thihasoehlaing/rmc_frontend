import { Component, signal, computed, inject, OnInit, OnDestroy, effect, ViewChild } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  BatchSitting,
  WORKFLOW_STAGE_META,
  WorkflowStageKey,
  WorkflowStageWindow,
} from '../../core/interfaces/batch-sitting.interface';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDisplayDateTime } from '../../shared/utils/date-time.util';

// Shared layout components
import {
  FormMainTitleComponent,
  GuidelineContext,
} from '../../shared/components/form-main-title/form-main-title.component';
import {
  StepIndicatorComponent,
  WizardStep,
  StepStatus,
  MissingField,
} from '../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { CustomHeaderComponent } from '../../shared/components/custom-header/custom-header.component';
import {
  FormAlertComponent,
  FormPageContainerComponent,
  ValidationSummaryComponent,
  ValidationSummaryItem,
} from '../../shared/components/form-standard/form-standard.components';

// Subpages
import { TeamDetailsComponent } from './components/team-details/team-details.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';
import { ResearchActivitiesComponent } from './components/research-activities/research-activities.component';
import { OutputDetailsComponent } from './components/output-details/output-details.component';
import { BudgetSummaryComponent } from './components/budget-summary/budget-summary.component';
import { FinalDeclarationComponent } from './components/final-declaration/final-declaration.component';

// Review & workflow
import { ScoreSummaryComponent } from './components/score-summary/score-summary.component';
import { ReviewBlockComponent } from './components/review-block/review-block.component';
import { RdigWorkflowService, RdigStatus, getNextRoles } from './services/rdig-workflow.service';
import { AuthService } from '../../core/services/auth.service';
import {
  WorkflowState,
  WorkflowHistoryEntry,
} from '../../core/interfaces/rdig-application.interface';
import { FormPageSkeletonComponent } from '../../shared/components/form-page-skeleton/form-page-skeleton.component';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { SvgIconComponent } from '../../shared/components/svg-icon/svg-icon.component';
import { SVG_ICON_LOADING_SPINNER, SVG_ICON_SUCCESS_CHECK } from '../../shared/icons/svg-icons';
import {
  RdigActiveBatchResponse,
  RdigApiService,
  RdigFormData,
  RdigRequestDto,
} from './services/rdig-api.service';
import { rdigKeywordsValidator } from './utils/rdig-keywords.util';
import { WorkflowRequestsService, RequestCommentDto, RequestSummaryDto } from '../../core/services/workflow-requests.service';

export function isApplicantSubmissionWindowOpen(
  hasActiveBatch: boolean,
  batchStatus: string | null | undefined,
  applicantStart: string | null,
  applicantEnd: string | null,
  now = Date.now(),
): boolean {
  if (!hasActiveBatch || batchStatus?.trim().toLowerCase() !== 'active') return false;

  const startTime = applicantStart ? new Date(applicantStart).getTime() : NaN;
  const endTime = applicantEnd ? new Date(applicantEnd).getTime() : NaN;
  return (
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    now >= startTime &&
    now <= endTime
  );
}

@Component({
  selector: 'app-rdig-application',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormMainTitleComponent,
    StepIndicatorComponent,
    FormWizardNavComponent,
    CustomHeaderComponent,
    FormAlertComponent,
    FormPageContainerComponent,
    ValidationSummaryComponent,
    TeamDetailsComponent,
    ProjectDetailsComponent,
    ResearchActivitiesComponent,
    OutputDetailsComponent,
    BudgetSummaryComponent,
    FinalDeclarationComponent,
    ScoreSummaryComponent,
    ReviewBlockComponent,
    FormPageSkeletonComponent,
    DialogComponent,
    SvgIconComponent,
  ],
  templateUrl: './rdig_form.component.html',
  styleUrl: './rdig_form.component.scss',
})
export class RdigApplicationComponent implements OnInit, OnDestroy {
  @ViewChild(StepIndicatorComponent) stepIndicator?: StepIndicatorComponent;

  readonly loadingSpinnerIcon = SVG_ICON_LOADING_SPINNER;
  readonly successCheckIcon = SVG_ICON_SUCCESS_CHECK;

  workflow = inject(RdigWorkflowService);
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notifSvc = inject(NotificationService);
  private toastSvc = inject(ToastService);
  private rdigApi = inject(RdigApiService);
  private readonly requestsApi = inject(WorkflowRequestsService);
  readonly savedFeedback = signal<Array<{ id: number; actor: string; section: string; text: string }>>([]);
  private readonly inlineFeedbackIds = signal<Set<number>>(new Set());
  readonly feedbackSources = computed(() => [...new Set(this.savedFeedback().map((comment) => comment.actor))]);
  readonly visibleAdditionalFeedback = computed(() => this.savedFeedback().filter((comment) =>
    !this.inlineFeedbackIds().has(comment.id) && this.feedbackSourceVisible(comment.actor)));
  private readonly additionalFeedbackSources = signal<Set<string>>(new Set());

  private feedbackToggle(source: string) {
    const toggles: Record<string, typeof this.showHosComments> = {
      'HOS / HOD': this.showHosComments, HOS: this.showHosComments, RMC: this.showRmcComments,
      'Reviewer 1': this.showR1Comments, 'Reviewer 2': this.showR2Comments,
      'RDIG Chair': this.showRdigChairComments, 'Vice Chancellor': this.showVcComments, CFO: this.showCfoComments,
    };
    return toggles[source];
  }

  feedbackSourceVisible(source: string): boolean {
    return this.feedbackToggle(source)?.() ?? this.additionalFeedbackSources().has(source);
  }

  feedbackCount(source: string): number {
    return this.savedFeedback().filter((comment) => comment.actor === source).length;
  }

  toggleFeedbackSource(source: string): void {
    const toggle = this.feedbackToggle(source);
    if (toggle) toggle.update((visible) => !visible);
    else this.additionalFeedbackSources.update((sources) => {
      const next = new Set(sources);
      if (next.has(source)) next.delete(source); else next.add(source);
      return next;
    });
  }
  readonly guidelineContext: GuidelineContext = this.route.snapshot.queryParamMap.has('request_id') || this.route.snapshot.queryParamMap.has('id')
    ? 'existing-application'
    : 'new-application';

  /** Active RDIG guideline for applicants — served by the guideline-by-form endpoint (auth-only, no admin gate). */
  readonly guidelinesEndpoint = `${environment.apiUrl}/admin-settings/guidelines/forms/RDIG`;

  /** The currently active batch loaded from the server on init. */
  activeBatch = signal<BatchSitting | null | undefined>(undefined); // undefined = loading

  /** Whether the active batch's Applicant workflow window is currently open. */
  readonly applicantWindowOpen = signal(false);

  /** Next planned Applicant workflow window, when supplied by the applicant-safe endpoint. */
  readonly nextApplicantWindow = signal<{ startDate: string; endDate: string } | null>(null);

  /** True while the batch status and Applicant workflow window are being fetched. */
  readonly isBatchLoading = computed(() => this.activeBatch() === undefined);

  /** DEV ONLY - bypasses active-batch checks so the form can be opened for testing. */
  batchValidationDisabled = signal(false);

  /** The form is always shown once batch loading completes - no hard-block gate. */
  readonly canShowForm = computed(() => this.activeBatch() !== undefined);

  /** Applicant-stage dates only. General batch dates must never be used here. */
  readonly submissionOpenIso = computed<string | null>(() =>
    this.activeBatch()?.stages?.applicant?.startDate ?? null,
  );

  readonly submissionCloseIso = computed<string | null>(() =>
    this.activeBatch()?.stages?.applicant?.endDate ?? null,
  );

  readonly hasActiveApplicantWindow = computed(
    () => this.applicantWindowOpen() && !!this.activeBatch(),
  );


  /** Formats an ISO date/datetime for display in the batch banner. */
  fmtWindow(iso: string | null): string {
    return formatDisplayDateTime(iso, iso || '\u2014');
  }

  private emptyStageWindows(): Record<WorkflowStageKey, WorkflowStageWindow> {
    return Object.fromEntries(
      WORKFLOW_STAGE_META.map((stage) => [stage.key, { startDate: null, endDate: null }]),
    ) as Record<WorkflowStageKey, WorkflowStageWindow>;
  }

  private batchStagesFromApi(
    batch: NonNullable<RdigActiveBatchResponse['batch']>,
    applicantStart: string | null,
    applicantEnd: string | null,
  ): Record<WorkflowStageKey, WorkflowStageWindow> {
    const stages = this.emptyStageWindows();
    const keyByLabel = new Map(
      WORKFLOW_STAGE_META.map((stage) => [stage.label.trim().toLowerCase(), stage.key]),
    );

    for (const stageWindow of batch.stage_windows ?? []) {
      const key = keyByLabel.get(stageWindow.stage_name.trim().toLowerCase());
      if (!key) continue;
      stages[key] = {
        startDate: stageWindow.stage_start_date,
        endDate: stageWindow.stage_end_date,
      };
    }

    stages.applicant = {
      startDate: applicantStart,
      endDate: applicantEnd,
    };
    return stages;
  }

  // ── Wizard state ───────────────────────────────────────────────
  currentStep = signal<number>(1);
  readonly totalSteps = 4;

  isSaving = signal(false);
  submissionState = signal<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  submissionErrorMessage = signal('');
  isSubmitting = computed(() => this.submissionState() !== 'IDLE');
  submitAttempted = signal(false);
  showValidationSummary = signal(false);
  isAdminReadOnlyDraft = signal(false);
  isViewOnly = computed(() => this.isAdminReadOnlyDraft() || !this.workflow.currentUserCanAct());

  /**
   * The json-server record ID for the currently loaded application.
   * null  → no record exists yet (new application, next save will POST)
   * set   → record exists (next save will PUT to /applications/:id)
   */
  private loadedAppId = signal<string | null>(null);

  /** DEV ONLY — bypasses form validation to allow unrestricted navigation and submission. */
  validationDisabled = signal(false);

  /** True when the closed-window submission-blocked modal is visible. */
  showClosedWindowModal = signal(false);

  /** Tracks the live workflow state — persisted alongside form data */
  workflowState = signal<WorkflowState>({
    currentStatus: 'draft',
    nextRoles: ['Applicant'],
    nextUsers: [],
    history: [],
  });

  /** Per-role comment toggles */
  showHosComments = signal(false);
  showRmcComments = signal(false);
  showR1Comments = signal(false);
  showR2Comments = signal(false);
  showRdigChairComments = signal(false);
  showVcComments = signal(false);
  showCfoComments = signal(false);

  /** True when any comment panel is visible */
  showAnyComments = computed(
    () =>
      this.showHosComments() ||
      this.showRmcComments() ||
      this.showR1Comments() ||
      this.showR2Comments() ||
      this.showRdigChairComments() ||
      this.showVcComments() ||
      this.showCfoComments(),
  );

  /** Tracks steps the user has left, making them eligible for warning/complete state */
  checkedSteps = new Set<number>();

  // ── Step metadata ──────────────────────────────────────────────
  readonly steps: WizardStep[] = [
    { label: 'Team Members', icon: 'group' },
    { label: 'Project Details', icon: 'description' },
    { label: 'Research Output & Budget', icon: 'science' },
    { label: 'Declaration', icon: 'verified' },
  ];

  /** Field paths & labels per step for validation tooltip */
  readonly stepFieldChecks: Array<Array<{ path: string; label: string; target?: string }>> = [
    // Step 1: Team Members
    [
      { path: 'teamDetails.leaderName', label: 'Project Leader Name' },
      { path: 'teamDetails.leaderEmail', label: "Project Leader's Email" },
      { path: 'teamDetails.department', label: 'School / Department' },
      { path: 'teamDetails.researchCluster', label: 'Select Research Cluster' },
      { path: 'teamDetails.leaderRoles', label: 'Roles of Project Leader' },
      {
        path: 'teamDetails.internalResearchers',
        label: 'Asia Pacific University of Technology & Innovation Co-Researchers (min 1)',
      },
      { path: 'teamDetails.externalResearchers', label: 'External Collaborators (min 2)' },
    ],
    // Step 2: Project Details
    [
      { path: 'projectDetails.applicationType', label: 'Application Type' },
      { path: 'projectDetails.declarations.ethics', label: 'RDIG Project Declaration' },
      { path: 'projectDetails.declarations.conflict', label: 'Co-Researcher Declaration' },
      { path: 'projectDetails.track', label: 'Track' },
      { path: 'projectDetails.duration', label: 'Project Duration' },
      { path: 'projectDetails.title', label: 'Project Title' },
      { path: 'projectDetails.researchArea', label: 'Research Area' },
      { path: 'projectDetails.domain', label: 'Select Research Domain' },
      { path: 'projectDetails.subDomain', label: 'Select Sub-Research Domain' },
      { path: 'projectDetails.esgs', label: 'Select the Appropriate ESG(s)' },
      { path: 'projectDetails.sdgs', label: 'Select the Appropriate SDG(s)' },
      {
        path: 'projectDetails.executiveSummary',
        label: 'Executive Summary of the Research Proposal',
      },
      { path: 'projectDetails.keywords', label: 'Keywords' },
      { path: 'projectDetails.introduction', label: 'Introduction' },
      { path: 'projectDetails.problemStatement', label: 'Problem Statement' },
      { path: 'projectDetails.researchAim', label: 'Research Aim and Objectives' },
      { path: 'projectDetails.researchQuestions', label: 'Research Questions' },
      { path: 'projectDetails.hypothesis', label: 'Hypothesis/Propositions' },
      { path: 'projectDetails.literatureReview', label: 'Literature Review' },
      { path: 'projectDetails.methodology', label: 'Research Methodology' },
      { path: 'projectDetails.references', label: 'References' },
      {
        path: 'projectDetails.benefits.apu',
        label: 'Asia Pacific University of Technology & Innovation Benefit',
      },
      { path: 'projectDetails.benefits.students', label: 'Students Benefit' },
      { path: 'projectDetails.benefits.stakeholders', label: 'Stakeholders Benefit' },
      { path: 'projectDetails.visionMission', label: 'Vision & Mission Alignment' },
    ],
    // Step 3: Research Output & Budget
    [
      {
        path: 'outputs.journal.checked',
        label: 'Indexed Journal Publication (SCOPUS-Indexed Q1 and Q2)',
      },
      { path: 'outputs.journal.quantity', label: 'Indexed Journal Publication Quantity' },
      { path: 'outputs.conceptualDesign', label: 'Conceptual Design or Theoretical Framework' },
      { path: 'outputs.knowledgeTransfer.checked', label: 'Knowledge Transfer Programme' },
      { path: 'outputs.knowledgeTransfer.community', label: 'Knowledge Transfer Community' },
      {
        path: 'outputs.externalGrant.scheme',
        label: 'Application to external grant scheme',
        target: 'outputs.externalGrant.checked',
      },
      {
        path: 'outputs.others.details',
        label: 'Describe other outputs',
        target: 'outputs.others.checked',
      },
    ],
    // Step 4: Declaration
    [
      { path: 'finalDeclaration.noveltyJustification', label: 'Novelty Justification' },
      { path: 'finalDeclaration.agreed', label: 'Declaration Agreement' },
    ],
  ];

  /** Review form groups mapped by step index (0-based) */
  private readonly reviewGroupByStep = [
    ['reviewTeam'], // Step 1
    ['reviewProject'], // Step 2
    ['reviewOutput', 'reviewBudget'], // Step 3
    ['reviewDeclaration'], // Step 4
  ];

  /** Returns labels for required-but-empty controls in a FormGroup */
  private getRequiredInvalidLabels(groupPath: string): MissingField[] {
    const group = this.rdigForm.get(groupPath) as FormGroup | null;
    if (!group) return [];
    return Object.entries(group.controls)
      .filter(([, ctrl]) => ctrl.hasError('required'))
      .map(([key]) => ({ label: this.fieldKeyToLabel(key), target: groupPath + '.' + key }));
  }

  /** Convert camelCase field key to a readable label */
  private fieldKeyToLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/\bHos\b/g, 'HOS')
      .replace(/\bRmc\b/g, 'RMC')
      .replace(/\bRdig\b/g, 'RDIG')
      .replace(/\bVc\b/g, 'VC')
      .replace(/\bCfo\b/g, 'CFO')
      .replace(/\bSdg\b/g, 'SDG')
      .replace(/\bEsg\b/g, 'ESG');
  }

  private budgetRangeValidator = (control: AbstractControl): ValidationErrors | null => {
    const budget = control as FormGroup;
    const total = Number(budget.getRawValue()?.totalRequest ?? 0);
    const category = budget.parent?.get('projectDetails.category')?.value;

    if (category === 'S&T' && (total < 20000 || total > 30000)) {
      return { budgetRange: true };
    }

    if (category === 'Non S&T' && (total < 5000 || total > 10000)) {
      return { budgetRange: true };
    }

    return null;
  };

  private activitiesTimelineValidator = (control: AbstractControl): ValidationErrors | null => {
    const activities = control as FormArray;
    const minMonth = 0;
    const maxMonth = 12;

    if (!activities || activities.length === 0) return { activitiesTimeline: true };

    for (let i = 0; i < activities.length; i++) {
      const activity = activities.at(i);
      const start = Number(activity.get('startMonth')?.value ?? 0);
      const end = Number(activity.get('endMonth')?.value ?? 0);

      if (!Number.isFinite(start) || !Number.isFinite(end)) return { activitiesTimeline: true };
      if (start < minMonth || end < start || end > maxMonth) return { activitiesTimeline: true };
    }

    return null;
  };

  getStepStatuses(): StepStatus[] {
    if (this.validationDisabled()) {
      return this.steps.map((_, i) => ({
        visited: this.checkedSteps.has(i + 1),
        valid: true,
        missingFields: [],
      }));
    }
    return this.steps.map((_, i) => {
      const stepNum = i + 1;
      const visited = this.checkedSteps.has(stepNum);
      const checks = this.stepFieldChecks[i] ?? [];
      const missingFields: MissingField[] = checks
        .filter((c) => this.rdigForm.get(c.path)?.invalid)
        .map((c) => ({
          label: c.label,
          target: c.target ?? c.path,
        }));

      // Step 2 also includes Research Activities (applicant-only)
      if (stepNum === 2 && this.workflow.isApplicantEditable()) {
        const acts = this.rdigForm.get('activities') as FormArray;
        if (!acts || acts.length === 0) {
          missingFields.push({ label: 'At least 1 Research Activity', target: 'activities' });
        } else {
          acts.controls.forEach((ctrl, idx) => {
            if (ctrl.get('name')?.invalid || !String(ctrl.get('name')?.value ?? '').trim()) {
              missingFields.push({ label: 'Activity ' + (idx + 1) + ' Description', target: 'activities' });
            }
          });
          if (acts.hasError('activitiesTimeline')) {
            missingFields.push({ label: 'Research Activities Timeline', target: 'activities' });
          }
        }
      }

      if (stepNum === 3 && this.rdigForm.get('budget')?.hasError('budgetRange')) {
        missingFields.push({ label: 'Total Amount Requested', target: 'totalRequest' });
      }

      // Include required-but-empty review fields (set dynamically by ReviewBlockComponent
      // and ApprovalCardComponent when the current user's role is editable)
      const reviewGroups = this.reviewGroupByStep[i] ?? [];
      reviewGroups.forEach((reviewGroup) => {
        missingFields.push(...this.getRequiredInvalidLabels(reviewGroup));
      });
      // Step 4 also includes approval decision controls
      if (stepNum === 4) {
        missingFields.push(...this.getRequiredInvalidLabels('approvals'));
      }

      return { visited, valid: missingFields.length === 0, missingFields };
    });
  }

  applicationProgress(): number {
    const criteria = this.stepFieldChecks.flat();
    if (!criteria.length) return 0;

    let completed = criteria.filter((check) => this.isProgressFieldComplete(check.path)).length;
    let total = criteria.length;

    // Research Activities are a required part of Project Details even though their
    // rows are managed in a separate form array.
    if (this.workflow.isApplicantEditable()) {
      const activities = this.rdigForm.get('activities') as FormArray | null;
      total += 1;
      if (activities?.length && activities.valid) completed += 1;
    }

    // Include cross-field validation that is not represented by a single field path.
    const budget = this.rdigForm.get('budget');
    if (budget) {
      total += 1;
      if (budget.valid && !budget.hasError('budgetRange')) completed += 1;
    }

    return Math.round((completed / total) * 100);
  }

  isStepComplete(stepNumber: number): boolean {
    const checks = this.stepFieldChecks[stepNumber - 1] ?? [];
    if (!checks.length) return false;
    const fieldsComplete = checks.every((check) => this.isProgressFieldComplete(check.path));
    const status = this.getStepStatuses()[stepNumber - 1];
    return fieldsComplete && !!status?.valid;
  }

  private isProgressFieldComplete(path: string): boolean {
    const control = this.rdigForm.get(path);
    if (!control) return false;
    if (!control.disabled) return control.valid;
    // Prefilled identity controls are disabled for editing, but still count
    // when populated. Other disabled controls are excluded by conditional rules.
    if (['teamDetails.leaderName', 'teamDetails.leaderEmail', 'teamDetails.department'].includes(path)) {
      return !!String(control.value ?? '').trim();
    }
    return true;
  }

  get validationSummaryItems(): ValidationSummaryItem[] {
    if (!this.showValidationSummary()) return [];

    return this.getStepStatuses().flatMap((status, index) =>
      status.missingFields.map((field) => ({ label: typeof field === 'string' ? field : field.label, step: index + 1 })),
    );
  }

  goToMissingField(event: { step: number; field: MissingField }): void {
    this.goToStep(event.step);
    const target =
      typeof event.field === 'string'
        ? event.field
        : event.field.target ?? event.field.label;

    setTimeout(() => {
      const escapedTarget = CSS.escape(target);
      const controlName = target.split('.').at(-1) ?? target;
      const escapedControlName = CSS.escape(controlName);
      const root = document.querySelector<HTMLElement>('.rdig-app');
      const element = root?.querySelector<HTMLElement>(
        '[data-missing-field-target="' +
          escapedTarget +
          '"], [data-missing-field-score-target="' +
          escapedTarget +
          '"], [formControlName="' +
          escapedTarget +
          '"], [formControlName="' +
          escapedControlName +
          '"]',
      );
      const fallback = root?.querySelector<HTMLElement>(
        '.rdig-step-panel form .ng-invalid:not(form):not(fieldset)',
      );
      const targetElement = element ?? fallback;
      if (!targetElement) return;

      const focusTarget = targetElement.matches('input, textarea, select, button, [tabindex]')
        ? targetElement
        : targetElement.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');
      const scrollTarget =
        targetElement.closest<HTMLElement>(
          '[data-missing-field-target], .form-field, .form-group, .radio-group, .checkbox-group',
        ) ?? targetElement;

      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightMissingField(scrollTarget);
      focusTarget?.focus({ preventScroll: true });
    });
  }

  private highlightMissingField(element: HTMLElement): void {
    const previousOutline = element.style.outline;
    const previousBoxShadow = element.style.boxShadow;
    const previousBorderRadius = element.style.borderRadius;
    element.style.outline = '2px solid var(--color-primary)';
    element.style.boxShadow = '0 0 0 4px var(--color-primary-light)';
    element.style.borderRadius = 'var(--radius-md)';

    window.setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.boxShadow = previousBoxShadow;
      element.style.borderRadius = previousBorderRadius;
    }, 1800);
  }
  onValidationItemSelected(item: ValidationSummaryItem): void {
    this.goToStep(item.step);
    setTimeout(() => {
      const firstInvalid = document.querySelector<HTMLElement>(
        '.rdig-app form .ng-invalid:not(form):not(fieldset)',
      );
      firstInvalid?.focus();
    });
  }

  // ── Master FormGroup ───────────────────────────────────────────
  rdigForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.rdigForm = this.fb.group({
      // 1. Hidden metadata (system-managed)
      // Status is in workflow.currentStatus (single source of truth).
      // Record ID is tracked via loadedAppId signal (not stored in the form).
      metadata: this.fb.group({
        batch: [null], // auto-assigned from active batch on submit — never set manually
        applicationVersion: [1],
        reviewers_version: [1],
        applicantUserId: [null], // stamped on first submit — used to target rejection/revision notifications
        rdigRequestId: [null], // the real backend's rdig_request_id — kept separate from the json-server id
      }),

      // 2. Subpage 1 — Team Members (pre-filled from the logged-in user)
      teamDetails: this.fb.group({
        leaderName: [
          { value: this.auth.currentUser()?.name ?? '', disabled: true },
          Validators.required,
        ],
        leaderEmail: [
          { value: this.auth.currentUser()?.email ?? '', disabled: true },
          [Validators.required, Validators.email],
        ],
        department: [
          { value: this.auth.currentUser()?.department ?? '', disabled: true },
          Validators.required,
        ],
        researchCluster: [null, Validators.required],
        leaderRoles: ['', [Validators.required, Validators.maxLength(600)]],
        internalResearchers: this.fb.array(
          [],
          [Validators.required, Validators.minLength(1), Validators.maxLength(2)],
        ),
        externalResearchers: this.fb.array(
          [],
          [Validators.required, Validators.minLength(2), Validators.maxLength(10)],
        ),
      }),

      // 3. Subpage 2 — Project Details
      projectDetails: this.fb.group({
        applicationType: ['', Validators.required],
        declarations: this.fb.group({
          ethics: [false, Validators.requiredTrue],
          conflict: [false, Validators.requiredTrue],
        }),
        category: ['S&T'],
        track: ['', Validators.required],
        duration: ['', Validators.required],
        title: ['', [Validators.required, Validators.maxLength(200)]],
        researchArea: ['', [Validators.required, Validators.maxLength(100)]],
        domain: ['', Validators.required],
        subDomain: ['', Validators.required],
        esgs: [[], [Validators.required, Validators.minLength(1), Validators.maxLength(3)]],
        sdgs: [[], [Validators.required, Validators.minLength(1), Validators.maxLength(3)]],
        executiveSummary: ['', [Validators.required, Validators.maxLength(1500)]],
        keywords: ['', [Validators.required, rdigKeywordsValidator]],
        introduction: ['', [Validators.required, Validators.maxLength(3000)]],
        problemStatement: ['', [Validators.required, Validators.maxLength(3000)]],
        researchAim: ['', [Validators.required, Validators.maxLength(1000)]],
        researchQuestions: ['', [Validators.required, Validators.maxLength(1000)]],
        hypothesis: ['', [Validators.required, Validators.maxLength(1000)]],
        literatureReview: ['', [Validators.required, Validators.maxLength(5000)]],
        methodology: ['', [Validators.required, Validators.maxLength(3000)]],
        references: ['', [Validators.required, Validators.maxLength(3000)]],
        benefits: this.fb.group({
          apu: ['', [Validators.required, Validators.maxLength(300)]],
          students: ['', [Validators.required, Validators.maxLength(300)]],
          stakeholders: ['', [Validators.required, Validators.maxLength(300)]],
        }),
        visionMission: ['', [Validators.required, Validators.maxLength(300)]],
      }),

      // 4. Subpage 3 — Research Activities
      activities: this.fb.array([], { validators: [this.activitiesTimelineValidator] }),

      // 5. Subpage 4 — Research Output
      outputs: this.fb.group({
        journal: this.fb.group({
          checked: [false, Validators.requiredTrue],
          quantity: [null, Validators.required],
        }),
        conceptualDesign: [false, Validators.requiredTrue],
        knowledgeTransfer: this.fb.group({
          checked: [false, Validators.requiredTrue],
          community: ['', Validators.required],
        }),
        externalGrant: this.fb.group({
          checked: [false],
          scheme: [''],
        }),
        others: this.fb.group({
          checked: [false],
          details: ['', Validators.maxLength(200)],
        }),
      }),

      // 6. Subpage 5 — Budget
      budget: this.fb.group(
        {
          studentAllowances: this.fb.array([]),
          travelAccommodation: this.fb.array([]),
          materialsSupplies: this.fb.array([]),
          specialServices: this.fb.array([]),
          otherRemarks: ['', Validators.maxLength(300)],
          totalRequest: [{ value: 0, disabled: true }],
        },
        { validators: [this.budgetRangeValidator] },
      ),

      // 7. Final Declaration
      finalDeclaration: this.fb.group({
        noveltyJustification: ['', [Validators.required, Validators.maxLength(1000)]],
        agreed: [false, Validators.requiredTrue],
      }),

      // ── 8. Review & Approval Data ──────────────────────────────

      // Page 1 (Team Details) reviews
      reviewTeam: this.fb.group({
        hosComment: ['', Validators.maxLength(1000)],
        reviewer1Comment: ['', Validators.maxLength(1000)],
        reviewer1Score: [''],
        reviewer2Comment: ['', Validators.maxLength(1000)],
        reviewer2Score: [''],
        rmcComment: ['', Validators.maxLength(1000)],
      }),

      // Page 2 (Project Details) reviews — per-field comments & scores
      reviewProject: this.fb.group({
        // HOS page-level comment (covers all of Project Details page)
        hosPageComment: ['', Validators.maxLength(1000)],
        // Between category/duration/title
        reviewer1ClassificationComment: ['', Validators.maxLength(1000)],
        reviewer2ClassificationComment: ['', Validators.maxLength(1000)],
        // Per-field comment-only (Project Title, Research Area, ESG, SDG, Keywords, References, Vision, Activities)
        reviewer1TitleComment: ['', Validators.maxLength(1000)],
        reviewer2TitleComment: ['', Validators.maxLength(1000)],
        reviewer1ResearchAreaComment: ['', Validators.maxLength(1000)],
        reviewer2ResearchAreaComment: ['', Validators.maxLength(1000)],
        reviewer1EsgComment: ['', Validators.maxLength(1000)],
        reviewer2EsgComment: ['', Validators.maxLength(1000)],
        reviewer1SdgComment: ['', Validators.maxLength(1000)],
        reviewer2SdgComment: ['', Validators.maxLength(1000)],
        reviewer1KeywordsComment: ['', Validators.maxLength(1000)],
        reviewer2KeywordsComment: ['', Validators.maxLength(1000)],
        reviewer1ReferencesComment: ['', Validators.maxLength(1000)],
        reviewer2ReferencesComment: ['', Validators.maxLength(1000)],
        reviewer1VisionComment: ['', Validators.maxLength(1000)],
        reviewer2VisionComment: ['', Validators.maxLength(1000)],
        reviewer1ActivitiesComment: ['', Validators.maxLength(1000)],
        reviewer2ActivitiesComment: ['', Validators.maxLength(1000)],
        // Comment + Score sections (0-10)
        reviewer1SummaryComment: ['', Validators.maxLength(1000)],
        reviewer1SummaryScore: [''],
        reviewer2SummaryComment: ['', Validators.maxLength(1000)],
        reviewer2SummaryScore: [''],
        reviewer1IntroComment: ['', Validators.maxLength(1000)],
        reviewer1IntroScore: [''],
        reviewer2IntroComment: ['', Validators.maxLength(1000)],
        reviewer2IntroScore: [''],
        reviewer1ProblemComment: ['', Validators.maxLength(1000)],
        reviewer1ProblemScore: [''],
        reviewer2ProblemComment: ['', Validators.maxLength(1000)],
        reviewer2ProblemScore: [''],
        reviewer1HypothesisComment: ['', Validators.maxLength(1000)],
        reviewer1HypothesisScore: [''],
        reviewer2HypothesisComment: ['', Validators.maxLength(1000)],
        reviewer2HypothesisScore: [''],
        reviewer1LitReviewComment: ['', Validators.maxLength(1000)],
        reviewer1LitReviewScore: [''],
        reviewer2LitReviewComment: ['', Validators.maxLength(1000)],
        reviewer2LitReviewScore: [''],
        reviewer1MethodComment: ['', Validators.maxLength(1000)],
        reviewer1MethodScore: [''],
        reviewer2MethodComment: ['', Validators.maxLength(1000)],
        reviewer2MethodScore: [''],
        reviewer1StakeholdersComment: ['', Validators.maxLength(1000)],
        reviewer1StakeholdersScore: [''],
        reviewer2StakeholdersComment: ['', Validators.maxLength(1000)],
        reviewer2StakeholdersScore: [''],
        // Research Aim & Questions (0-5)
        reviewer1AimComment: ['', Validators.maxLength(1000)],
        reviewer1AimScore: [''],
        reviewer2AimComment: ['', Validators.maxLength(1000)],
        reviewer2AimScore: [''],
        reviewer1QuestionsComment: ['', Validators.maxLength(1000)],
        reviewer1QuestionsScore: [''],
        reviewer2QuestionsComment: ['', Validators.maxLength(1000)],
        reviewer2QuestionsScore: [''],
        rmcAimComment: ['', Validators.maxLength(1000)],
      }),

      // Page 3 (Output Details) reviews
      reviewOutput: this.fb.group({
        hosComment: ['', Validators.maxLength(1000)],
        reviewer1Comment: ['', Validators.maxLength(1000)],
        reviewer2Comment: ['', Validators.maxLength(1000)],
        rmcComment: ['', Validators.maxLength(1000)],
      }),

      // Page 4 (Budget) reviews — per detail breakdown
      reviewBudget: this.fb.group({
        reviewer1StudentComment: ['', Validators.maxLength(1000)],
        reviewer2StudentComment: ['', Validators.maxLength(1000)],
        reviewer1TravelComment: ['', Validators.maxLength(1000)],
        reviewer2TravelComment: ['', Validators.maxLength(1000)],
        reviewer1MaterialsComment: ['', Validators.maxLength(1000)],
        reviewer2MaterialsComment: ['', Validators.maxLength(1000)],
        reviewer1ServicesComment: ['', Validators.maxLength(1000)],
        reviewer2ServicesComment: ['', Validators.maxLength(1000)],
        // Final budget section: full evaluation
        hosComment: ['', Validators.maxLength(1000)],
        rmcComment: ['', Validators.maxLength(1000)],
        reviewer1Comment: ['', Validators.maxLength(1000)],
        reviewer1Score: [''],
        reviewer2Comment: ['', Validators.maxLength(1000)],
        reviewer2Score: [''],
      }),

      // Page 5 (Declaration) reviews + approvals
      reviewDeclaration: this.fb.group({
        rdigChairComment: ['', Validators.maxLength(1000)],
        vcComment: ['', Validators.maxLength(1000)],
      }),

      // Approval decisions
      approvals: this.fb.group({
        hosStatus: [''],
        rmcStatus: [''],
        reviewer1Decision: [''],
        reviewer2Decision: [''],
        rdigChairStatus: [''],
        vcStatus: [''],
        cfoStatus: [''],
        reviewer1Assignment: ['4'],
        reviewer2Assignment: ['4'],
      }),
    });

    this.rdigForm.get('budget')?.updateValueAndValidity({ emitEvent: false });
    this.rdigForm.get('activities')?.updateValueAndValidity({ emitEvent: false });

    // Reactively disable/enable applicant form groups based on workflow status.
    // Review groups (reviewTeam, reviewProject, etc.) and approvals are NOT included
    // here — they are controlled individually by each review-block/approval-card.
    effect(() => {
      const readOnly = this.workflow.isFormReadOnly();
      const applicantGroups = [
        'teamDetails',
        'projectDetails',
        'activities',
        'outputs',
        'budget',
        'finalDeclaration',
      ];
      applicantGroups.forEach((name) => {
        const ctrl = this.rdigForm.get(name);
        readOnly ? ctrl?.disable({ emitEvent: false }) : ctrl?.enable({ emitEvent: false });
      });
      // totalRequest is always computed — keep it disabled regardless
      this.rdigForm.get('budget.totalRequest')?.disable({ emitEvent: false });
      ['leaderName', 'leaderEmail', 'department'].forEach((name) => {
        this.rdigForm.get(`teamDetails.${name}`)?.disable({ emitEvent: false });
      });
    });
  }

  /** DEV ONLY — toggles validation bypass for testing navigation and submission. */
  toggleValidation(): void {
    this.validationDisabled.update((v) => !v);
  }

  /** DEV ONLY - toggles active-batch validation for testing access and submission. */
  toggleBatchValidation(): void {
    this.batchValidationDisabled.update((v) => !v);
  }

  // ── Score computations ─────────────────────────────────────────

  /** Helper to read a number score from a form path */
  private scoreVal(path: string): number {
    return parseInt(this.rdigForm.get(path)?.value, 10) || 0;
  }

  /** Total score for Reviewer 1 across all pages */
  get reviewer1Total(): number {
    return (
      // Page 1
      this.scoreVal('reviewTeam.reviewer1Score') +
      // Page 2: 7 × 10-point sections
      this.scoreVal('reviewProject.reviewer1SummaryScore') +
      this.scoreVal('reviewProject.reviewer1IntroScore') +
      this.scoreVal('reviewProject.reviewer1ProblemScore') +
      this.scoreVal('reviewProject.reviewer1HypothesisScore') +
      this.scoreVal('reviewProject.reviewer1LitReviewScore') +
      this.scoreVal('reviewProject.reviewer1MethodScore') +
      this.scoreVal('reviewProject.reviewer1StakeholdersScore') +
      // Page 2: 2 × 5-point sections
      this.scoreVal('reviewProject.reviewer1AimScore') +
      this.scoreVal('reviewProject.reviewer1QuestionsScore') +
      // Page 4: budget final
      this.scoreVal('reviewBudget.reviewer1Score')
    );
  }

  /** Total score for Reviewer 2 across all pages */
  get reviewer2Total(): number {
    return (
      this.scoreVal('reviewTeam.reviewer2Score') +
      this.scoreVal('reviewProject.reviewer2SummaryScore') +
      this.scoreVal('reviewProject.reviewer2IntroScore') +
      this.scoreVal('reviewProject.reviewer2ProblemScore') +
      this.scoreVal('reviewProject.reviewer2HypothesisScore') +
      this.scoreVal('reviewProject.reviewer2LitReviewScore') +
      this.scoreVal('reviewProject.reviewer2MethodScore') +
      this.scoreVal('reviewProject.reviewer2StakeholdersScore') +
      this.scoreVal('reviewProject.reviewer2AimScore') +
      this.scoreVal('reviewProject.reviewer2QuestionsScore') +
      this.scoreVal('reviewBudget.reviewer2Score')
    );
  }

  /** Helper to get a FormControl from the form */
  fc(path: string): FormControl {
    return this.rdigForm.get(path) as FormControl;
  }

  /** Helper to get a reviewProject FormControl by name */
  rfcProject(name: string): FormControl {
    return this.rdigForm.get('reviewProject')!.get(name) as FormControl;
  }

  // ── Comment toggles ────────────────────────────────────────────
  toggleHosComments(): void {
    this.showHosComments.update((v) => !v);
  }
  toggleRmcComments(): void {
    this.showRmcComments.update((v) => !v);
  }
  toggleR1Comments(): void {
    this.showR1Comments.update((v) => !v);
  }
  toggleR2Comments(): void {
    this.showR2Comments.update((v) => !v);
  }
  toggleRdigChairComments(): void {
    this.showRdigChairComments.update((v) => !v);
  }
  toggleVcComments(): void {
    this.showVcComments.update((v) => !v);
  }
  toggleCfoComments(): void {
    this.showCfoComments.update((v) => !v);
  }

  // ── Loading indicator for when fetching an existing application ──
  isLoadingApplication = signal(false);

  // ── Sync ABAC attributes to workflow ───────────────────────────
  ngOnInit(): void {
    // Applicant-safe facade over the same batch data used by the original green card.
    this.rdigApi.getActiveBatch().subscribe({
      next: (res) => {
        const data = res.data;
        const batch = data?.batch;
        const applicantStage = batch?.stage_windows?.find(
          (stage) => stage.stage_name.trim().toLowerCase() === 'applicant',
        );
        const applicantStart =
          applicantStage?.stage_start_date ??
          batch?.applicant_stage_start_date ??
          batch?.submission_start_date ??
          batch?.applicant_start_date ??
          null;
        const applicantEnd =
          applicantStage?.stage_end_date ??
          batch?.applicant_stage_end_date ??
          batch?.submission_end_date ??
          batch?.applicant_end_date ??
          null;
        const isApplicantWindowOpen =
          !!batch &&
          isApplicantSubmissionWindowOpen(
            !!data?.has_active_batch,
            batch?.status,
            applicantStart,
            applicantEnd,
          );

        this.applicantWindowOpen.set(isApplicantWindowOpen);
        this.nextApplicantWindow.set(null);
        this.activeBatch.set(
          batch
            ? ({
                id: batch.id,
                batchName: batch.batch_name,
                status: batch.status,
                startDate: batch.start_date,
                endDate: batch.end_date,
                stages: this.batchStagesFromApi(batch, applicantStart, applicantEnd),
              } as unknown as BatchSitting)
            : null,
        );
      },
      error: () => {
        this.applicantWindowOpen.set(false);
        this.nextApplicantWindow.set(null);
        this.activeBatch.set(null);
      },
    });

    // If a request ID is in the URL (?request_id=xxx), load and restore that application.
    const id = this.route.snapshot.queryParamMap.get('request_id') ?? this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.loadApplication(id);
    } else {
      this.workflow.currentUserCanAct.set(true);
      this.syncWorkflowFromForm();
    }

    // Sync reviewer assignment IDs → workflow identity signals (dynamic ABAC)
    const r1Ctrl = this.rdigForm.get('approvals.reviewer1Assignment')!;
    const r2Ctrl = this.rdigForm.get('approvals.reviewer2Assignment')!;
    this.workflow.reviewer1UserId.set(r1Ctrl.value ?? '');
    this.workflow.reviewer2UserId.set(r2Ctrl.value ?? '');
    r1Ctrl.valueChanges.subscribe((v) => this.workflow.reviewer1UserId.set(v ?? ''));
    r2Ctrl.valueChanges.subscribe((v) => this.workflow.reviewer2UserId.set(v ?? ''));
    this.rdigForm.get('projectDetails.category')?.valueChanges.subscribe(() => {
      this.rdigForm.get('budget')?.updateValueAndValidity({ emitEvent: false });
    });
    this.rdigForm.get('projectDetails.duration')?.valueChanges.subscribe(() => {
      this.rdigForm.get('activities')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.draftSaveTimer);
  }

  /**
   * Push persisted workflow/version values into the workflow service signals.
   * Status is read from workflowState (set by patchFormFromSavedData or
   * defaulting to 'draft' for new applications).
   */
  private syncWorkflowFromForm(): void {
    const status = this.workflowState().currentStatus as RdigStatus;
    this.workflow.status.set(status);
    this.workflowState.update((ws) => ({ ...ws, nextRoles: getNextRoles(status) }));

    const rv = parseInt(this.rdigForm.get('metadata.reviewers_version')?.value, 10);
    if (!isNaN(rv)) this.workflow.reviewersVersion.set(rv);
    const ver = parseInt(this.rdigForm.get('metadata.applicationVersion')?.value, 10);
    if (!isNaN(ver)) this.workflow.version.set(ver);
  }

  private canCurrentUserActOnCurrentState(): boolean {
    return this.canCurrentUserActOnApplication({
      workflow: this.workflowState(),
      metadata: this.rdigForm.get('metadata')?.getRawValue(),
      teamDetails: this.rdigForm.get('teamDetails')?.getRawValue(),
    });
  }

  private canCurrentUserActOnApplication(app: any): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;

    const wf = app.workflow ?? {};
    const nextRoles: string[] = Array.isArray(wf.nextRoles) ? wf.nextRoles : [];
    const nextUsers = Array.isArray(wf.nextUsers) ? wf.nextUsers.map(String) : [];
    const ownerById =
      app.metadata?.applicantUserId && String(app.metadata.applicantUserId) === String(user.id);
    const ownerByName = app.teamDetails?.leaderName && app.teamDetails.leaderName === user.name;
    const isOwner = !!(ownerById || ownerByName);

    if ((wf.currentStatus === 'draft' || app.isDraft === true) && isOwner) return true;

    if (nextUsers.includes(String(user.id))) return true;

    if (nextRoles.includes('Applicant')) {
      return isOwner;
    }

    for (const role of user.groups) {
      if (!nextRoles.includes(role)) continue;
      if (role === 'Reviewer') continue;

      if (role === 'HOS') {
        const appDepartment = app.teamDetails?.department ?? '';
        return !appDepartment || !user.department || appDepartment === user.department;
      }

      return true;
    }

    return false;
  }

  /**
   * Load an existing application from the JSON server by ID, patch the entire
   * reactive form, and restore the workflow state signal.
   */
  loadApplication(id: string): void {
    const requestId = Number(id);
    if (!Number.isFinite(requestId)) {
      alert(`Could not load application ${id}.`);
      return;
    }
    this.isLoadingApplication.set(true);
    forkJoin({
      form: this.rdigApi.getForm(requestId),
      request: this.requestsApi.getRequest(requestId),
      comments: this.requestsApi.getComments(requestId),
    })
      .pipe(finalize(() => this.isLoadingApplication.set(false)))
      .subscribe({
        next: (res) => {
          this.patchFormFromBackend(res.form.data);
          this.patchSavedFeedback(res.comments.data, res.request.data);
        },
        error: (err) => {
          console.error('Failed to load application:', err);
          alert(`Could not load application ${id}.`);
        },
      });
  }

  private patchSavedFeedback(comments: RequestCommentDto[], request: RequestSummaryDto): void {
    // Include overall/action feedback as well as section feedback; never expose
    // reviewer identities through the resubmission feedback heading.
    this.savedFeedback.set(comments.filter((comment) => comment.comment_text?.trim()).map((comment) => {
      const code = (comment.actor_type_code ?? '').toLowerCase();
      const reviewer = request.rdig_reviewers?.find((item) =>
        !!item.username && item.username.toLowerCase() === comment.staff_username?.toLowerCase());
      const number = code.match(/reviewer_?([12])/)?.[1] ?? reviewer?.reviewer_no;
      const labels: Record<string, string> = {
        hos_hod: 'HOS / HOD', hos: 'HOS', rmc: 'RMC', rdig_chair: 'RDIG Chair',
        vc: 'Vice Chancellor', cfo: 'CFO', applicant: 'Applicant',
      };
      return {
        id: comment.id,
        actor: number ? `Reviewer ${number}` : code.includes('reviewer') ? 'Reviewer' : labels[code] ?? 'Workflow Comment',
        section: comment.comment_type === 'workflow_action'
          ? 'Overall Comment' : comment.section_name ?? 'Section Comment',
        text: comment.comment_text,
      };
    }));
    const fields: Record<string, string> = {
      team_members_group: 'reviewTeam.{actor}Comment',
      project_classification: 'reviewProject.{actor}ClassificationComment',
      project_title: 'reviewProject.{actor}TitleComment',
      project_research_area: 'reviewProject.{actor}ResearchAreaComment',
      project_research_alignment: 'reviewProject.{actor}EsgComment',
      project_esg: 'reviewProject.{actor}EsgComment',
      project_sdg: 'reviewProject.{actor}SdgComment',
      project_summary: 'reviewProject.{actor}SummaryComment',
      project_keywords: 'reviewProject.{actor}KeywordsComment',
      project_intro: 'reviewProject.{actor}IntroComment',
      project_problem: 'reviewProject.{actor}ProblemComment',
      project_aim: 'reviewProject.{actor}AimComment',
      project_questions: 'reviewProject.{actor}QuestionsComment',
      project_hypothesis: 'reviewProject.{actor}HypothesisComment',
      project_lit_review: 'reviewProject.{actor}LitReviewComment',
      project_methodology: 'reviewProject.{actor}MethodComment',
      project_references: 'reviewProject.{actor}ReferencesComment',
      project_benefits: 'reviewProject.{actor}StakeholdersComment',
      project_vision_activities: 'reviewProject.{actor}VisionComment',
      project_vision: 'reviewProject.{actor}VisionComment',
      project_activities: 'reviewProject.{actor}ActivitiesComment',
      output_overall: 'reviewOutput.{actor}Comment',
      budget_breakdown: 'reviewBudget.{actor}StudentComment',
      budget_summary: 'reviewBudget.{actor}Comment',
    };
    const values = new Map<string, string[]>();
    const inlineIds = new Set<number>();
    for (const comment of comments) {
      if (comment.comment_type !== 'section_review' || !comment.comment_text?.trim()) continue;
      const code = (comment.actor_type_code ?? '').toLowerCase();
      const reviewer = request.rdig_reviewers?.find((item) =>
        item.username?.toLowerCase() === comment.staff_username?.toLowerCase());
      const number = code.match(/reviewer_?([12])/)?.[1] ?? reviewer?.reviewer_no;
      let path = number ? fields[comment.section_code ?? '']?.replace('{actor}', `reviewer${number}`) : undefined;
      if (!number && (code === 'hos_hod' || code === 'rmc')) {
        const actor = code === 'rmc' ? 'rmc' : 'hos';
        const groups: Record<string, string> = {
          group_team_members: `reviewTeam.${actor}Comment`,
          group_project_details: actor === 'hos' ? 'reviewProject.hosPageComment' : 'reviewProject.rmcAimComment',
          group_output_budget: `reviewBudget.${actor}Comment`,
        };
        path = groups[comment.section_code ?? ''];
      }
      if (!path || !this.rdigForm.get(path)) continue;
      inlineIds.add(comment.id);
      values.set(path, [...(values.get(path) ?? []), comment.comment_text]);
    }
    // Feedback is read-only and never hydrates reviewer identity or score controls.
    for (const [path, texts] of values) this.rdigForm.get(path)?.setValue(texts.join('\n\n'), { emitEvent: false });
    this.inlineFeedbackIds.set(inlineIds);
  }

  private patchFormFromBackend(data: RdigFormData): void {
    const requestRow = data.request;
    const rdig = data.rdig ?? {};
    const requestId = requestRow.id ?? rdig.request_id;
    this.loadedAppId.set(requestId != null ? String(requestId) : null);
    this.rdigForm.get('metadata.rdigRequestId')?.setValue(requestId ?? null, { emitEvent: false });

    this.rdigForm.patchValue({
      projectDetails: {
        applicationType: rdig.application_type ?? null,
        category: rdig.project_category ?? null,
        track: rdig.track ?? null,
        duration: this.toRadioValue(rdig.project_duration_months),
        declarations: {
          ethics: !!rdig.declaration_no_ongoing_rdig_self,
          conflict: !!rdig.declaration_no_ongoing_rdig_coresearchers,
        },
        title: rdig.project_title ?? '',
        researchArea: rdig.research_area ?? '',
        domain: this.toDropdownId(rdig.research_domain_id),
        subDomain: this.toDropdownId(rdig.sub_research_domain_id),
        executiveSummary: rdig.executive_summary ?? '',
        keywords: rdig.keywords ?? '',
        introduction: rdig.introduction ?? '',
        problemStatement: rdig.problem_statement ?? '',
        researchAim: rdig.research_aim_objectives ?? '',
        researchQuestions: rdig.research_questions ?? '',
        hypothesis: rdig.hypothesis_propositions ?? '',
        literatureReview: rdig.literature_review ?? '',
        methodology: rdig.research_methodology ?? '',
        references: rdig.references_text ?? '',
        benefits: {
          apu: rdig.benefit_to_apu ?? '',
          students: rdig.benefit_to_students ?? '',
          stakeholders: rdig.benefit_to_stakeholders ?? '',
        },
        visionMission: rdig.vision_mission_alignment ?? '',
        esgs: (data.esg_selections ?? []).map((item) => String(item.esg_id)),
        sdgs: (data.sdg_selections ?? []).map((item) => String(item.sdg_id)),
      },
      outputs: {
        journal: {
          checked: !!rdig.indexed_journal_selected,
          quantity: rdig.indexed_journal_quantity ?? 0,
        },
        conceptualDesign: !!rdig.conceptual_design_selected,
        knowledgeTransfer: {
          checked: !!rdig.knowledge_transfer_programme_selected,
          community: rdig.knowledge_transfer_community ?? '',
        },
        externalGrant: {
          checked: !!rdig.application_external_grant_selected,
          scheme: rdig.external_grant_scheme ?? '',
        },
        others: {
          checked: !!rdig.other_output_selected,
          details: rdig.other_output_specification ?? '',
        },
      },
      finalDeclaration: {
        noveltyJustification: rdig.novelty_justification ?? '',
        agreed: !!rdig.declaration_agreement_accepted,
      },
      budget: { totalRequest: Number(rdig.total_budget_request ?? 0) },
    });

    this.rdigForm.get('teamDetails')?.patchValue({
      leaderName: rdig.project_leader_name ?? requestRow.applicant_name ?? '',
      leaderEmail: rdig.project_leader_email ?? requestRow.applicant_email ?? '',
      department: rdig.project_leader_department ?? requestRow.applicant_department ?? '',
      researchCluster: this.toDropdownId(rdig.research_cluster_id),
      leaderRoles: rdig.project_leader_role_in_project ?? '',
    });

    this.rebuildArray(
      this.rdigForm.get('teamDetails.internalResearchers') as FormArray,
      (data.apu_co_researchers ?? []).map((item) => ({
        backendId: item.id,
        staffId: item.staff_id,
        staffName: item.staff_name,
        department: item.staff_department,
        expertise: item.area_of_expertise,
        roles: item.role_in_project,
      })),
    );
    this.captureLoadedBackendIds(
      'internalResearchers',
      this.rdigForm.get('teamDetails.internalResearchers') as FormArray,
    );

    this.rebuildArray(
      this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
      (data.collaborators ?? []).map((item) => ({
        backendId: item.id,
        title: item.title,
        fullName: item.full_name,
        email: item.email,
        institution: item.institution_company_name,
        orgType: item.organisation_type,
        position: item.position,
        department: item.department,
        country: item.country_code,
        funding: item.matched_funding_amount,
        roles: item.role_in_project,
        supportLetterAttachmentId: item.support_letter_attachment_id,
        supportLetter: (data.attachments ?? []).find(
          (attachment) => attachment.id === item.support_letter_attachment_id,
        ) ?? null,
      })),
    );
    this.captureLoadedBackendIds(
      'externalResearchers',
      this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
    );

    this.rebuildArray(
      this.rdigForm.get('activities') as FormArray,
      (data.research_activities ?? []).map((item) => ({
        backendId: item.id,
        name: item.activity_name,
        startMonth: item.start_month,
        endMonth: item.end_month,
        duration: item.duration_months,
      })),
    );
    this.captureLoadedBackendIds('activities', this.rdigForm.get('activities') as FormArray);

    const sectionById = new Map<number, string>();
    for (const section of data.budget_sections ?? []) {
      const sectionId = section.id ?? section.budget_section_id;
      if (sectionId != null && section.section_code) {
        sectionById.set(sectionId, section.section_code);
      }
    }
    const itemsByKey: Record<string, Array<Record<string, unknown>>> = {
      studentAllowances: [],
      travelAccommodation: [],
      materialsSupplies: [],
      specialServices: [],
    };
    const keyByCode: Record<string, string> = {
      V11000: 'studentAllowances',
      V21000: 'travelAccommodation',
      V27000: 'materialsSupplies',
      V29000: 'specialServices',
    };
    for (const item of data.budget_items ?? []) {
      const key = keyByCode[String(sectionById.get(item.rdig_budget_section_id))];
      if (key) {
        itemsByKey[key].push({
          backendId: item.id,
          description: item.description,
          amount: item.amount_rm,
          remarks: item.remarks,
          quotationAttachmentId: item.quotation_attachment_id ?? null,
        });
      }
    }
    for (const [key, rows] of Object.entries(itemsByKey)) {
      this.rebuildArray(this.rdigForm.get(`budget.${key}`) as FormArray, rows);
      this.captureLoadedBackendIds(key, this.rdigForm.get(`budget.${key}`) as FormArray);
    }

    const status = (requestRow.status_code ?? 'draft') as RdigStatus;
    this.workflowState.set({
      currentStatus: status,
      nextRoles: getNextRoles(status),
      nextUsers: [],
      history: [],
    });
    const adminReadOnly = this.isSystemAdminReadOnlyRequest(requestRow);
    this.isAdminReadOnlyDraft.set(adminReadOnly);
    this.workflow.currentUserCanAct.set(!adminReadOnly && (!!requestRow.can_act || status === 'draft'));
    this.syncWorkflowFromForm();
  }

  /**
   * Patch every part of the form from a saved application record, including
   * all FormArrays. Sync ABAC signals after patching.
   */
  private patchFormFromSavedData(data: any): void {
    // Track the record ID for all subsequent PUT requests
    this.loadedAppId.set(data.id ?? null);

    // ── Simple groups (patchValue handles nested objects) ────────
    this.rdigForm.patchValue({
      metadata: data.metadata ?? {},
      projectDetails: this.normalizeSavedProjectDetails(data.projectDetails),
      outputs: data.outputs ?? {},
      finalDeclaration: data.finalDeclaration ?? {},
      reviewTeam: data.reviewTeam ?? {},
      reviewProject: data.reviewProject ?? {},
      reviewOutput: data.reviewOutput ?? {},
      reviewBudget: data.reviewBudget ?? {},
      reviewDeclaration: data.reviewDeclaration ?? {},
      approvals: data.approvals ?? {},
    });

    // teamDetails scalar fields (exclude the arrays)
    this.rdigForm.get('teamDetails')?.patchValue({
      leaderName: data.teamDetails?.leaderName ?? '',
      leaderEmail: data.teamDetails?.leaderEmail ?? '',
      department: data.teamDetails?.department ?? '',
      researchCluster: this.toDropdownId(data.teamDetails?.researchCluster),
      leaderRoles: data.teamDetails?.leaderRoles ?? '',
    });

    // budget scalar fields (exclude the arrays)
    this.rdigForm.get('budget')?.patchValue({
      totalRequest: data.budget?.totalRequest ?? 0,
    });

    // ── FormArrays ───────────────────────────────────────────────
    this.rebuildArray(
      this.rdigForm.get('teamDetails.internalResearchers') as FormArray,
      data.teamDetails?.internalResearchers ?? [],
    );
    this.captureLoadedBackendIds(
      'internalResearchers',
      this.rdigForm.get('teamDetails.internalResearchers') as FormArray,
    );
    this.rebuildArray(
      this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
      data.teamDetails?.externalResearchers ?? [],
    );
    this.captureLoadedBackendIds(
      'externalResearchers',
      this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
    );
    this.rebuildArray(this.rdigForm.get('activities') as FormArray, data.activities ?? []);
    this.rdigForm.get('activities')?.updateValueAndValidity({ emitEvent: false });
    this.captureLoadedBackendIds('activities', this.rdigForm.get('activities') as FormArray);
    this.rebuildArray(
      this.rdigForm.get('budget.studentAllowances') as FormArray,
      data.budget?.studentAllowances ?? [],
    );
    this.captureLoadedBackendIds(
      'studentAllowances',
      this.rdigForm.get('budget.studentAllowances') as FormArray,
    );
    this.rebuildArray(
      this.rdigForm.get('budget.travelAccommodation') as FormArray,
      data.budget?.travelAccommodation ?? [],
    );
    this.captureLoadedBackendIds(
      'travelAccommodation',
      this.rdigForm.get('budget.travelAccommodation') as FormArray,
    );
    this.rebuildArray(
      this.rdigForm.get('budget.materialsSupplies') as FormArray,
      data.budget?.materialsSupplies ?? [],
    );
    this.captureLoadedBackendIds(
      'materialsSupplies',
      this.rdigForm.get('budget.materialsSupplies') as FormArray,
    );
    this.rebuildArray(
      this.rdigForm.get('budget.specialServices') as FormArray,
      data.budget?.specialServices ?? [],
    );
    this.captureLoadedBackendIds(
      'specialServices',
      this.rdigForm.get('budget.specialServices') as FormArray,
    );
    this.rdigForm.get('budget')?.updateValueAndValidity({ emitEvent: false });

    // ── Restore workflow state ───────────────────────────────────
    if (data.workflow) {
      this.workflowState.set(data.workflow);
    }
    this.workflow.currentUserCanAct.set(this.canCurrentUserActOnApplication(data));

    // ── Sync ABAC signals ────────────────────────────────────────
    this.syncWorkflowFromForm();

    // Re-sync reviewer assignment signals after form patch
    const r1 = this.rdigForm.get('approvals.reviewer1Assignment')?.value ?? '';
    const r2 = this.rdigForm.get('approvals.reviewer2Assignment')?.value ?? '';
    this.workflow.reviewer1UserId.set(r1);
    this.workflow.reviewer2UserId.set(r2);
  }

  private normalizeSavedProjectDetails(projectDetails: any): any {
    if (!projectDetails) return {};
    return {
      ...projectDetails,
      duration: this.toRadioValue(projectDetails.duration),
      domain: this.toDropdownId(projectDetails.domain),
      subDomain: this.toDropdownId(projectDetails.subDomain),
      esgs: this.toDropdownIds(projectDetails.esgs),
      sdgs: this.toDropdownIds(projectDetails.sdgs),
    };
  }

  private toDropdownId(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  }

  private toDropdownIds(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return values
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));
  }

  private toRadioValue(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  }

  private toDecimalNumber(value: unknown): number {
    return this.parseDecimalAmount(value) ?? 0;
  }

  private toDecimalPayload(value: unknown): string | null {
    const amount = this.parseDecimalAmount(value);
    return amount === null ? null : amount.toFixed(2);
  }

  private parseDecimalAmount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).replace(/,/g, '').trim();
    if (!normalized) return null;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  private calculateBudgetTotalForPayload(budget: any): number {
    const categoryKeys = [
      'studentAllowances',
      'travelAccommodation',
      'materialsSupplies',
      'specialServices',
    ];

    return categoryKeys.reduce((total, key) => {
      const rows = Array.isArray(budget?.[key]) ? budget[key] : [];
      return total + rows.reduce((sum: number, row: any) => sum + this.toDecimalNumber(row?.amount), 0);
    }, 0);
  }

  /** Clear a FormArray and rebuild it from a plain-object array. */
  private rebuildArray(arr: FormArray, items: any[]): void {
    arr.clear({ emitEvent: false });
    items.forEach((item) => arr.push(this.fb.group(item), { emitEvent: false }));
  }

  // ── Real RDIG backend integration ───────────────────────────────
  // Applicant-facing lifecycle (create/save/load/submit) writes through to the
  // real backend. The HOS/RMC/Reviewer/RDIG Chair/VC/CFO review workflow keeps
  // running against the local json-server store for now — that part of the
  // backend's generic workflow engine is a separate, later integration pass.

  /** Backend child-resource ids present at load time, per FormArray, used to diff on save. */
  private loadedChildBackendIds: Record<string, Set<number>> = {
    internalResearchers: new Set<number>(),
    externalResearchers: new Set<number>(),
    activities: new Set<number>(),
    studentAllowances: new Set<number>(),
    travelAccommodation: new Set<number>(),
    materialsSupplies: new Set<number>(),
    specialServices: new Set<number>(),
  };

  /** Backend budget_section_id for each fixed section code (V11000/V21000/V27000/V29000), resolved lazily. */
  private budgetSectionIdByCode: Record<string, number> | null = null;

  /** Records which rows already have a backend id, so the next save knows what to delete. */
  private captureLoadedBackendIds(key: string, array: FormArray): void {
    const ids = new Set<number>();
    for (let i = 0; i < array.length; i++) {
      const backendId = array.at(i).get('backendId')?.value;
      if (backendId) ids.add(Number(backendId));
    }
    this.loadedChildBackendIds[key] = ids;
  }

  /** Maps the Angular form's camelCase fields to the backend's snake_case RdigRequest schema. */
  private buildRdigRequestDto(): Partial<RdigRequestDto> {
    const raw = this.rdigForm.getRawValue();
    const pd = raw.projectDetails ?? {};
    const team = raw.teamDetails ?? {};
    const outputs = raw.outputs ?? {};
    const budget = raw.budget ?? {};
    const finalDecl = raw.finalDeclaration ?? {};
    const totalBudgetRequest = this.calculateBudgetTotalForPayload(budget);

    return {
      application_type: pd.applicationType || null,
      project_category: pd.category || null,
      track: pd.track || null,
      project_duration_months: pd.duration ? Number(pd.duration) || null : null,
      project_title: pd.title || null,
      research_area: pd.researchArea || null,
      research_cluster_id: team.researchCluster ? Number(team.researchCluster) : null,
      research_domain_id: pd.domain ? Number(pd.domain) : null,
      sub_research_domain_id: pd.subDomain ? Number(pd.subDomain) : null,
      executive_summary: pd.executiveSummary || null,
      keywords: pd.keywords || null,
      introduction: pd.introduction || null,
      problem_statement: pd.problemStatement || null,
      research_aim_objectives: pd.researchAim || null,
      research_questions: pd.researchQuestions || null,
      hypothesis_propositions: pd.hypothesis || null,
      literature_review: pd.literatureReview || null,
      research_methodology: pd.methodology || null,
      references_text: pd.references || null,
      benefit_to_apu: pd.benefits?.apu || null,
      benefit_to_students: pd.benefits?.students || null,
      benefit_to_stakeholders: pd.benefits?.stakeholders || null,
      vision_mission_alignment: pd.visionMission || null,
      project_leader_name: team.leaderName || null,
      project_leader_email: team.leaderEmail || null,
      project_leader_department: team.department || null,
      project_leader_role_in_project: team.leaderRoles || null,
      declaration_no_ongoing_rdig_self: !!pd.declarations?.ethics,
      declaration_no_ongoing_rdig_coresearchers: !!pd.declarations?.conflict,
      declaration_agreement_accepted: !!finalDecl.agreed,
      novelty_justification: finalDecl.noveltyJustification || null,
      budget_remarks: budget.otherRemarks || null,
      total_budget_request: this.toDecimalPayload(totalBudgetRequest),
      indexed_journal_selected: !!outputs.journal?.checked,
      indexed_journal_quantity: outputs.journal?.quantity ?? null,
      conceptual_design_selected: !!outputs.conceptualDesign,
      knowledge_transfer_programme_selected: !!outputs.knowledgeTransfer?.checked,
      knowledge_transfer_community: outputs.knowledgeTransfer?.community || null,
      application_external_grant_selected: !!outputs.externalGrant?.checked,
      external_grant_scheme: outputs.externalGrant?.scheme || null,
      other_output_selected: !!outputs.others?.checked,
      other_output_specification: outputs.others?.details || null,
    };
  }

  /** Generic create/update/delete sync for one FormArray against its backend child-resource endpoints. */
  private syncFormArray<T>(
    key: string,
    array: FormArray,
    toPayload: (raw: any) => T,
    create: (payload: T) => Observable<{ data: { id?: number } }>,
    update: (backendId: number, payload: T) => Observable<unknown>,
    remove: (backendId: number) => Observable<unknown>,
  ): Observable<unknown> {
    const currentIds = new Set<number>();
    const ops: Observable<unknown>[] = [];

    for (let i = 0; i < array.length; i++) {
      const group = array.at(i) as FormGroup;
      const raw = group.getRawValue();
      const backendId = group.get('backendId')?.value as number | null | undefined;
      const payload = toPayload(raw);

      if (backendId) {
        currentIds.add(Number(backendId));
        ops.push(update(Number(backendId), payload));
      } else {
        ops.push(
          create(payload).pipe(
            tap((res) => {
              const newId = res?.data?.id;
              if (newId) {
                group.setControl('backendId', new FormControl(newId), { emitEvent: false });
                currentIds.add(newId);
              }
            }),
          ),
        );
      }
    }

    const previously = this.loadedChildBackendIds[key] ?? new Set<number>();
    for (const oldId of previously) {
      if (!currentIds.has(oldId)) {
        ops.push(remove(oldId));
      }
    }

    const result$: Observable<unknown> = ops.length ? forkJoin(ops) : of(null);
    return result$.pipe(
      tap(() => {
        this.loadedChildBackendIds[key] = currentIds;
      }),
    );
  }

  /** Uploads the support-letter file for any external researcher row that has a pending File object. */
  private uploadPendingSupportLetters(id: number): Observable<unknown> {
    const array = this.rdigForm.get('teamDetails.externalResearchers') as FormArray;
    const uploads: Observable<unknown>[] = [];

    for (let i = 0; i < array.length; i++) {
      const group = array.at(i) as FormGroup;
      const file = group.get('supportLetter')?.value;
      if (file instanceof File) {
        uploads.push(
          this.rdigApi.uploadAttachment(id, file, 'rdig_collaborator_support_letter').pipe(
            tap((res) => {
              const attachmentId = res?.data?.id ?? null;
              group.setControl(
                'supportLetterAttachmentId',
                new FormControl(attachmentId),
                { emitEvent: false },
              );
              // Keep persisted metadata for display without uploading the File again.
              group.get('supportLetter')?.setValue(res.data, { emitEvent: false });
            }),
          ),
        );
      }
    }

    return uploads.length ? forkJoin(uploads) : of(null);
  }

  /** Uploads newly selected quotations/supporting documents after budget rows have backend IDs. */
  private uploadPendingBudgetAttachments(id: number): Observable<unknown> {
    const budget = this.rdigForm.get('budget') as FormGroup;
    const attachmentCategories = ['travelAccommodation', 'materialsSupplies', 'specialServices'];
    const uploads: Observable<unknown>[] = [];

    for (const category of attachmentCategories) {
      const array = budget.get(category) as FormArray;
      for (let index = 0; index < array.length; index++) {
        const group = array.at(index) as FormGroup;
        const file = group.get('attachmentFile')?.value;
        const backendId = Number(group.get('backendId')?.value);
        if (!(file instanceof File) || !backendId) continue;

        uploads.push(
          this.rdigApi.uploadAttachment(id, file, 'rdig_budget_item', backendId).pipe(
            switchMap((res) => {
              const attachmentId = res?.data?.id;
              if (!attachmentId) throw new Error('Backend did not return the uploaded budget attachment id.');
              return this.rdigApi.updateBudgetItem(id, backendId, {
                quotation_attachment_id: attachmentId,
              }).pipe(
                tap(() => {
                  group.get('quotationAttachmentId')?.setValue(attachmentId, { emitEvent: false });
                  group.get('attachmentFile')?.setValue(null, { emitEvent: false });
                }),
              );
            }),
          ),
        );
      }
    }

    return uploads.length ? forkJoin(uploads) : of(null);
  }

  /** Resolves the four fixed budget sections (V11000/V21000/V27000/V29000) to their backend ids. */
  private resolveBudgetSectionIds(id: number): Observable<Record<string, number>> {
    if (this.budgetSectionIdByCode) return of(this.budgetSectionIdByCode);
    return this.rdigApi.listBudgetSections(id).pipe(
      map((res) => {
        const sectionMap: Record<string, number> = {};
        for (const section of res.data?.items ?? []) {
          const sectionId = section.id ?? section.budget_section_id;
          if (section.section_code && sectionId) sectionMap[section.section_code] = sectionId;
        }
        this.budgetSectionIdByCode = sectionMap;
        return sectionMap;
      }),
    );
  }

  /** Bulk-replaces the ESG/SDG selections (the only child resources with a bulk-replace endpoint). */
  private syncEsgSdgSelections(id: number): Observable<unknown> {
    const esgs: string[] = this.rdigForm.get('projectDetails.esgs')?.value ?? [];
    const sdgs: string[] = this.rdigForm.get('projectDetails.sdgs')?.value ?? [];
    const esgIds = esgs.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    const sdgIds = sdgs.map((v) => Number(v)).filter((n) => Number.isFinite(n));

    return forkJoin([
      this.rdigApi.replaceEsgSelections(id, esgIds),
      this.rdigApi.replaceSdgSelections(id, sdgIds),
    ]);
  }

  /** Persists every applicant-owned child array against its backend child-resource endpoints. */
  private syncChildArrays(id: number): Observable<unknown> {
    const budgetSectionCodeByFormKey: Record<string, string> = {
      studentAllowances: 'V11000',
      travelAccommodation: 'V21000',
      materialsSupplies: 'V27000',
      specialServices: 'V29000',
    };

    return this.uploadPendingSupportLetters(id).pipe(
      switchMap(() => this.resolveBudgetSectionIds(id)),
      switchMap((sectionIds) =>
        forkJoin([
          this.syncFormArray(
            'internalResearchers',
            this.rdigForm.get('teamDetails.internalResearchers') as FormArray,
            (raw) => ({
              staff_id: raw.staffId || null,
              staff_name: raw.staffName || null,
              staff_department: raw.department || null,
              area_of_expertise: raw.expertise || null,
              role_in_project: raw.roles || null,
            }),
            (payload) => this.rdigApi.createCoResearcher(id, payload),
            (backendId, payload) => this.rdigApi.updateCoResearcher(id, backendId, payload),
            (backendId) => this.rdigApi.deleteCoResearcher(id, backendId),
          ),
          this.syncFormArray(
            'externalResearchers',
            this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
            (raw) => ({
              title: raw.title || null,
              full_name: raw.fullName || null,
              email: raw.email || null,
              institution_company_name: raw.institution || null,
              organisation_type: raw.orgType || null,
              position: raw.position || null,
              department: raw.department || null,
              country_code: raw.country || null,
              matched_funding_amount: raw.funding != null ? String(raw.funding) : null,
              role_in_project: raw.roles || null,
              support_letter_attachment_id: raw.supportLetterAttachmentId ?? null,
            }),
            (payload) => this.rdigApi.createCollaborator(id, payload),
            (backendId, payload) => this.rdigApi.updateCollaborator(id, backendId, payload),
            (backendId) => this.rdigApi.deleteCollaborator(id, backendId),
          ),
          this.syncFormArray(
            'activities',
            this.rdigForm.get('activities') as FormArray,
            (raw) => ({
              activity_name: raw.name || null,
              start_month: raw.startMonth ?? null,
              end_month: raw.endMonth ?? null,
              duration_months: raw.duration ?? null,
            }),
            (payload) => this.rdigApi.createResearchActivity(id, payload),
            (backendId, payload) => this.rdigApi.updateResearchActivity(id, backendId, payload),
            (backendId) => this.rdigApi.deleteResearchActivity(id, backendId),
          ),
          ...Object.entries(budgetSectionCodeByFormKey).map(([formKey, code]) =>
            this.syncFormArray(
              formKey,
              this.rdigForm.get(`budget.${formKey}`) as FormArray,
              (raw) => ({
                rdig_budget_section_id: sectionIds[code],
                description: raw.description || null,
                amount_rm: this.toDecimalPayload(raw.amount),
                remarks: raw.remarks || null,
                quotation_attachment_id: raw.quotationAttachmentId ?? null,
              }),
              (payload) => this.rdigApi.createBudgetItem(id, payload),
              (backendId, payload) => this.rdigApi.updateBudgetItem(id, backendId, payload),
              (backendId) => this.rdigApi.deleteBudgetItem(id, backendId),
            ),
          ),
          this.syncEsgSdgSelections(id),
        ]).pipe(switchMap(() => this.uploadPendingBudgetAttachments(id))),
      ),
    );
  }

  /** Creates/updates the RDIG draft on the real backend, then syncs every child array. Resolves to the backend id. */
  private syncToRealBackend(): Observable<number> {
    const dto = this.buildRdigRequestDto();
    const existingIdRaw = this.rdigForm.get('metadata.rdigRequestId')?.value;
    const existingId = existingIdRaw ? Number(existingIdRaw) : null;

    const ensureDraft$: Observable<number> = existingId
      ? this.rdigApi.updateDraft(existingId, dto).pipe(map(() => existingId))
      : this.rdigApi.createDraft(dto).pipe(
          map((res) => {
            const newId = res.data.request?.id ?? res.data.request?.request_id ?? res.data.rdig?.request_id;
            if (!newId) throw new Error('Backend did not return a new RDIG request id.');
            this.rdigForm.get('metadata.rdigRequestId')?.setValue(newId, { emitEvent: false });
            this.budgetSectionIdByCode = this.toBudgetSectionIdMap(res.data.budget_sections);
            return newId;
          }),
        );

    return ensureDraft$.pipe(switchMap((id) => this.syncChildArrays(id).pipe(map(() => id))));
  }

  private toBudgetSectionIdMap(sections: RdigFormData['budget_sections']): Record<string, number> | null {
    const sectionMap: Record<string, number> = {};
    for (const section of sections ?? []) {
      const sectionId = section.id ?? section.budget_section_id;
      if (section.section_code && sectionId) sectionMap[section.section_code] = sectionId;
    }
    return Object.keys(sectionMap).length ? sectionMap : null;
  }

  // ── Wizard navigation ──────────────────────────────────────────
  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      if (step !== this.currentStep()) {
        this.checkedSteps.add(this.currentStep());
      }
      this.currentStep.set(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onNext(): void {
    if (this.currentStep() < this.totalSteps) {
      this.checkedSteps.add(this.currentStep());
      this.currentStep.update((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPrev(): void {
    if (this.currentStep() > 1) {
      this.checkedSteps.add(this.currentStep());
      this.currentStep.update((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Feedback signal shown after a successful draft save (clears automatically). */
  draftSaveSuccess = signal(false);
  private draftSaveTimer?: ReturnType<typeof setTimeout>;

  onSaveDraft(): void {
    if (this.isViewOnly()) {
      this.submissionErrorMessage.set(
        'This application is open in history view only and cannot be edited.',
      );
      this.submissionState.set('ERROR');
      return;
    }

    this.isSaving.set(true);

    this.syncToRealBackend().subscribe({
      next: (id) => {
        this.loadedAppId.set(String(id));
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { request_id: id },
          replaceUrl: true,
        });
        this.isSaving.set(false);
        clearTimeout(this.draftSaveTimer);
        this.draftSaveSuccess.set(true);
        this.toastSvc.success('RDIG draft saved.');
        this.draftSaveTimer = setTimeout(() => this.draftSaveSuccess.set(false), 3000);
      },
      error: (err) => {
        console.error('Save draft failed:', err);
        this.isSaving.set(false);
        this.submissionErrorMessage.set(err?.error?.message || 'Failed to save draft.');
        this.submissionState.set('ERROR');
      },
    });
    return;

    this.syncToRealBackend()
      .pipe(
        catchError((err) => {
          console.error('RDIG backend sync failed — draft will still save locally:', err);
          return of(null);
        }),
      )
      .subscribe(() => this.saveDraftToLocalStore());
  }

  /** Existing json-server-backed draft save — drives the dashboard list views and the local workflow simulation. */
  private saveDraftToLocalStore(): void {
    const currentStatus = this.workflowState().currentStatus;

    // Determine whether this is a brand-new application (not yet formally submitted
    // to any reviewer) or an in-progress application being partially saved.
    const isNewApp = currentStatus === 'draft';

    // For new (unsubmitted) apps: hide from everyone's inbox by clearing nextRoles.
    // For in-process apps (e.g. pending_applicant_resubmission_*): keep existing
    // nextRoles so the application stays visible in the applicant's inbox.
    const workflowForSave = isNewApp
      ? { ...this.workflowState(), nextRoles: [], nextUsers: [] }
      : { ...this.workflowState() };

    // Stamp applicantUserId so the "my applications" server query can find it later.
    const rawMeta = this.rdigForm.get('metadata')?.getRawValue() ?? {};
    const applicantUserId = rawMeta['applicantUserId'] || this.auth.currentUser()?.id || null;

    const formData: Record<string, unknown> = {
      ...this.rdigForm.getRawValue(),
      formType: 'RDIG',
      workflow: workflowForSave,
      isDraft: isNewApp, // only unsubmitted apps get the draft flag
      savedAt: new Date().toISOString(),
      metadata: { ...rawMeta, applicantUserId },
    };

    const appId = this.loadedAppId();
    const isEdit = !!appId;
    const url = isEdit
      ? `http://localhost:3000/applications/${appId}`
      : 'http://localhost:3000/applications';

    const request$ = isEdit ? this.http.put(url, formData) : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        if (!isEdit && response?.id) {
          this.loadedAppId.set(response.id);
          // Also update the URL so a refresh reopens the same draft
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { request_id: response.id },
            replaceUrl: true,
          });
        }
        this.isSaving.set(false);
        // Show an inline success indicator instead of a blocking alert
        clearTimeout(this.draftSaveTimer);
        this.draftSaveSuccess.set(true);
        this.draftSaveTimer = setTimeout(() => this.draftSaveSuccess.set(false), 3000);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Save draft failed:', err);
        this.isSaving.set(false);
        alert('Failed to save draft. Remember to run `npm run db` in a new terminal!');
      },
    });
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    this.showValidationSummary.set(false);
    if (this.isViewOnly()) {
      this.submissionErrorMessage.set(
        'This application is open in history view only and cannot be submitted.',
      );
      this.submissionState.set('ERROR');
      return;
    }

    // ── Batch constraint check ───────────────────────────────────────────────
    const batch = this.activeBatch();
    const bypassBatchValidation = this.batchValidationDisabled();
    if (!this.hasActiveApplicantWindow() && !bypassBatchValidation) {
      this.showClosedWindowModal.set(true);
      return;
    }
    if (this.hasActiveApplicantWindow() && batch && !bypassBatchValidation) {
      const now = new Date();
      // Applicant users are gated on the "Applicant" stage window — its start is
      // when submissions open for them — not the overall batch window (see
      // submissionOpenIso/submissionCloseIso, sourced only from the Applicant stage).
      const openIso = this.submissionOpenIso();
      const closeIso = this.submissionCloseIso();
      const beforeOpen = !!openIso && now < new Date(openIso);
      const afterClose = !!closeIso && now > new Date(closeIso);
      if (beforeOpen || afterClose) {
        this.showClosedWindowModal.set(true);
        return;
      }
    }
    // ── End batch constraint check ───────────────────────────────────────────

    if (!this.validationDisabled() && this.rdigForm.invalid) {
      this.rdigForm.markAllAsTouched();
      this.submissionErrorMessage.set(
        'Your form has missing or invalid fields. Please review all steps.',
      );
      this.showValidationSummary.set(true);
      this.stepIndicator?.showMissingFieldPrompt();
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      setTimeout(() => {
        const summary = document.querySelector<HTMLElement>('.validation-summary');
        summary?.focus({ preventScroll: true });
      });
      return;
    }
    this.submissionState.set('LOADING');

    // Auto-assign the active batch id unless dev batch validation is disabled.
    this.rdigForm.get('metadata.batch')?.setValue(batch?.id ?? null, { emitEvent: false });

    // Stamp applicant's userId on first submit so downstream reviewers can target notifications back to them.
    if (!this.rdigForm.get('metadata.applicantUserId')?.value) {
      this.rdigForm
        .get('metadata.applicantUserId')
        ?.setValue(this.auth.currentUser()?.id ?? null, { emitEvent: false });
    }

    // ── Workflow transition ──────────────────────────────────────
    // Status is authoritative in workflowState — never duplicated in metadata.
    const currentStatus = this.workflowState().currentStatus as RdigStatus;
    const approvals = this.rdigForm.get('approvals')?.getRawValue() ?? {};
    const transition = this.workflow.determineTransition(currentStatus, approvals);

    if (transition) {
      const nextStatus = transition.nextStatus;

      if (transition.incrementVersion) {
        const v = (this.rdigForm.get('metadata.applicationVersion')?.value ?? 1) + 1;
        this.rdigForm.get('metadata.applicationVersion')?.setValue(v, { emitEvent: false });
        this.workflow.version.set(v);
      }

      if (transition.incrementReviewersVersion) {
        const rv = (this.rdigForm.get('metadata.reviewers_version')?.value ?? 1) + 1;
        this.rdigForm.get('metadata.reviewers_version')?.setValue(rv, { emitEvent: false });
        this.workflow.reviewersVersion.set(rv);
      }

      // Build history entry
      const currentUser = this.auth.currentUser();
      const historyEntry: WorkflowHistoryEntry = {
        action: transition.action,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        performedBy: currentUser?.name ?? 'Unknown',
        role: transition.actorRole,
        timestamp: new Date().toISOString(),
      };

      // Determine next users (reviewer stage uses assigned reviewer IDs)
      const nextUsers: string[] =
        nextStatus === 'pending_reviewers'
          ? [
              this.rdigForm.get('approvals.reviewer1Assignment')?.value,
              this.rdigForm.get('approvals.reviewer2Assignment')?.value,
            ].filter(Boolean)
          : [];

      // Update workflow state signal
      this.workflowState.set({
        currentStatus: nextStatus,
        nextRoles: getNextRoles(nextStatus),
        nextUsers,
        history: [...this.workflowState().history, historyEntry],
      });

      // Sync workflow service so ABAC reacts immediately
      this.workflow.status.set(nextStatus);
    }
    // ── End workflow transition ──────────────────────────────────

    this.submissionState.set('LOADING');

    // ── Real backend submit ───────────────────────────────────────
    // Persist the draft + child arrays, then run the applicant lifecycle
    // transition (draft → submit, returned-for-revision → resubmit). The result
    // of THIS drives the success/error overlay — no dependency on json-server.
    this.syncToRealBackend()
      .pipe(
        switchMap((id) => {
          if (currentStatus === 'draft') return this.rdigApi.submit(id).pipe(map(() => id));
          if (
            currentStatus === 'pending_applicant_resubmission_hos' ||
            currentStatus === 'pending_applicant_resubmission_reviewers'
          ) {
            return this.rdigApi.resubmit(id).pipe(map(() => id));
          }
          return of(id);
        }),
      )
      .subscribe({
        next: (id) => this.onSubmitSuccess(Number(id)),
        error: (err) => this.onSubmitError(err),
      });
  }

  /** Applicant submit/resubmit succeeded on the backend — confirm and redirect. */
  private onSubmitSuccess(savedId: number): void {
    if (savedId != null) {
      this.loadedAppId.set(String(savedId));
      // Clear any stale "action needed" notification for the current user.
      this.notifSvc.resolveAction(savedId, 'RDIG Application');
    }

    this.submissionState.set('SUCCESS');
    setTimeout(() => this.router.navigateByUrl('/submissions/pending?tab=all'), 2200);
  }

  /** Applicant submit/resubmit failed — surface the backend's message. */
  private onSubmitError(err: unknown): void {
    console.error('RDIG submit failed:', err);
    const e = err as { status?: number; error?: { message?: string } };
    const msg =
      e?.error?.message ||
      (e?.status === 0
        ? 'Could not connect to the server. Please try again.'
        : 'Failed to submit your application. Please try again.');
    this.submissionErrorMessage.set(msg);
    this.submissionState.set('ERROR');
  }

  private isSystemAdminReadOnlyRequest(request: { applicant_staff_username?: string | null }): boolean {
    if (!this.auth.inGroup('SystemAdmin')) return false;
    const adminView = this.route.snapshot.queryParamMap.get('admin_view')?.toLowerCase() === 'true';
    const applicantUsername = String(request.applicant_staff_username ?? '').trim().toLowerCase();
    const currentUsername = this.auth.currentUser()?.username?.trim().toLowerCase();
    return adminView || Boolean(applicantUsername && currentUsername && applicantUsername !== currentUsername);
  }

}
