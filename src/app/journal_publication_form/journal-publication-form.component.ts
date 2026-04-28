import { Component, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JournalDetails } from './components/journal-details/journal-details';
import { AuthorsDetails } from './components/authors-details/authors-details';
import { DocumentsComponent } from './components/documents/documents';
import { DeclarationComponent } from './components/declaration/declaration';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';
import { FormMainTitleComponent } from '../shared/components/form-main-title/form-main-title.component';
import { FormWizardNavComponent } from '../shared/components/form-wizard-nav/form-wizard-nav.component';
import { JournalWorkflowService, JournalStatus } from './services/journal-workflow.service';
import { ReviewBlockComponent } from '../rdig_form/components/review-block/review-block.component';
import { JournalGuidelinesModalComponent } from './components/journal-guidelines-modal/journal-guidelines-modal.component';

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JournalDetails, AuthorsDetails, DocumentsComponent, DeclarationComponent, StepIndicatorComponent, FormMainTitleComponent, FormWizardNavComponent, ReviewBlockComponent, JournalGuidelinesModalComponent],
  templateUrl: './journal-publication-form.component.html',
  styleUrl: './journal-publication-form.component.scss',
})
export class JournalPublicationFormComponent {
  workflow = inject(JournalWorkflowService);
  statusControl = new FormControl<JournalStatus>('draft');

  reviewComments = {
    hosComment: new FormControl(''),
    rmcComment: new FormControl(''),
    vcComment: new FormControl(''),
    hrComment: new FormControl(''),
    ceoComment: new FormControl('')
  };

  @ViewChild(JournalDetails) journalDetailsComponent?: JournalDetails;
  @ViewChild(AuthorsDetails) authorsDetailsComponent?: AuthorsDetails;
  @ViewChild(DocumentsComponent) documentsComponent?: DocumentsComponent;
  @ViewChild(DeclarationComponent) declarationComponent?: DeclarationComponent;

  currentStep: number = 1;

  steps: WizardStep[] = [
    { label: 'Journal Details', icon: 'article' },
    { label: 'Authors Details', icon: 'group' },
    { label: 'Upload Supporting Documents & Manuscript Details', icon: 'upload_file' },
    { label: 'Declaration', icon: 'verified' }
  ];

  stepStatuses: StepStatus[] = [
    { visited: true, valid: true, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] }
  ];

  // Track form valid states
  formValid: { [key: number]: boolean } = {
    1: false,
    2: false,
    3: false,
    4: false
  };

  submitAttempted = false;
  selectedCommentSection: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo' | null = null;

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
        this.workflow.status.set(newStatus as JournalStatus);
        // Reset selected comment section when status changes
        this.selectedCommentSection = null;
      }
    });
  }

  validateCurrentStep(markAsTouched: boolean = true): boolean {
    let isValid = true;
    switch (this.currentStep) {
      case 1:
        if (this.journalDetailsComponent && this.journalDetailsComponent.form?.invalid) {
          if (markAsTouched) this.journalDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 2:
        if (this.authorsDetailsComponent && this.authorsDetailsComponent.form?.invalid) {
          if (markAsTouched) this.authorsDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 3:
        if (this.documentsComponent && this.documentsComponent.documentsForm?.invalid) {
          if (markAsTouched) this.documentsComponent.documentsForm.markAllAsTouched();
          isValid = false;
        }
        break;
      case 4:
        if (this.declarationComponent && this.declarationComponent.declarationForm?.invalid) {
          if (markAsTouched) this.declarationComponent.declarationForm.markAllAsTouched();
          isValid = false;
        }
        break;
    }
    
    this.formValid[this.currentStep] = isValid;
    return isValid;
  }

  onStepClick(stepIndex: number) {
    if (stepIndex > this.currentStep) {
      this.validateCurrentStep(true);
    } else {
      this.validateCurrentStep(false);
    }

    // Mark current step as visited
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: this.formValid[this.currentStep] || false, // Yellow if invalid, Green if valid
      missingFields: []
    };

    // Move to the new step
    this.currentStep = stepIndex;
  }

  // Call this from child components when their form changes
  updateFormValidity(stepNumber: number, isValid: boolean) {
    this.formValid[stepNumber] = isValid;
    if (this.stepStatuses[stepNumber - 1]) {
      this.stepStatuses[stepNumber - 1].valid = isValid;
      // Mark as visited instantly as well, so it updates to green if valid
      this.stepStatuses[stepNumber - 1].visited = true;
      this.stepStatuses = [...this.stepStatuses]; // Trigger change detection
    }
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  isSaving = false;
  isSubmitting = false;

  onNext() {
    if (this.currentStep < this.totalSteps) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep + 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onPrev() {
    if (this.currentStep > 1) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep - 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onSaveDraft() {
    this.isSaving = true;
    setTimeout(() => {
      this.isSaving = false;
      alert('Draft saved successfully!');
    }, 1000);
  }

  onSubmit() {
    this.submitAttempted = true;
    this.validateCurrentStep(true);

    this.stepStatuses = this.stepStatuses.map((status, index) => ({
      ...status,
      visited: true,
      valid: this.formValid[index + 1] || false,
    }));

    const allValid = Object.values(this.formValid).every(Boolean);
    if (!allValid) {
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      alert('Form submitted successfully!');
    }, 1000);
  }

  toggleCommentSection(section: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo') {
    if (this.selectedCommentSection === section) {
      this.selectedCommentSection = null;
    } else {
      this.selectedCommentSection = section;
    }
  }
}