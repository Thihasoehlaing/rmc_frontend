import { Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JournalDetails, AuthorsDetails, DocumentsComponent, DeclarationComponent, StepIndicatorComponent, FormMainTitleComponent, FormWizardNavComponent, ReviewBlockComponent],
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

  onStepClick(stepIndex: number) {
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
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  isSaving = false;
  isSubmitting = false;

  onNext() {
    if (this.currentStep < this.totalSteps) {
      this.onStepClick(this.currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPrev() {
    if (this.currentStep > 1) {
      this.onStepClick(this.currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      alert('Form submitted successfully!');
    }, 1000);
  }

  onTestStatusChange(newStatus: any) {
    this.workflow.status.set(newStatus as JournalStatus);
    // Reset selected comment section when status changes
    this.selectedCommentSection = null;
  }

  selectedCommentSection: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo' | null = null;

  toggleCommentSection(section: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo') {
    if (this.selectedCommentSection === section) {
      this.selectedCommentSection = null;
    } else {
      this.selectedCommentSection = section;
    }
  }
}