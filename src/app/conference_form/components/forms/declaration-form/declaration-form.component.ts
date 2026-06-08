import { Component, OnInit, OnDestroy, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';

@Component({
  selector: 'app-declaration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomSubheaderComponent],
  templateUrl: './declaration-form.component.html',
  styleUrl: './declaration-form.component.scss'
})
export class DeclarationFormComponent implements OnInit, OnDestroy {
  @Input() workflow?: ConferenceWorkflowService;
  @Input() isFormReadOnly: boolean = false;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private formStateService: ConferenceFormStateService) {
    // Apply form read-only effect if workflow is provided
    // For Declaration, use canEditDeclaration() which allows hos_application
    effect(() => {
      if (this.workflow?.isFormReadOnly() && !this.canEditDeclaration()) {
        this.form?.disable({ emitEvent: false });
      } else {
        this.form?.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.loadFormState();
  }

  ngOnDestroy() {
    // Save form state before component is destroyed
    this.saveFormState();
  }

  initializeForm() {
    this.form = this.fb.group({
      confirmPresenter: [false, [Validators.requiredTrue]],
      confirmScopusIndexed: [false, [Validators.requiredTrue]],
      confirmNotResignedStaff: [false, [Validators.requiredTrue]],
      confirmJointAuthorship: [false],
      confirmCompliance: [false, [Validators.requiredTrue]],
      confirmPostReturn: [false, [Validators.requiredTrue]],
      agreeToTerms: [false, [Validators.requiredTrue]],
      acknowledgeGrantFunder: [false, [Validators.requiredTrue]]
    });
  }

  /**
   * Load form state from the state service
   */
  private loadFormState() {
    const savedState = this.formStateService.getFormSection('declaration');
    if (savedState) {
      this.form.patchValue(savedState, { emitEvent: false });
    }
  }

  /**
   * Save form state to the state service
   */
  private saveFormState() {
    if (this.form) {
      this.formStateService.saveFormSection('declaration', this.form.getRawValue());
    }
  }

  canEditDeclaration(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission'
    ];
    return allowedStatuses.includes(status);
  }
}
