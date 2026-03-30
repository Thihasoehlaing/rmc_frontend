import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JournalDetails } from './components/journal-details/journal-details';
import { AuthorsDetails } from './components/authors-details/authors-details';
import { DocumentsComponent } from './components/documents/documents';
import { DeclarationComponent } from './components/declaration/declaration';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [CommonModule, JournalDetails, AuthorsDetails, DocumentsComponent, DeclarationComponent, StepIndicatorComponent],
  templateUrl: './journal-publication-form.component.html',
  styleUrl: './journal-publication-form.component.scss',
})
export class JournalPublicationFormComponent {
  currentStep: number = 1;

  steps: WizardStep[] = [
    { label: 'Journal Details', icon: 'looks_one' },
    { label: 'Authors Details', icon: 'looks_two' },
    { label: 'Upload Supporting Documents & Manuscript Details', icon: 'looks_3' },
    { label: 'Declaration', icon: 'looks_4' }
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
}