import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../../shared/components/step-indicator/step-indicator.component';
import {
  FormMainTitleComponent,
  GuidelineContext,
} from '../../shared/components/form-main-title/form-main-title.component';
import { FormWizardNavComponent } from '../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ProjectDetailsComponent } from './components/Project Details/Project Details';
import { StudentDetailsComponent } from './components/Student Details/Student Details';
import { DeclarationComponent } from './components/Declaration/Declaration';
import { ActivatedRoute } from '@angular/router';
import { ActionLoadingService } from '../../core/services/action-loading.service';

interface DocumentConfig {
  id: number;
  title: string;
  description: string;
  required: boolean;
}

@Component({
  selector: 'app-ragra-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepIndicatorComponent,
    FormMainTitleComponent,
    FormWizardNavComponent,
    ProjectDetailsComponent,
    StudentDetailsComponent,
    DeclarationComponent
  ],
  templateUrl: './RA-GRA_form.component.html',
  styleUrl: './RA-GRA_form.component.scss'
})
export class RagraFormComponent {
  private route = inject(ActivatedRoute);
  private actionLoading = inject(ActionLoadingService);
  readonly guidelineContext: GuidelineContext =
    this.route.snapshot.queryParamMap.has('id') ? 'existing-application' : 'new-application';

  @ViewChild(ProjectDetailsComponent) projectDetailsComponent?: ProjectDetailsComponent;
  @ViewChild(StepIndicatorComponent) stepIndicator?: StepIndicatorComponent;
  @ViewChild(StudentDetailsComponent) studentDetailsComponent?: StudentDetailsComponent;
  @ViewChild(DeclarationComponent) declarationComponent?: DeclarationComponent;

  currentStep = 1;

  steps: WizardStep[] = [
    { label: 'Applicant & Project', icon: 'article' },
    { label: 'Student Details', icon: 'person' },
    { label: 'Declaration', icon: 'verified' }
  ];

  stepStatuses: StepStatus[] = [
    { visited: true, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] }
  ];

  /** Tracks validity per step (1-based keys). */
  formValid: { [key: number]: boolean} = { 1: false, 2: false, 3: false };
  private readonly checkedSteps = new Set<number>();

  submitAttempted = false;
  isSaving = false;
  isSubmitting = false;
  saveSuccess = false;
  submitSuccess = false;

  /** Cached positionRequested value — set when leaving Step 1 so it survives component destruction. */
  private _positionRequested: 'RA' | 'GRA' | '' = '';

  // ── Document Pagination ────────────────────────────────────────

  currentDocPage = 1;
  documentsPerPage = 4;

  documents: DocumentConfig[] = [
    {
      id: 1,
      title: 'Employment Application Form',
      description: 'Official RA/GRA employment application form',
      required: true
    },
    {
      id: 2,
      title: 'Copy of Academic Transcripts',
      description: 'Official academic transcripts from your institution',
      required: true
    },
    {
      id: 3,
      title: "RA/GRA's CV",
      description: 'Current curriculum vitae or resume',
      required: true
    },
    {
      id: 4,
      title: 'Print Screen of Bank Statement',
      description: 'Recent bank account statement for salary processing',
      required: true
    },
    {
      id: 5,
      title: 'Recruitment Submission Form',
      description: 'HR recruitment and approval form',
      required: true
    },
    {
      id: 6,
      title: 'Confidentiality Agreement',
      description: 'Signed confidentiality and data protection agreement',
      required: true
    },
    {
      id: 7,
      title: 'NRIC/Passport',
      description: 'Copy of identification document',
      required: true
    },
    {
      id: 8,
      title: 'VISA',
      description: 'Student visa (for international students)',
      required: false
    },
    {
      id: 9,
      title: 'Other Supporting Documents',
      description: 'Any additional relevant documents (optional)',
      required: false
    }
  ];

  get totalDocuments(): number {
    return this.documents.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalDocuments / this.documentsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedDocuments(): DocumentConfig[] {
    const startIndex = (this.currentDocPage - 1) * this.documentsPerPage;
    const endIndex = startIndex + this.documentsPerPage;
    return this.documents.slice(startIndex, endIndex);
  }

  get paginationStart(): number {
    return (this.currentDocPage - 1) * this.documentsPerPage + 1;
  }

  get paginationEnd(): number {
    const end = this.currentDocPage * this.documentsPerPage;
    return Math.min(end, this.totalDocuments);
  }

  goToDocumentPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentDocPage = pageNumber;
    }
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  /**
   * Reads positionRequested from Step 1 if it is still mounted,
   * otherwise returns the cached value set when the user left Step 1.
   */
  get positionRequested(): 'RA' | 'GRA' | '' {
    const live = this.projectDetailsComponent?.form?.value?.positionRequested;
    if (live) this._positionRequested = live;
    return this._positionRequested;
  }

  /**
   * Calculate overall application progress as percentage
   */
  get applicationProgress(): number {
    if (!this.totalSteps) return 0;

    const totalProgress = this.steps.reduce(
      (sum, _, index) => sum + this.getStepProgressRatio(index + 1),
      0,
    );
    return Math.round((totalProgress / this.totalSteps) * 100);
  }

  /**
   * Count how many steps are fully complete
   */
  get completedStepCount(): number {
    return this.steps.filter((_, index) => this.isStepComplete(index + 1)).length;
  }

  // ── Sidebar Data Getters ──────────────────────────────────────

  /** Get placement type for Appointment Snapshot */
  get placementType(): string {
    const form = this.projectDetailsComponent?.form;
    if (!form) return '';
    return form.value.placement || '';
  }

  /** Get application type for Appointment Snapshot */
  get applicationType(): string {
    const form = this.projectDetailsComponent?.form;
    if (!form) return '';
    return form.value.applicationType || '';
  }

  /** Get year for Appointment Snapshot */
  get year(): string {
    const form = this.projectDetailsComponent?.form;
    if (!form) return '';
    return form.value.year || '';
  }

  /** Get monthly allowance for Student Snapshot */
  get monthlyAllowance(): string {
    const form = this.studentDetailsComponent?.form;
    if (!form || !form.value.monthlyAllowance) return '';
    return `RM ${parseFloat(form.value.monthlyAllowance).toFixed(2)}`;
  }

  /** Get commencement date for Student Snapshot */
  get commencementDate(): string {
    const form = this.studentDetailsComponent?.form;
    if (!form || !form.value.commencementDate) return 'Pending';
    return form.value.commencementDate;
  }

  /** Get end date for Student Snapshot */
  get endDate(): string {
    const form = this.studentDetailsComponent?.form;
    if (!form || !form.value.endDate) return 'Pending';
    return form.value.endDate;
  }

  /** Check if GRA-specific fields should be shown */
  get isGRA(): boolean {
    return this.positionRequested === 'GRA';
  }

  /** Check if Research Cluster placement is selected */
  get isResearchCluster(): boolean {
    return this.placementType === 'Research Cluster';
  }

  /**
   * Check if a step is complete (all required fields filled and valid)
   */
  isStepComplete(stepNumber: number): boolean {
    const progress = this.getStepProgress(stepNumber);
    return progress.total > 0 && progress.completed === progress.total;
  }

  /**
   * Get progress ratio for a step (0.0 to 1.0)
   */
  private getStepProgressRatio(stepNumber: number): number {
    const progress = this.getStepProgress(stepNumber);
    return progress.total > 0 ? progress.completed / progress.total : 0;
  }

  /**
   * Get detailed progress for a specific step
   */
  private getStepProgress(stepNumber: number): { completed: number; total: number } {
    switch (stepNumber) {
      case 1: {
        const component = this.projectDetailsComponent;
        if (!component?.form) return { completed: 0, total: 1 };

        const progress = this.getRequiredControlProgress(component.form);
        this.addProgressCriterion(progress, component.form.valid);
        return progress;
      }
      case 2: {
        const component = this.studentDetailsComponent;
        if (!component?.form) return { completed: 0, total: 1 };

        const progress = this.getRequiredControlProgress(component.form);
        this.addProgressCriterion(progress, component.form.valid);
        return progress;
      }
      case 3: {
        const form = this.declarationComponent?.declarationForm;
        if (!form) return { completed: 0, total: 1 };
        const progress = this.getRequiredControlProgress(form);
        this.addProgressCriterion(progress, form.valid);
        return progress;
      }
      default:
        return { completed: 0, total: 1 };
    }
  }

  /**
   * Recursively count required controls and how many are complete
   */
  private getRequiredControlProgress(control: AbstractControl): {
    completed: number;
    total: number;
  } {
    if (control instanceof FormGroup || control instanceof FormArray) {
      return Object.values(control.controls).reduce(
        (progress, childControl) => {
          const childProgress = this.getRequiredControlProgress(childControl);
          progress.completed += childProgress.completed;
          progress.total += childProgress.total;
          return progress;
        },
        { completed: 0, total: 0 },
      );
    }

    const requiresValue =
      control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue);
    if (!requiresValue) return { completed: 0, total: 0 };

    return {
      completed: this.isRequiredControlComplete(control) ? 1 : 0,
      total: 1,
    };
  }

  /**
   * Check if a required control is complete
   */
  private isRequiredControlComplete(control: AbstractControl): boolean {
    if (control.enabled) return control.valid;
    if (control.hasValidator(Validators.requiredTrue)) return control.value === true;

    const value = control.value;
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  /**
   * Add a progress criterion (e.g., form.valid) to the progress counter
   */
  private addProgressCriterion(
    progress: { completed: number; total: number },
    complete: boolean,
  ): void {
    progress.total += 1;
    if (complete) progress.completed += 1;
  }

  /** Called when the user clicks a step in the step indicator. */
  onStepClick(stepIndex: number): void {
    // Cache positionRequested before Step 1 component is destroyed by [hidden]
    if (this.currentStep === 1 && this.projectDetailsComponent?.form) {
      this._positionRequested =
        this.projectDetailsComponent.form.value.positionRequested ?? '';
    }

    if (stepIndex === this.currentStep) return;

    this.validateCurrentStep(false);
    this.checkedSteps.add(this.currentStep);

    // Mark current step as visited with its current validity
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: this.formValid[this.currentStep] || false,
      missingFields: []
    };

    this.currentStep = stepIndex;
  }

  /**
   * Marks all controls on the current step as touched and returns whether
   * the current step's form is valid. Also updates formValid[currentStep].
   */
  validateCurrentStep(markAsTouched: boolean = true): boolean {
    let isValid = true;

    switch (this.currentStep) {
      case 1:
        if (this.projectDetailsComponent?.form?.invalid) {
          if (markAsTouched) this.projectDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 2:
        if (this.studentDetailsComponent?.form?.invalid) {
          if (markAsTouched) this.studentDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 3:
        if (this.declarationComponent?.declarationForm?.invalid) {
          if (markAsTouched) this.declarationComponent.declarationForm.markAllAsTouched();
          isValid = false;
        }
        break;
    }

    this.formValid[this.currentStep] = isValid;
    return isValid;
  }

  /** Called by child components when their form validity changes. */
  updateFormValidity(stepNumber: number, isValid: boolean): void {
    this.formValid[stepNumber] = isValid;
    if (this.stepStatuses[stepNumber - 1]) {
      this.stepStatuses[stepNumber - 1].valid = isValid;
      this.stepStatuses[stepNumber - 1].visited = true;
      this.stepStatuses = [...this.stepStatuses]; // trigger change detection
    }
  }

  onNext(): void {
    // Cache positionRequested before Step 1 component is hidden
    if (this.currentStep === 1 && this.projectDetailsComponent?.form) {
      this._positionRequested =
        this.projectDetailsComponent.form.value.positionRequested ?? '';
    }

    const isValid = this.validateCurrentStep(true);

    // Mark current step as visited
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: isValid,
      missingFields: []
    };
    this.stepStatuses = [...this.stepStatuses];
    this.checkedSteps.add(this.currentStep);

    if (isValid && this.currentStep < this.totalSteps) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPrev(): void {
    // Mark current step as visited before going back
    this.stepStatuses[this.currentStep - 1] = {
      ...this.stepStatuses[this.currentStep - 1],
      visited: true
    };
    this.stepStatuses = [...this.stepStatuses];

    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSaveDraft(): void {
    this.isSaving = true;
    setTimeout(() => {
      this.isSaving = false;
      this.saveSuccess = true;
      setTimeout(() => { this.saveSuccess = false; }, 3000);
    }, 1000);
  }

  onSubmit(): void {
    this.submitAttempted = true;
    this.validateCurrentStep(true);

    // Mark all steps as visited so the step indicator shows error states
    this.stepStatuses = this.stepStatuses.map((status, index) => ({
      ...status,
      visited: true,
      valid: this.formValid[index + 1] || false,
      missingFields: this.formValid[index + 1]
        ? []
        : [`Complete ${this.steps[index].label}`]
    }));
    this.steps.forEach((_, index) => this.checkedSteps.add(index + 1));

    const allValid = Object.values(this.formValid).every(Boolean);
    if (!allValid) {
      this.stepIndicator?.showMissingFieldPrompt();
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      return;
    }

    this.isSubmitting = true;
    const loadingId = this.actionLoading.begin('Submitting RA/GRA application');
    setTimeout(() => {
      this.isSubmitting = false;
      this.actionLoading.end(loadingId);
      this.submitSuccess = true;
    }, 1000);
  }
}
