import { Component } from '@angular/core';
import { JournalDetails } from './components/journal-details/journal-details';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../shared/components/step-indicator/step-indicator.component';

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [JournalDetails, StepIndicatorComponent],
  templateUrl: './journal-publication-form.component.html',
  styleUrl: './journal-publication-form.component.scss',
})
export class JournalPublicationFormComponent {
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
}