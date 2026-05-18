import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BatchSittingService } from '../settings/batch-sitting.service';
import { BatchSitting } from '../interfaces/batch-sitting.interface';
import { NotificationService } from '../services/notification.service';

// Shared layout components
import { FormMainTitleComponent } from '../shared/components/form-main-title/form-main-title.component';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../shared/components/form-wizard-nav/form-wizard-nav.component';

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
import { AuthService } from '../services/auth.service';
import { WorkflowState, WorkflowHistoryEntry } from '../interfaces/rdig-application.interface';

@Component({
  selector: 'app-rdig-application',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormMainTitleComponent,
    StepIndicatorComponent,
    FormWizardNavComponent,
    TeamDetailsComponent,
    ProjectDetailsComponent,
    ResearchActivitiesComponent,
    OutputDetailsComponent,
    BudgetSummaryComponent,
    FinalDeclarationComponent,
    ScoreSummaryComponent,
    ReviewBlockComponent
  ],
  templateUrl: './rdig_form.component.html',
  styleUrl: './rdig_form.component.scss',
})
export class RdigApplicationComponent implements OnInit, OnDestroy {

  workflow = inject(RdigWorkflowService);
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private batchSvc  = inject(BatchSittingService);
  private notifSvc  = inject(NotificationService);

  /** The currently active batch loaded from the server on init. */
  activeBatch = signal<BatchSitting | null | undefined>(undefined); // undefined = loading

  /** True when no active batch exists — blocks form access and submission. */
  readonly noBatchError = computed(() => this.activeBatch() === null);

  /** True while the batch status is still being fetched. */
  readonly isBatchLoading = computed(() => this.activeBatch() === undefined);

  /** DEV ONLY - bypasses active-batch checks so the form can be opened for testing. */
  batchValidationDisabled = signal(false);

  /** Existing applications remain readable even when no submission batch is active. */
  readonly canShowForm = computed(() =>
    !this.noBatchError() || !!this.loadedAppId() || this.batchValidationDisabled()
  );

  /** Days remaining until active batch endDate. Returns -999 when no batch loaded. */
  readonly deadlineDaysLeft = computed((): number => {
    const batch = this.activeBatch();
    if (!batch) return -999;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const end    = new Date(batch.endDate + 'T00:00:00');
    return Math.floor((end.getTime() - today.getTime()) / 86_400_000);
  });

  // ── Wizard state ───────────────────────────────────────────────
  currentStep = signal<number>(1);
  readonly totalSteps = 4;

  isSaving = signal(false);
  submissionState = signal<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  submissionErrorMessage = signal('');
  isSubmitting = computed(() => this.submissionState() !== 'IDLE');
  submitAttempted = signal(false);
  isViewOnly = computed(() => !this.workflow.currentUserCanAct());

  /**
   * The json-server record ID for the currently loaded application.
   * null  → no record exists yet (new application, next save will POST)
   * set   → record exists (next save will PUT to /applications/:id)
   */
  private loadedAppId = signal<string | null>(null);

  /** DEV ONLY — bypasses form validation to allow unrestricted navigation and submission. */
  validationDisabled = signal(false);

  /** Tracks the live workflow state — persisted alongside form data */
  workflowState = signal<WorkflowState>({
    currentStatus: 'fill_application',
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
  showCeoComments = signal(false);

  /** True when any comment panel is visible */
  showAnyComments = computed(() =>
    this.showHosComments() || this.showRmcComments() ||
    this.showR1Comments() || this.showR2Comments() ||
    this.showRdigChairComments() || this.showVcComments() || this.showCeoComments()
  );

  /** Tracks steps the user has left, making them eligible for warning/complete state */
  checkedSteps = new Set<number>();

  // ── Step metadata ──────────────────────────────────────────────
  readonly steps: WizardStep[] = [
    { label: 'Team Members', icon: 'group' },
    { label: 'Project Details', icon: 'description' },
    { label: 'Research Output & Budget', icon: 'science' },
    { label: 'Declaration', icon: 'verified' }
  ];

  /** Field paths & labels per step for validation tooltip */
  readonly stepFieldChecks: Array<Array<{ path: string; label: string }>> = [
    // Step 1: Team Members
    [
      { path: 'teamDetails.leaderName', label: 'Project Leader Name' },
      { path: 'teamDetails.leaderEmail', label: "Project Leader's Email" },
      { path: 'teamDetails.department', label: "School / Department" },
      { path: 'teamDetails.researchCluster', label: 'Research Cluster' },
      { path: 'teamDetails.leaderRoles', label: 'Roles of Project Leader' },
      { path: 'teamDetails.internalResearchers', label: 'APU Co-Researchers (min 1)' },
      { path: 'teamDetails.externalResearchers', label: 'External Collaborators (min 2)' },
    ],
    // Step 2: Project Details
    [
      { path: 'projectDetails.applicationType', label: 'Application Type' },
      { path: 'projectDetails.declarations.ethics', label: 'Ethics Declaration' },
      { path: 'projectDetails.declarations.conflict', label: 'Conflict of Interest' },
      { path: 'projectDetails.duration', label: 'Project Duration' },
      { path: 'projectDetails.title', label: 'Project Title' },
      { path: 'projectDetails.researchArea', label: 'Research Area' },
      { path: 'projectDetails.domain', label: 'Research Domain' },
      { path: 'projectDetails.subDomain', label: 'Sub-Research Domain' },
      { path: 'projectDetails.esgs', label: 'ESG Factors' },
      { path: 'projectDetails.sdgs', label: 'SDG Alignment' },
      { path: 'projectDetails.executiveSummary', label: 'Executive Summary' },
      { path: 'projectDetails.keywords', label: 'Keywords' },
      { path: 'projectDetails.introduction', label: 'Introduction' },
      { path: 'projectDetails.problemStatement', label: 'Problem Statement' },
      { path: 'projectDetails.researchAim', label: 'Research Aim' },
      { path: 'projectDetails.researchQuestions', label: 'Research Questions' },
      { path: 'projectDetails.hypothesis', label: 'Hypothesis' },
      { path: 'projectDetails.literatureReview', label: 'Literature Review' },
      { path: 'projectDetails.methodology', label: 'Methodology' },
      { path: 'projectDetails.references', label: 'References' },
      { path: 'projectDetails.benefits.apu', label: 'APU Benefit' },
      { path: 'projectDetails.benefits.students', label: 'Students Benefit' },
      { path: 'projectDetails.benefits.stakeholders', label: 'Stakeholders Benefit' },
      { path: 'projectDetails.visionMission', label: 'Vision & Mission Alignment' },
    ],
    // Step 3: Research Output & Budget
    [
      { path: 'outputs.journal.checked', label: 'Indexed Journal Publication' },
      { path: 'outputs.journal.quantity', label: 'Indexed Journal Publication Quantity' },
      { path: 'outputs.conceptualDesign', label: 'Conceptual Design / Product Development' },
      { path: 'outputs.knowledgeTransfer.checked', label: 'Knowledge Transfer Programme' },
      { path: 'outputs.knowledgeTransfer.community', label: 'Knowledge Transfer Community' },
    ],
    // Step 4: Declaration
    [
      { path: 'finalDeclaration.noveltyJustification', label: 'Novelty Justification' },
      { path: 'finalDeclaration.agreed', label: 'Declaration Agreement' },
    ]
  ];

  /** Review form groups mapped by step index (0-based) */
  private readonly reviewGroupByStep = [
    ['reviewTeam'],                  // Step 1
    ['reviewProject'],               // Step 2
    ['reviewOutput', 'reviewBudget'], // Step 3
    ['reviewDeclaration'],           // Step 4
  ];

  /** Returns labels for required-but-empty controls in a FormGroup */
  private getRequiredInvalidLabels(groupPath: string): string[] {
    const group = this.rdigForm.get(groupPath) as FormGroup | null;
    if (!group) return [];
    return Object.entries(group.controls)
      .filter(([, ctrl]) => ctrl.hasError('required'))
      .map(([key]) => this.fieldKeyToLabel(key));
  }

  /** Convert camelCase field key to a readable label */
  private fieldKeyToLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, s => s.toUpperCase())
      .replace(/\bHos\b/g, 'HOS')
      .replace(/\bRmc\b/g, 'RMC')
      .replace(/\bRdig\b/g, 'RDIG')
      .replace(/\bVc\b/g, 'VC')
      .replace(/\bCeo\b/g, 'CEO')
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
      const missingFields = checks
        .filter(c => this.rdigForm.get(c.path)?.invalid)
        .map(c => c.label);

      // Step 2 also includes Research Activities (applicant-only)
      if (stepNum === 2 && this.workflow.isApplicantEditable()) {
        const acts = this.rdigForm.get('activities') as FormArray;
        if (!acts || acts.length === 0) {
          missingFields.push('At least 1 Research Activity');
        } else {
          acts.controls.forEach((ctrl, idx) => {
            if (ctrl.get('name')?.invalid || !String(ctrl.get('name')?.value ?? '').trim()) {
              missingFields.push(`Activity ${idx + 1} Description`);
            }
          });
          if (acts.hasError('activitiesTimeline')) {
            missingFields.push('Research Activities Timeline');
          }
        }
      }

      if (stepNum === 3 && this.rdigForm.get('budget')?.hasError('budgetRange')) {
        missingFields.push('Total Amount Requested');
      }

      // Include required-but-empty review fields (set dynamically by ReviewBlockComponent
      // and ApprovalCardComponent when the current user's role is editable)
      const reviewGroups = this.reviewGroupByStep[i] ?? [];
      reviewGroups.forEach(reviewGroup => {
        missingFields.push(...this.getRequiredInvalidLabels(reviewGroup));
      });
      // Step 4 also includes approval decision controls
      if (stepNum === 4) {
        missingFields.push(...this.getRequiredInvalidLabels('approvals'));
      }

      return { visited, valid: missingFields.length === 0, missingFields };
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
        batch: [null],            // auto-assigned from active batch on submit — never set manually
        applicationVersion: [1],
        reviewers_version: [1],
        applicantUserId: [null],  // stamped on first submit — used to target rejection/revision notifications
      }),

      // 2. Subpage 1 — Team Members (pre-filled from the logged-in user)
      teamDetails: this.fb.group({
        leaderName: [{ value: this.auth.currentUser()?.name ?? '', disabled: true }, Validators.required],
        leaderEmail: [{ value: this.auth.currentUser()?.email ?? '', disabled: true }, [Validators.required, Validators.email]],
        department: [{ value: this.auth.currentUser()?.department ?? '', disabled: true }, Validators.required],
        researchCluster: [null, Validators.required],
        leaderRoles: ['', [Validators.required, Validators.maxLength(600)]],
        internalResearchers: this.fb.array([], [Validators.minLength(1), Validators.maxLength(2)]),
        externalResearchers: this.fb.array([], [Validators.minLength(2), Validators.maxLength(10)])
      }),

      // 3. Subpage 2 — Project Details
      projectDetails: this.fb.group({
        applicationType: ['', Validators.required],
        declarations: this.fb.group({
          ethics: [false, Validators.requiredTrue],
          conflict: [false, Validators.requiredTrue]
        }),
        category: ['S&T'],
        duration: ['', Validators.required],
        title: ['', [Validators.required, Validators.maxLength(200)]],
        researchArea: ['', [Validators.required, Validators.maxLength(100)]],
        domain: ['', Validators.required],
        subDomain: ['', Validators.required],
        esgs: [[], [Validators.required, Validators.minLength(1), Validators.maxLength(3)]],
        sdgs: [[], [Validators.required, Validators.minLength(1), Validators.maxLength(3)]],
        executiveSummary: ['', [Validators.required, Validators.maxLength(1500)]],
        keywords: ['', [Validators.required, Validators.maxLength(200)]],
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
          stakeholders: ['', [Validators.required, Validators.maxLength(300)]]
        }),
        visionMission: ['', [Validators.required, Validators.maxLength(300)]]
      }),

      // 4. Subpage 3 — Research Activities
      activities: this.fb.array([], { validators: [this.activitiesTimelineValidator] }),

      // 5. Subpage 4 — Research Output
      outputs: this.fb.group({
        journal: this.fb.group({
          checked: [false, Validators.requiredTrue],
          quantity: [null, Validators.required]
        }),
        conceptualDesign: [false, Validators.requiredTrue],
        knowledgeTransfer: this.fb.group({
          checked: [false, Validators.requiredTrue],
          community: ['', Validators.required]
        }),
        externalGrant: this.fb.group({
          checked: [false],
          scheme: ['']
        }),
        others: this.fb.group({
          checked: [false],
          details: ['', Validators.maxLength(200)]
        })
      }),

      // 6. Subpage 5 — Budget
      budget: this.fb.group({
        studentAllowances: this.fb.array([]),
        travelAccommodation: this.fb.array([]),
        materialsSupplies: this.fb.array([]),
        specialServices: this.fb.array([]),
        totalRequest: [{ value: 0, disabled: true }]
      }, { validators: [this.budgetRangeValidator] }),

      // 7. Final Declaration
      finalDeclaration: this.fb.group({
        noveltyJustification: ['', [Validators.required, Validators.maxLength(1000)]],
        agreed: [false, Validators.requiredTrue]
      }),

      // ── 8. Review & Approval Data ──────────────────────────────

      // Page 1 (Team Details) reviews
      reviewTeam: this.fb.group({
        hosComment: ['', Validators.maxLength(500)],
        reviewer1Comment: ['', Validators.maxLength(500)],
        reviewer1Score: [''],
        reviewer2Comment: ['', Validators.maxLength(500)],
        reviewer2Score: [''],
        rmcComment: ['', Validators.maxLength(500)]
      }),

      // Page 2 (Project Details) reviews — per-field comments & scores
      reviewProject: this.fb.group({
        // HOS page-level comment (covers all of Project Details page)
        hosPageComment: ['', Validators.maxLength(500)],
        // Between category/duration/title
        reviewer1ClassificationComment: ['', Validators.maxLength(500)],
        reviewer2ClassificationComment: ['', Validators.maxLength(500)],
        // Per-field comment-only (Project Title, Research Area, ESG, SDG, Keywords, References, Vision, Activities)
        reviewer1TitleComment: ['', Validators.maxLength(500)],
        reviewer2TitleComment: ['', Validators.maxLength(500)],
        reviewer1ResearchAreaComment: ['', Validators.maxLength(500)],
        reviewer2ResearchAreaComment: ['', Validators.maxLength(500)],
        reviewer1EsgComment: ['', Validators.maxLength(500)],
        reviewer2EsgComment: ['', Validators.maxLength(500)],
        reviewer1SdgComment: ['', Validators.maxLength(500)],
        reviewer2SdgComment: ['', Validators.maxLength(500)],
        reviewer1KeywordsComment: ['', Validators.maxLength(500)],
        reviewer2KeywordsComment: ['', Validators.maxLength(500)],
        reviewer1ReferencesComment: ['', Validators.maxLength(500)],
        reviewer2ReferencesComment: ['', Validators.maxLength(500)],
        reviewer1VisionComment: ['', Validators.maxLength(500)],
        reviewer2VisionComment: ['', Validators.maxLength(500)],
        reviewer1ActivitiesComment: ['', Validators.maxLength(500)],
        reviewer2ActivitiesComment: ['', Validators.maxLength(500)],
        // Comment + Score sections (0-10)
        reviewer1SummaryComment: ['', Validators.maxLength(500)],
        reviewer1SummaryScore: [''],
        reviewer2SummaryComment: ['', Validators.maxLength(500)],
        reviewer2SummaryScore: [''],
        reviewer1IntroComment: ['', Validators.maxLength(500)],
        reviewer1IntroScore: [''],
        reviewer2IntroComment: ['', Validators.maxLength(500)],
        reviewer2IntroScore: [''],
        reviewer1ProblemComment: ['', Validators.maxLength(500)],
        reviewer1ProblemScore: [''],
        reviewer2ProblemComment: ['', Validators.maxLength(500)],
        reviewer2ProblemScore: [''],
        reviewer1HypothesisComment: ['', Validators.maxLength(500)],
        reviewer1HypothesisScore: [''],
        reviewer2HypothesisComment: ['', Validators.maxLength(500)],
        reviewer2HypothesisScore: [''],
        reviewer1LitReviewComment: ['', Validators.maxLength(500)],
        reviewer1LitReviewScore: [''],
        reviewer2LitReviewComment: ['', Validators.maxLength(500)],
        reviewer2LitReviewScore: [''],
        reviewer1MethodComment: ['', Validators.maxLength(500)],
        reviewer1MethodScore: [''],
        reviewer2MethodComment: ['', Validators.maxLength(500)],
        reviewer2MethodScore: [''],
        reviewer1StakeholdersComment: ['', Validators.maxLength(500)],
        reviewer1StakeholdersScore: [''],
        reviewer2StakeholdersComment: ['', Validators.maxLength(500)],
        reviewer2StakeholdersScore: [''],
        // Research Aim & Questions (0-5)
        reviewer1AimComment: ['', Validators.maxLength(500)],
        reviewer1AimScore: [''],
        reviewer2AimComment: ['', Validators.maxLength(500)],
        reviewer2AimScore: [''],
        reviewer1QuestionsComment: ['', Validators.maxLength(500)],
        reviewer1QuestionsScore: [''],
        reviewer2QuestionsComment: ['', Validators.maxLength(500)],
        reviewer2QuestionsScore: [''],
        rmcAimComment: ['', Validators.maxLength(500)]
      }),

      // Page 3 (Output Details) reviews
      reviewOutput: this.fb.group({
        hosComment: ['', Validators.maxLength(500)],
        reviewer1Comment: ['', Validators.maxLength(500)],
        reviewer2Comment: ['', Validators.maxLength(500)],
        rmcComment: ['', Validators.maxLength(500)]
      }),

      // Page 4 (Budget) reviews — per detail breakdown
      reviewBudget: this.fb.group({
        reviewer1StudentComment: ['', Validators.maxLength(500)],
        reviewer2StudentComment: ['', Validators.maxLength(500)],
        reviewer1TravelComment: ['', Validators.maxLength(500)],
        reviewer2TravelComment: ['', Validators.maxLength(500)],
        reviewer1MaterialsComment: ['', Validators.maxLength(500)],
        reviewer2MaterialsComment: ['', Validators.maxLength(500)],
        reviewer1ServicesComment: ['', Validators.maxLength(500)],
        reviewer2ServicesComment: ['', Validators.maxLength(500)],
        // Final budget section: full evaluation
        hosComment: ['', Validators.maxLength(500)],
        rmcComment: ['', Validators.maxLength(500)],
        reviewer1Comment: ['', Validators.maxLength(500)],
        reviewer1Score: [''],
        reviewer2Comment: ['', Validators.maxLength(500)],
        reviewer2Score: ['']
      }),

      // Page 5 (Declaration) reviews + approvals
      reviewDeclaration: this.fb.group({
        rdigChairComment: ['', Validators.maxLength(500)],
        vcComment: ['', Validators.maxLength(500)]
      }),

      // Approval decisions
      approvals: this.fb.group({
        hosStatus: [''],
        rmcStatus: [''],
        reviewer1Decision: [''],
        reviewer2Decision: [''],
        rdigChairStatus: [''],
        vcStatus: [''],
        ceoStatus: [''],
        reviewer1Assignment: ['4'],
        reviewer2Assignment: ['4']
      })
    });

    this.rdigForm.get('budget')?.updateValueAndValidity({ emitEvent: false });
    this.rdigForm.get('activities')?.updateValueAndValidity({ emitEvent: false });

    // Reactively disable/enable applicant form groups based on workflow status.
    // Review groups (reviewTeam, reviewProject, etc.) and approvals are NOT included
    // here — they are controlled individually by each review-block/approval-card.
    effect(() => {
      const readOnly = this.workflow.isFormReadOnly();
      const applicantGroups = [
        'teamDetails', 'projectDetails', 'activities', 'outputs', 'budget', 'finalDeclaration'
      ];
      applicantGroups.forEach(name => {
        const ctrl = this.rdigForm.get(name);
        readOnly ? ctrl?.disable({ emitEvent: false }) : ctrl?.enable({ emitEvent: false });
      });
      // totalRequest is always computed — keep it disabled regardless
      this.rdigForm.get('budget.totalRequest')?.disable({ emitEvent: false });
      ['leaderName', 'leaderEmail', 'department'].forEach(name => {
        this.rdigForm.get(`teamDetails.${name}`)?.disable({ emitEvent: false });
      });
    });
  }

  /**
   * DEV TEST: Live override for applicationStatus (ABAC testing)
   * Syncs the workflow.status signal and workflowState whenever the test field changes.
   * Remove this method and the corresponding HTML when test is no longer needed.
   */
  onTestStatusChange(val: string): void {
    const s = val as RdigStatus;
    this.workflow.status.set(s);
    this.workflowState.update(ws => ({
      ...ws,
      currentStatus: s,
      nextRoles: getNextRoles(s),
    }));
    this.workflow.currentUserCanAct.set(this.canCurrentUserActOnCurrentState());
  }

  /** DEV ONLY — toggles validation bypass for testing navigation and submission. */
  toggleValidation(): void {
    this.validationDisabled.update(v => !v);
  }

  /** DEV ONLY - toggles active-batch validation for testing access and submission. */
  toggleBatchValidation(): void {
    this.batchValidationDisabled.update(v => !v);
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
  toggleHosComments(): void { this.showHosComments.update(v => !v); }
  toggleRmcComments(): void { this.showRmcComments.update(v => !v); }
  toggleR1Comments(): void { this.showR1Comments.update(v => !v); }
  toggleR2Comments(): void { this.showR2Comments.update(v => !v); }
  toggleRdigChairComments(): void { this.showRdigChairComments.update(v => !v); }
  toggleVcComments(): void { this.showVcComments.update(v => !v); }
  toggleCeoComments(): void { this.showCeoComments.update(v => !v); }

  // ── Loading indicator for when fetching an existing application ──
  isLoadingApplication = signal(false);

  // ── Sync ABAC attributes to workflow ───────────────────────────
  ngOnInit(): void {
    // Load the active batch — gates form access and is auto-assigned on submit.
    this.batchSvc.loadAll().subscribe({
      next: batches => {
        const active = batches.find(b => b.status === 'active') ?? null;
        this.activeBatch.set(active);
      },
      error: () => this.activeBatch.set(null),
    });

    // If a record ID is in the URL (?id=xxx), load and restore that application.
    const id = this.route.snapshot.queryParamMap.get('id');
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
    r1Ctrl.valueChanges.subscribe(v => this.workflow.reviewer1UserId.set(v ?? ''));
    r2Ctrl.valueChanges.subscribe(v => this.workflow.reviewer2UserId.set(v ?? ''));
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
   * defaulting to 'fill_application' for new applications).
   */
  private syncWorkflowFromForm(): void {
    const status = this.workflowState().currentStatus as RdigStatus;
    this.workflow.status.set(status);
    this.workflowState.update(ws => ({ ...ws, nextRoles: getNextRoles(status) }));

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
    const ownerById = app.metadata?.applicantUserId && String(app.metadata.applicantUserId) === String(user.id);
    const ownerByName = app.teamDetails?.leaderName && app.teamDetails.leaderName === user.name;
    const isOwner = !!(ownerById || ownerByName);

    if ((wf.currentStatus === 'fill_application' || app.isDraft === true) && isOwner) return true;

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
    this.isLoadingApplication.set(true);
    this.http.get<any>(`http://localhost:3000/applications/${id}`).subscribe({
      next: (data) => {
        this.patchFormFromSavedData(data);
        this.isLoadingApplication.set(false);
      },
      error: (err) => {
        console.error('Failed to load application:', err);
        this.isLoadingApplication.set(false);
        alert(`Could not load application ${id}. Make sure the JSON server is running (npm run db).`);
      },
    });
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
      metadata:           data.metadata           ?? {},
      projectDetails:     data.projectDetails     ?? {},
      outputs:            data.outputs            ?? {},
      finalDeclaration:   data.finalDeclaration   ?? {},
      reviewTeam:         data.reviewTeam         ?? {},
      reviewProject:      data.reviewProject      ?? {},
      reviewOutput:       data.reviewOutput       ?? {},
      reviewBudget:       data.reviewBudget       ?? {},
      reviewDeclaration:  data.reviewDeclaration  ?? {},
      approvals:          data.approvals          ?? {},
    });

    // teamDetails scalar fields (exclude the arrays)
    this.rdigForm.get('teamDetails')?.patchValue({
      leaderName:      data.teamDetails?.leaderName      ?? '',
      leaderEmail:     data.teamDetails?.leaderEmail     ?? '',
      department:      data.teamDetails?.department      ?? '',
      researchCluster: data.teamDetails?.researchCluster ?? null,
      leaderRoles:     data.teamDetails?.leaderRoles     ?? '',
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
    this.rebuildArray(
      this.rdigForm.get('teamDetails.externalResearchers') as FormArray,
      data.teamDetails?.externalResearchers ?? [],
    );
    this.rebuildArray(
      this.rdigForm.get('activities') as FormArray,
      data.activities ?? [],
    );
    this.rdigForm.get('activities')?.updateValueAndValidity({ emitEvent: false });
    this.rebuildArray(
      this.rdigForm.get('budget.studentAllowances') as FormArray,
      data.budget?.studentAllowances ?? [],
    );
    this.rebuildArray(
      this.rdigForm.get('budget.travelAccommodation') as FormArray,
      data.budget?.travelAccommodation ?? [],
    );
    this.rebuildArray(
      this.rdigForm.get('budget.materialsSupplies') as FormArray,
      data.budget?.materialsSupplies ?? [],
    );
    this.rebuildArray(
      this.rdigForm.get('budget.specialServices') as FormArray,
      data.budget?.specialServices ?? [],
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

  /** Clear a FormArray and rebuild it from a plain-object array. */
  private rebuildArray(arr: FormArray, items: any[]): void {
    arr.clear({ emitEvent: false });
    items.forEach(item => arr.push(this.fb.group(item), { emitEvent: false }));
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
      this.currentStep.update(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPrev(): void {
    if (this.currentStep() > 1) {
      this.checkedSteps.add(this.currentStep());
      this.currentStep.update(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Feedback signal shown after a successful draft save (clears automatically). */
  draftSaveSuccess = signal(false);
  private draftSaveTimer?: ReturnType<typeof setTimeout>;

  onSaveDraft(): void {
    if (this.isViewOnly()) {
      this.submissionErrorMessage.set('This application is open in history view only and cannot be edited.');
      this.submissionState.set('ERROR');
      return;
    }

    this.isSaving.set(true);
    const currentStatus = this.workflowState().currentStatus;

    // Determine whether this is a brand-new application (not yet formally submitted
    // to any reviewer) or an in-progress application being partially saved.
    const isNewApp = currentStatus === 'fill_application';

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
      formType:  'RDIG',
      workflow:  workflowForSave,
      isDraft:   isNewApp,          // only unsubmitted apps get the draft flag
      savedAt:   new Date().toISOString(),
      metadata:  { ...rawMeta, applicantUserId },
    };

    const appId  = this.loadedAppId();
    const isEdit = !!appId;
    const url    = isEdit
      ? `http://localhost:3000/applications/${appId}`
      : 'http://localhost:3000/applications';

    const request$ = isEdit
      ? this.http.put(url, formData)
      : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        if (!isEdit && response?.id) {
          this.loadedAppId.set(response.id);
          // Also update the URL so a refresh reopens the same draft
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: response.id },
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
    if (this.isViewOnly()) {
      this.submissionErrorMessage.set('This application is open in history view only and cannot be submitted.');
      this.submissionState.set('ERROR');
      return;
    }

    // ── Batch constraint check ───────────────────────────────────────────────
    const batch = this.activeBatch();
    const bypassBatchValidation = this.batchValidationDisabled();
    if (!batch && !bypassBatchValidation) {
      alert('No active batch exists. Submission is not allowed until RMC opens a new batch.');
      return;
    }
    const today = new Date().toISOString().substring(0, 10);
    if (batch && !bypassBatchValidation && (today < batch.startDate || today > batch.endDate)) {
      this.submissionErrorMessage.set(`Submission is only allowed between ${batch.startDate} and ${batch.endDate}. The current batch window has expired or has not started yet.`);
      this.submissionState.set('ERROR');
      return;
    }
    // ── End batch constraint check ───────────────────────────────────────────

    if (!this.validationDisabled() && this.rdigForm.invalid) {
      this.rdigForm.markAllAsTouched();
      console.warn('Form invalid — please review all steps.');
      this.submissionErrorMessage.set('Your form has missing or invalid fields. Please review all steps.');
      this.submissionState.set('ERROR');
      return;
    }
    this.submissionState.set('LOADING');

    // Auto-assign the active batch id unless dev batch validation is disabled.
    this.rdigForm.get('metadata.batch')?.setValue(batch?.id ?? null, { emitEvent: false });

    // Stamp applicant's userId on first submit so downstream reviewers can target notifications back to them.
    if (!this.rdigForm.get('metadata.applicantUserId')?.value) {
      this.rdigForm.get('metadata.applicantUserId')?.setValue(
        this.auth.currentUser()?.id ?? null, { emitEvent: false },
      );
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
      const nextUsers: string[] = nextStatus === 'pending_reviewers'
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

    // Clear the draft flag on formal submission so the application moves to
    // the appropriate inbox / pending view and not back to Drafts.
    const formData = {
      ...this.rdigForm.getRawValue(),
      formType: 'RDIG',
      workflow: this.workflowState(),
      isDraft:  false,
      savedAt:  new Date().toISOString(),
    };
    console.log('Submitting', formData);

    const appId = this.loadedAppId();
    const isEdit = !!appId;
    const url = isEdit
      ? `http://localhost:3000/applications/${appId}`
      : 'http://localhost:3000/applications';

    const request$ = isEdit
      ? this.http.put(url, formData)
      : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        let savedId = appId;
        if (!isEdit && response.id) {
          savedId = response.id;
          this.loadedAppId.set(savedId);
        }

        // First formal submission (applicant → HOS): register this app in the batch's applicationIds array.
        if (currentStatus === 'fill_application' && batch && savedId != null) {
          this.batchSvc.addApplicationId(batch.id, Number(savedId)).subscribe();
        }

        // First, clear any existing action notifications for the current user (e.g. they just approved it)
        if (savedId != null) {
          this.notifSvc.resolveAction(Number(savedId), 'RDIG Application');
        }

        // Fire workflow notifications for the next recipient(s).
        if (transition && savedId != null) {
          this.fireWorkflowNotifications(
            transition.nextStatus, transition.actorRole, Number(savedId), formData, currentStatus,
          );
        }

        this.submissionState.set('SUCCESS');

        // Allow user to see the success checkmark, then redirect home
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2200);
      },
      error: (err) => {
        console.error('Save failed:', err);
        let errorMsg = 'Failed to process. Please try again.';
        if (err.status === 0) errorMsg = 'Could not connect to the server (Ensure the local db is running).';
        
        this.submissionErrorMessage.set(errorMsg);
        this.submissionState.set('ERROR');
      }
    });
  }

  // ── Notification dispatch ──────────────────────────────────────────────────

  /**
   * Fires the correct notification(s) after each workflow transition.
   * Determines recipient(s) from the next status and the saved formData.
   */
  private fireWorkflowNotifications(
    nextStatus:    RdigStatus,
    actorRole:     string,
    savedId:       number,
    formData:      any,
    currentStatus: RdigStatus,
  ): void {
    const actorName         = this.auth.currentUser()?.name ?? 'Unknown';
    const entityType        = 'RDIG Application';
    const entityModule      = 'rdig';
    const route             = `/rdig?id=${savedId}`;
    const applicantUserId   = formData.metadata?.applicantUserId as string | null;
    const appDepartment     = formData.teamDetails?.department   as string ?? '';
    const nextUsers: string[] = formData.workflow?.nextUsers     ?? [];

    const fire = (key: string, ctx: Record<string, unknown>) => {
      this.notifSvc.create(
        this.notifSvc.build(key, {
          entityType, entityId: savedId, actorName, stage: nextStatus,
          ...ctx,
          data: {
            entityId: savedId, entityType, entityModule,
            stage: nextStatus, actorName, route,
            ...(ctx['data'] as object ?? {}),
          },
        }),
      ).subscribe();
    };

    switch (nextStatus) {

      case 'pending_hos':
        // Notify HOS (department-scoped)
        fire('REVIEW_ASSIGNED_TO_YOU', {
          stage: 'HOS Review', recipientRole: 'HOS', recipientDepartment: appDepartment,
        });
        // Confirm submission to applicant on first submit only
        if (currentStatus === 'fill_application') {
          fire('APPLICATION_SUBMITTED_CONFIRMED', {
            recipientUserId: this.auth.currentUser()?.id,
            data: { route: null } // This is strictly an FYI; strip the link
          });
        }
        break;

      case 'pending_hos_review':
        // Applicant resubmitted → notify HOS again (department-scoped)
        fire('APPLICATION_RESUBMITTED_BY', {
          stage: 'HOS Re-Review', recipientRole: 'HOS', recipientDepartment: appDepartment,
        });
        break;

      case 'pending_rmc':
        fire('REVIEW_ASSIGNED_TO_YOU', { stage: 'RMC Review', recipientRole: 'RMC' });
        break;

      case 'pending_rmc_review':
        // Applicant resubmitted after reviewers → notify RMC
        fire('APPLICATION_RESUBMITTED_BY', { stage: 'RMC Final Review', recipientRole: 'RMC' });
        break;

      case 'pending_reviewers':
        // Notify both assigned reviewers by their userId
        nextUsers.forEach(uid =>
          fire('REVIEWER_ASSIGNED_TO_APPLICATION', { recipientUserId: uid }),
        );
        break;

      case 'pending_rdig_chair':
        fire('REVIEW_ASSIGNED_TO_YOU', { stage: 'RDIG Chair Review', recipientRole: 'RDIG_Chair' });
        break;

      case 'pending_vc':
        fire('REVIEW_ASSIGNED_TO_YOU', { stage: 'VC Review', recipientRole: 'VC' });
        break;

      case 'pending_ceo':
        fire('REVIEW_ASSIGNED_TO_YOU', { stage: 'CEO Review', recipientRole: 'CEO' });
        break;

      case 'pending_applicant_resubmission_hos':
      case 'pending_applicant_resubmission_reviewers':
        if (applicantUserId) {
          fire('APPLICATION_RETURNED_FOR_REVISION', { recipientUserId: applicantUserId });
        }
        break;

      case 'rejected_hos':
      case 'rejected_rmc':
      case 'rejected_rdig_chair':
      case 'rejected_vc':
      case 'rejected_ceo':
        if (applicantUserId) {
          fire('APPLICATION_REJECTED_BY', { stage: actorRole, recipientUserId: applicantUserId });
        }
        break;
    }
  }
}
