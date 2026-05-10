import { Component, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';
import { FormMainTitleComponent } from '../shared/components/form-main-title/form-main-title.component';
import { FormWizardNavComponent } from '../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ProjectDetailsComponent } from './components/Project Details/Project Details';
import { StudentDetailsComponent } from './components/Student Details/Student Details';
import { DeclarationComponent } from './components/Declaration/Declaration';
import { RagraWorkflowService, RagraStatus } from './services/ragra-workflow.service';
import { ReviewBlockComponent } from '../rdig_form/components/review-block/review-block.component';

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
    DeclarationComponent,
    ReviewBlockComponent
  ],
  templateUrl: './RA-GRA_form.component.html',
  styleUrl: './RA-GRA_form.component.scss'
})
export class RagraFormComponent {
  workflow = inject(RagraWorkflowService);
  statusControl = new FormControl<RagraStatus>('draft');

  reviewComments = {
    hosComment: new FormControl(''),
    rmcComment: new FormControl(''),
    hrComment: new FormControl('')
  };

  @ViewChild(ProjectDetailsComponent) projectDetailsComponent?: ProjectDetailsComponent;
  @ViewChild(StudentDetailsComponent) studentDetailsComponent?: StudentDetailsComponent;
  @ViewChild(DeclarationComponent) declarationComponent?: DeclarationComponent;

  currentStep = 1;

  steps: WizardStep[] = [
    { label: 'Applicant and Project Details', icon: 'article' },
    { label: 'Student Details', icon: 'person' },
    { label: 'Declaration', icon: 'verified' }
  ];

  stepStatuses: StepStatus[] = [
    { visited: true, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] }
  ];

  /** Tracks validity per step (1-based keys). */
  formValid: { [key: number]: boolean } = { 1: false, 2: false, 3: false };

  submitAttempted = false;
  selectedCommentSection: 'hos' | 'rmc' | 'hr' | null = null;

  /** Cached positionRequested value — set when leaving Step 1 so it survives component destruction. */
  private _positionRequested: 'RA' | 'GRA' | '' = '';

  constructor() {
    // Sync workflow status changes to the form control
    effect(() => {
      const status = this.workflow.status();
      if (this.statusControl.value !== status) {
        this.statusControl.setValue(status, { emitEvent: false });
      }
    });

    // Sync form control changes to workflow
    this.statusControl.valueChanges.subscribe((newStatus) => {
      if (newStatus) {
        this.workflow.status.set(newStatus as RagraStatus);
        // Reset selected comment section when status changes
        this.selectedCommentSection = null;
      }
    });
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  isSaving = false;
  isSubmitting = false;
  saveSuccess = false;
  submitSuccess = false;

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
   * Marks all controls on the current step as touched and returns whether
   * the current step's form is valid. Also updates formValid[currentStep].
   */
  validateCurrentStep(): boolean {
    let isValid = true;

    switch (this.currentStep) {
      case 1:
        if (this.projectDetailsComponent?.form?.invalid) {
          this.projectDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 2:
        if (this.studentDetailsComponent?.form?.invalid) {
          this.studentDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 3:
        if (this.declarationComponent?.declarationForm?.invalid) {
          this.declarationComponent.declarationForm.markAllAsTouched();
          isValid = false;
        }
        break;
    }

    this.formValid[this.currentStep] = isValid;
    return isValid;
  }

  /** Called when the user clicks a step in the step indicator. */
  onStepClick(stepIndex: number): void {
    // Cache positionRequested before Step 1 component is destroyed by *ngIf
    if (this.currentStep === 1 && this.projectDetailsComponent?.form) {
      this._positionRequested =
        this.projectDetailsComponent.form.value.positionRequested ?? '';
    }

    if (stepIndex > this.currentStep) {
      this.validateCurrentStep();
    } else {
      this.validateCurrentStep();
    }

    // Mark current step as visited with its current validity
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: this.formValid[this.currentStep] || false,
      missingFields: []
    };

    this.currentStep = stepIndex;
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
    // Cache positionRequested before Step 1 component is destroyed by *ngIf
    if (this.currentStep === 1 && this.projectDetailsComponent?.form) {
      this._positionRequested =
        this.projectDetailsComponent.form.value.positionRequested ?? '';
    }

    const isValid = this.validateCurrentStep();

    // Mark current step as visited
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: isValid,
      missingFields: []
    };
    this.stepStatuses = [...this.stepStatuses];

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
    this.validateCurrentStep();

    // Mark all steps as visited so the step indicator shows error states
    this.stepStatuses = this.stepStatuses.map((status, index) => ({
      ...status,
      visited: true,
      valid: this.formValid[index + 1] || false
    }));

    const allValid = Object.values(this.formValid).every(Boolean);
    if (!allValid) {
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.submitSuccess = true;
    }, 1000);
  }

  toggleCommentSection(section: 'hos' | 'rmc' | 'hr') {
    if (this.selectedCommentSection === section) {
      this.selectedCommentSection = null;
    } else {
      this.selectedCommentSection = section;
    }
  }
}
