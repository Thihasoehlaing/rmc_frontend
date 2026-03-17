import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ConferenceGuidelinesModalComponent } from '../../components/conference-guidelines-modal/conference-guidelines-modal.component';
import { ConferenceDetailsFormComponent } from '../../components/forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../../components/forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../../components/forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../../components/forms/declaration-form/declaration-form.component';

@Component({
  selector: 'app-conference-application',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepIndicatorComponent,
    FormWizardNavComponent,
    ConferenceGuidelinesModalComponent,
    ConferenceDetailsFormComponent,
    AuthorDetailsFormComponent,
    SupportingDocumentsFormComponent,
    DeclarationFormComponent
  ],
  template: `
    <div class="conference-wizard">
      <app-conference-guidelines-modal></app-conference-guidelines-modal>

      <!-- Applicant Details Section -->
      <div class="applicant-details">
        <h3 class="applicant-details__title">Applicant Details</h3>
        <form [formGroup]="applicantDetailsForm" class="applicant-details__content">
          <div class="detail-field">
            <label class="detail-label">Applicant Name</label>
            <input
              type="text"
              class="input--text"
              formControlName="applicantName"
              placeholder="Ex: Jessica Teh Sze Hui">
          </div>
          <div class="detail-field">
            <label class="detail-label">Email</label>
            <input
              type="email"
              class="input--text"
              formControlName="email"
              placeholder="TPXXXXXX@mail.apu.edu.my">
          </div>
          <div class="detail-field">
            <label class="detail-label">School Name</label>
            <input
              type="text"
              class="input--text"
              formControlName="schoolName"
              placeholder="Ex: School of Culinary Arts and Hospitality">
          </div>
        </form>
      </div>

      <!-- Main Form Section with Shadow -->
      <div class="main-section">
        <!-- Step Indicator -->
        <app-step-indicator
          [currentStep]="currentStep()"
          [steps]="wizardSteps"
          [stepStatuses]="stepStatuses()"
          (stepClick)="goToStep($event)">
        </app-step-indicator>

        <!-- Form Content -->
        <div class="wizard-content">
          @switch(currentStep()) {
            @case(1) {
              <app-conference-details-form></app-conference-details-form>
            }
            @case(2) {
              <app-author-details-form></app-author-details-form>
            }
            @case(3) {
              <app-supporting-documents-form></app-supporting-documents-form>
            }
            @case(4) {
              <app-declaration-form></app-declaration-form>
            }
          }
        </div>

        <!-- Navigation Buttons -->
        <app-form-wizard-nav
          [currentStep]="currentStep()"
          [totalSteps]="wizardSteps.length"
          [isSaving]="isSaving()"
          [isSubmitting]="isSubmitting()"
          (prev)="previousStep()"
          (next)="nextStep()"
          (saveDraft)="saveDraft()"
          (submitForm)="submitForm()">
        </app-form-wizard-nav>
      </div>
    </div>
  `,
  styles: `
    .conference-wizard {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding: var(--space-4);
    }

    .applicant-details {
      background: var(--color-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: var(--space-4);
    }

    .applicant-details__title {
      margin: 0 0 var(--space-3) 0;
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      color: var(--color-heading);
    }

    .applicant-details__content {
      display: flex;
      gap: var(--space-6);
      flex-wrap: wrap;
    }

    .applicant-details__content {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
    }

    .detail-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .detail-label {
      font-weight: var(--fw-bold);
      color: var(--color-label);
      font-size: var(--fs-sm);
    }

    .main-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
    }

    .input--text {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: var(--fs-sm);
      color: var(--color-text);
      background: var(--color-surface);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(42, 131, 255, 0.1);
      }
    }

    .detail-row {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .detail-value {
      color: var(--color-text);
    }

    .wizard-content {
      flex: 1;
    }

    .btn {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      cursor: pointer;
      border: none;
      transition: all var(--transition-fast);

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn--primary {
      background: var(--color-primary);
      color: white;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }
    }

    .btn--secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--border-default);

      &:hover:not(:disabled) {
        background: var(--color-surface-hover);
      }
    }
  `
})
export class ConferenceApplication {
  currentStep = signal(1);
  isSaving = signal(false);
  isSubmitting = signal(false);
  applicantDetailsForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.applicantDetailsForm = this.fb.group({
      applicantName: [''],
      email: [''],
      schoolName: ['']
    });
  }

  wizardSteps: WizardStep[] = [
    { label: 'Conference Details', icon: 'info' },
    { label: 'Author Details', icon: 'person' },
    { label: 'Documents', icon: 'description' },
    { label: 'Declaration', icon: 'check_circle' }
  ];

  stepStatuses = signal<StepStatus[]>([
    { visited: true, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] }
  ]);

  goToStep(step: number) {
    this.currentStep.set(step);
    this.markStepVisited(step);
  }

  nextStep() {
    if (this.currentStep() < this.wizardSteps.length) {
      this.currentStep.update(step => step + 1);
      this.markStepVisited(this.currentStep());
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  private markStepVisited(step: number) {
    this.stepStatuses.update(statuses => {
      const updated = [...statuses];
      if (updated[step - 1]) {
        updated[step - 1].visited = true;
      }
      return updated;
    });
  }

  saveDraft() {
    // TODO: Implement save draft functionality
    console.log('Save draft triggered at step', this.currentStep());
  }

  submitForm() {
    // TODO: Implement submit form functionality
    console.log('Submit form triggered');
  }
}
