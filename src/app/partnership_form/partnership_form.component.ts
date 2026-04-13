import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormMainTitleComponent } from '../shared/components/form-main-title/form-main-title.component';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ProposalDetails } from './components/proposal-details/proposal-details';
import { RiskAssessment } from './components/risk-assessment/risk-assessment';

export type PartnershipStatus =
  | 'draft'
  | 'submitted'
  | 'pending_rmc_review'
  | 'pending_proposer_resubmission_rmc'
  | 'pending_legal_review'
  | 'pending_proposer_resubmission_legal'
  | 'pending_sr_director_review'
  | 'pending_proposer_resubmission_sr_director'
  | 'pending_vc_review'
  | 'rejected_vc'
  | 'pending_senior_executive_signing'
  | 'completed';

@Component({
  selector: 'app-partnership-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormMainTitleComponent, StepIndicatorComponent, FormWizardNavComponent, ProposalDetails, RiskAssessment],
  templateUrl: './partnership_form.component.html',
  styleUrls: ['./partnership_form.component.scss']
})
export class PartnershipFormComponent {
  private fb = inject(FormBuilder);

  applicationStatus = signal<PartnershipStatus>('draft');
  isBusiness = signal<boolean>(true); // Default to Business path per requirements, toggles Legal stage

  currentStep = signal<number>(1);
  submitAttempted = signal<boolean>(false);
  visitedSteps = new Set<number>([1]);
  isSaving = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  reviewForm: FormGroup = this.fb.group({
    rmcComment: [''],
    legalComment: [''],
    srDirectorComment: [''],
    vcComment: ['']
  });

  // --- COMPUTE PERMISSIONS BY STAGE ---
  
  isProposerDisabled = computed(() => {
    const status = this.applicationStatus();
    return !['draft', 'pending_proposer_resubmission_rmc', 'pending_proposer_resubmission_legal', 'pending_proposer_resubmission_sr_director'].includes(status);
  });

  isRmcEditable = computed(() => this.applicationStatus() === 'pending_rmc_review');
  showRmcReview = computed(() => {
    const status = this.applicationStatus();
    return !['draft', 'submitted'].includes(status);
  });

  isLegalEditable = computed(() => this.applicationStatus() === 'pending_legal_review');
  showLegalReview = computed(() => {
    const status = this.applicationStatus();
    // Only show if it's a Business route, and passed RMC
    if (!this.isBusiness()) return false;
    return !['draft', 'submitted', 'pending_rmc_review', 'pending_proposer_resubmission_rmc'].includes(status);
  });

  isSrDirectorEditable = computed(() => this.applicationStatus() === 'pending_sr_director_review');
  showSrDirectorReview = computed(() => {
    const status = this.applicationStatus();
    const beforeSrDirector = ['draft', 'submitted', 'pending_rmc_review', 'pending_proposer_resubmission_rmc', 'pending_legal_review', 'pending_proposer_resubmission_legal'];
    return !beforeSrDirector.includes(status);
  });

  isVcEditable = computed(() => this.applicationStatus() === 'pending_vc_review');
  showVcReview = computed(() => {
    const status = this.applicationStatus();
    const beforeVc = ['draft', 'submitted', 'pending_rmc_review', 'pending_proposer_resubmission_rmc', 'pending_legal_review', 'pending_proposer_resubmission_legal', 'pending_sr_director_review', 'pending_proposer_resubmission_sr_director'];
    return !beforeVc.includes(status);
  });

  readonly totalSteps = 2;
  readonly steps: WizardStep[] = [
    { label: 'Applicant & Proposal Details', icon: 'assignment_ind' },
    { label: 'Risk Assessment', icon: 'assessment' }
  ];

  getStepStatuses(): StepStatus[] {
    return this.steps.map((_, i) => ({
      visited: this.visitedSteps.has(i + 1),
      valid: true, // simplified until form logic is added
      missingFields: [],
    }));
  }

  goToStep(step: number): void {
    this.currentStep.set(step);
    this.visitedSteps.add(step);
  }

  onPrev(): void {
    const cur = this.currentStep();
    if (cur > 1) {
      this.goToStep(cur - 1);
    }
  }

  onNext(): void {
    const cur = this.currentStep();
    if (cur < this.totalSteps) {
      this.goToStep(cur + 1);
    }
  }

  onSaveDraft(): void {
    console.log('Saving partnership draft...');
    this.isSaving.set(true);
    setTimeout(() => this.isSaving.set(false), 1000);
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    console.log('Submitting partnership form...');
    this.isSubmitting.set(true);
    setTimeout(() => this.isSubmitting.set(false), 1500);
  }
}
