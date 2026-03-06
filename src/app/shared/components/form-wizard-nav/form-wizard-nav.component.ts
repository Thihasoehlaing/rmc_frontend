import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-wizard-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-wizard-nav.component.html',
  styleUrls: ['./form-wizard-nav.component.scss']
})
export class FormWizardNavComponent {
  /** Current step (1-based) */
  @Input() currentStep = 1;
  /** Total number of steps */
  @Input() totalSteps = 1;
  /** Disable Save Draft button (e.g. while saving) */
  @Input() isSaving = false;
  /** Disable Submit button */
  @Input() isSubmitting = false;
  /** Hide the submit button until last step */
  @Input() showSubmit = false;

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<void>();

  get isFirstStep() { return this.currentStep === 1; }
  get isLastStep()  { return this.currentStep === this.totalSteps; }
}
