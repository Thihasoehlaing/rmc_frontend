import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

// Shared layout components
import { FormMainTitleComponent } from '../shared/components/form-main-title/form-main-title.component';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';
import { FormCommentPanelComponent } from '../shared/components/form-comment-panel/form-comment-panel.component';
import { FormWizardNavComponent } from '../shared/components/form-wizard-nav/form-wizard-nav.component';

// Subpages
import { TeamDetailsComponent } from './components/team-details/team-details.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';
import { ResearchActivitiesComponent } from './components/research-activities/research-activities.component';
import { OutputDetailsComponent } from './components/output-details/output-details.component';
import { BudgetSummaryComponent } from './components/budget-summary/budget-summary.component';
import { FinalDeclarationComponent } from './components/final-declaration/final-declaration.component';

@Component({
  selector: 'app-rdig-application',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormMainTitleComponent,
    StepIndicatorComponent,
    FormCommentPanelComponent,
    FormWizardNavComponent,
    TeamDetailsComponent,
    ProjectDetailsComponent,
    ResearchActivitiesComponent,
    OutputDetailsComponent,
    BudgetSummaryComponent,
    FinalDeclarationComponent
  ],
  templateUrl: './form-one.component.html',
  styleUrl: './form-one.component.scss',
})
export class RdigApplicationComponent {

  // ── Wizard state ───────────────────────────────────────────────
  currentStep = signal<number>(1);
  readonly totalSteps = 5;

  isSaving     = signal(false);
  isSubmitting = signal(false);

  /** Tracks which steps the user has visited */
  visitedSteps = new Set<number>([1]);

  // ── Step metadata ──────────────────────────────────────────────
  readonly steps: WizardStep[] = [
    { label: 'Team Members',    icon: 'group' },
    { label: 'Project Details', icon: 'description' },
    { label: 'Research Output', icon: 'science' },
    { label: 'Budget',          icon: 'account_balance_wallet' },
    { label: 'Declaration',     icon: 'verified' }
  ];

  /** Field paths & labels per step for validation tooltip */
  readonly stepFieldChecks: Array<Array<{path: string; label: string}>> = [
    // Step 1: Team Members
    [
      { path: 'teamDetails.leaderName',      label: 'Project Leader Name' },
      { path: 'teamDetails.leaderEmail',     label: "Project Leader's Email" },
      { path: 'teamDetails.department',      label: "School / Department" },
      { path: 'teamDetails.researchCluster', label: 'Research Cluster' },
      { path: 'teamDetails.leaderRoles',     label: 'Roles of Project Leader' },
    ],
    // Step 2: Project Details
    [
      { path: 'projectDetails.applicationType',        label: 'Application Type' },
      { path: 'projectDetails.declarations.ethics',    label: 'Ethics Declaration' },
      { path: 'projectDetails.declarations.conflict',  label: 'Conflict of Interest' },
      { path: 'projectDetails.duration',               label: 'Project Duration' },
      { path: 'projectDetails.title',                  label: 'Project Title' },
      { path: 'projectDetails.researchArea',           label: 'Research Area' },
      { path: 'projectDetails.domain',                 label: 'Research Domain' },
      { path: 'projectDetails.subDomain',              label: 'Sub-Research Domain' },
      { path: 'projectDetails.esgs',                   label: 'ESG Factors' },
      { path: 'projectDetails.sdgs',                   label: 'SDG Alignment' },
      { path: 'projectDetails.executiveSummary',       label: 'Executive Summary' },
      { path: 'projectDetails.keywords',               label: 'Keywords' },
      { path: 'projectDetails.introduction',           label: 'Introduction' },
      { path: 'projectDetails.problemStatement',       label: 'Problem Statement' },
      { path: 'projectDetails.researchAim',            label: 'Research Aim' },
      { path: 'projectDetails.researchQuestions',      label: 'Research Questions' },
      { path: 'projectDetails.hypothesis',             label: 'Hypothesis' },
      { path: 'projectDetails.literatureReview',       label: 'Literature Review' },
      { path: 'projectDetails.methodology',            label: 'Methodology' },
      { path: 'projectDetails.references',             label: 'References' },
      { path: 'projectDetails.benefits.apu',           label: 'APU Benefit' },
      { path: 'projectDetails.benefits.students',      label: 'Students Benefit' },
      { path: 'projectDetails.benefits.stakeholders',  label: 'Stakeholders Benefit' },
      { path: 'projectDetails.visionMission',          label: 'Vision & Mission Alignment' },
    ],
    // Step 3: Research Activities (FormArray check handled separately)
    [],
    // Step 4: Research Output
    [],
    // Step 5: Budget + Declaration
    [
      { path: 'finalDeclaration.noveltyJustification', label: 'Novelty Justification' },
      { path: 'finalDeclaration.agreed',               label: 'Declaration Agreement' },
    ]
  ];

  getStepStatuses(): StepStatus[] {
    return this.steps.map((_, i) => {
      const stepNum = i + 1;
      const visited = this.visitedSteps.has(stepNum);
      const checks = this.stepFieldChecks[i] ?? [];
      const missingFields = checks
        .filter(c => this.rdigForm.get(c.path)?.invalid)
        .map(c => c.label);

      // Step 3: activities array must have at least 1 valid entry
      if (stepNum === 3) {
        const acts = this.rdigForm.get('activities') as FormArray;
        if (!acts || acts.length === 0) missingFields.push('At least 1 Research Activity');
      }

      return { visited, valid: missingFields.length === 0, missingFields };
    });
  }

  // ── Master FormGroup ───────────────────────────────────────────
  rdigForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.rdigForm = this.fb.group({

      // 1. Hidden metadata (system-managed)
      metadata: this.fb.group({
        batchNumber:   [''],
        applicationId: [''],
        version:       [1]
      }),

      // 2. Subpage 1 — Team Members
      teamDetails: this.fb.group({
        leaderName:          ['', Validators.required],
        leaderEmail:         ['', [Validators.required, Validators.email]],
        department:          ['', Validators.required],
        researchCluster:     [null, Validators.required],
        leaderRoles:         ['', [Validators.required, Validators.maxLength(600)]],
        internalResearchers: this.fb.array([]),
        externalResearchers: this.fb.array([])
      }),

      // 3. Subpage 2 — Project Details
      projectDetails: this.fb.group({
        applicationType: ['', Validators.required],
        declarations: this.fb.group({
          ethics:   [false, Validators.requiredTrue],
          conflict: [false, Validators.requiredTrue]
        }),
        category:      ['S&T'],
        duration:      ['', Validators.required],
        title:         ['', [Validators.required, Validators.maxLength(200)]],
        researchArea:  ['', [Validators.required, Validators.maxLength(100)]],
        domain:        ['', Validators.required],
        subDomain:     ['', Validators.required],
        esgs:          [[], Validators.required],
        sdgs:          [[], Validators.required],
        executiveSummary:  ['', [Validators.required, Validators.maxLength(1500)]],
        keywords:          ['', [Validators.required, Validators.maxLength(200)]],
        introduction:      ['', [Validators.required, Validators.maxLength(3000)]],
        problemStatement:  ['', [Validators.required, Validators.maxLength(3000)]],
        researchAim:       ['', [Validators.required, Validators.maxLength(1000)]],
        researchQuestions: ['', [Validators.required, Validators.maxLength(1000)]],
        hypothesis:        ['', [Validators.required, Validators.maxLength(1000)]],
        literatureReview:  ['', [Validators.required, Validators.maxLength(5000)]],
        methodology:       ['', [Validators.required, Validators.maxLength(3000)]],
        references:        ['', [Validators.required, Validators.maxLength(3000)]],
        benefits: this.fb.group({
          apu:          ['', [Validators.required, Validators.maxLength(300)]],
          students:     ['', [Validators.required, Validators.maxLength(300)]],
          stakeholders: ['', [Validators.required, Validators.maxLength(300)]]
        }),
        visionMission: ['', [Validators.required, Validators.maxLength(300)]]
      }),

      // 4. Subpage 3 — Research Activities
      activities: this.fb.array([]),

      // 5. Subpage 4 — Research Output
      outputs: this.fb.group({
        journal: this.fb.group({
          checked:  [false],
          quantity: [null]
        }),
        conceptualDesign: [false],
        knowledgeTransfer: this.fb.group({
          checked:   [false],
          community: ['']
        }),
        externalGrant: this.fb.group({
          checked: [false],
          scheme:  ['']
        }),
        others: this.fb.group({
          checked: [false],
          details: ['', Validators.maxLength(200)]
        })
      }),

      // 6. Subpage 5 — Budget
      budget: this.fb.group({
        studentAllowances:   this.fb.array([]),
        travelAccommodation: this.fb.array([]),
        materialsSupplies:   this.fb.array([]),
        specialServices:     this.fb.array([]),
        totalRequest:        [{ value: 0, disabled: true }]
      }),

      // 7. Final Declaration
      finalDeclaration: this.fb.group({
        noveltyJustification: ['', [Validators.required, Validators.maxLength(1000)]],
        agreed:               [false, Validators.requiredTrue]
      })
    });
  }

  // ── Wizard navigation ──────────────────────────────────────────
  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.visitedSteps.add(this.currentStep());
      this.currentStep.set(step);
      this.visitedSteps.add(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onNext(): void {
    if (this.currentStep() < this.totalSteps) {
      this.visitedSteps.add(this.currentStep());
      this.currentStep.update(s => s + 1);
      this.visitedSteps.add(this.currentStep());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPrev(): void {
    if (this.currentStep() > 1) {
      this.visitedSteps.add(this.currentStep());
      this.currentStep.update(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSaveDraft(): void {
    this.isSaving.set(true);
    // TODO: wire up API service
    setTimeout(() => {
      console.log('Draft saved', this.rdigForm.getRawValue());
      this.isSaving.set(false);
    }, 800);
  }

  onSubmit(): void {
    if (this.rdigForm.invalid) {
      this.rdigForm.markAllAsTouched();
      console.warn('Form invalid — please review all steps.');
      return;
    }
    this.isSubmitting.set(true);
    // TODO: wire up API service
    console.log('Submitting', this.rdigForm.getRawValue());
  }
}
