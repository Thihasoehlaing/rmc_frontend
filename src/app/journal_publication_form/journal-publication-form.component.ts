import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JournalDetails } from './components/journal-details/journal-details';
import { AuthorsDetails } from './components/authors-details/authors-details';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [CommonModule, JournalDetails, AuthorsDetails, StepIndicatorComponent],
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

  onStepClick(stepIndex: number) {
    this.currentStep = stepIndex;
  }
}