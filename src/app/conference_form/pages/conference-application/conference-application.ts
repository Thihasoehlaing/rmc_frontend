import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ConferenceGuidelinesModalComponent } from '../../components/conference-guidelines-modal/conference-guidelines-modal.component';
import { ConferenceDetailsFormComponent } from '../../components/forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../../components/forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../../components/forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../../components/forms/declaration-form/declaration-form.component';
import { ReviewBlockComponent } from '../../../rdig_form/components/review-block/review-block.component';
import { ConferenceWorkflowService } from '../../services/conference-workflow.service';
import { AuthService } from '../../../services/auth.service';

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
    DeclarationFormComponent,
    ReviewBlockComponent
  ],
  template: `
    <div class="conference-wizard">
      <app-conference-guidelines-modal></app-conference-guidelines-modal>

      <!-- DEV TEST START: Application Status Override -->
      <div class="dev-test-override">
        <label class="dev-test-override__label">DEV TEST: Application Status</label>
        <select
          [formControl]="fc('metadata.applicationStatus')"
          (change)="onTestStatusChange($any($event.target).value)"
          class="dev-test-override__select">
          <option value="normal_application">normal_application</option>
          <option value="hos_application">hos_application</option>
          <option value="hos_request_resubmission">hos_request_resubmission</option>
          <option value="rmc_request_resubmission">rmc_request_resubmission</option>
          <option value="hos_pending">hos_pending</option>
          <option value="hos_reject">hos_reject</option>
          <option value="rmc_pending">rmc_pending</option>
          <option value="rmc_reject">rmc_reject</option>
          <option value="vc_pending">vc_pending</option>
          <option value="vc_reject">vc_reject</option>
          <option value="hr_pending">hr_pending</option>
          <option value="hr_reject">hr_reject</option>
          <option value="Approved">Approved</option>
        </select>
        <span class="dev-test-override__hint">(Live ABAC override for developer testing)</span>
      </div>

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
              placeholder="Ex: Jessica Teh Sze Hui"
              readonly>
          </div>
          <div class="detail-field">
            <label class="detail-label">Email</label>
            <input
              type="email"
              class="input--text"
              formControlName="email"
              placeholder="TPXXXXXX@mail.apu.edu.my"
              readonly>
          </div>
          <div class="detail-field">
            <label class="detail-label">School Name</label>
            <input
              type="text"
              class="input--text"
              formControlName="schoolName"
              placeholder="Ex: School of Culinary Arts and Hospitality"
              readonly>
          </div>
        </form>
      </div>

      <!-- Main Form Section with Shadow -->
      <div class="main-section">
        <!-- Comment Toggle Buttons (shown per ABAC status) -->
        @if (workflow.showHosToggle() || workflow.showRmcToggle() ||
             workflow.showVcToggle() || workflow.showHrToggle()) {
          <div class="comment-toggle-bar">

            @if (workflow.showHosToggle()) {
              <button type="button"
                class="btn btn--comment-toggle"
                [class.btn--comment-toggle-active]="showHosComments()"
                (click)="toggleHosComments()">
                <span class="material-icons">supervisor_account</span>
                {{ showHosComments() ? 'Hide HOS Comments' : 'HOS Comments' }}
              </button>
            }

            @if (workflow.showRmcToggle()) {
              <button type="button"
                class="btn btn--comment-toggle"
                [class.btn--comment-toggle-active]="showRmcComments()"
                (click)="toggleRmcComments()">
                <span class="material-icons">verified</span>
                {{ showRmcComments() ? 'Hide RMC Comments' : 'RMC Comments' }}
              </button>
            }

            @if (workflow.showVcToggle()) {
              <button type="button"
                class="btn btn--comment-toggle"
                [class.btn--comment-toggle-active]="showVcComments()"
                (click)="toggleVcComments()">
                <span class="material-icons">account_balance</span>
                {{ showVcComments() ? 'Hide VC Comments' : 'VC Comments' }}
              </button>
            }

            @if (workflow.showHrToggle()) {
              <button type="button"
                class="btn btn--comment-toggle"
                [class.btn--comment-toggle-active]="showHrComments()"
                (click)="toggleHrComments()">
                <span class="material-icons">people</span>
                {{ showHrComments() ? 'Hide HR Comments' : 'HR Comments' }}
              </button>
            }

          </div>
        }

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
              <app-conference-details-form
                [workflow]="workflow"
                [isFormReadOnly]="workflow.isFormReadOnly()">
              </app-conference-details-form>
            }
            @case(2) {
              <app-author-details-form
                [workflow]="workflow"
                [isFormReadOnly]="workflow.isFormReadOnly()">
              </app-author-details-form>
            }
            @case(3) {
              <app-supporting-documents-form
                [workflow]="workflow"
                [isFormReadOnly]="workflow.isFormReadOnly()">
              </app-supporting-documents-form>
            }
            @case(4) {
              <app-declaration-form
                [workflow]="workflow"
                [isFormReadOnly]="workflow.isFormReadOnly()">
              </app-declaration-form>
            }
          }
        </div>

        @if (showAnyComments()) {
          <div class="review-comments-section">
            <div class="review-comments-header">Review Comments</div>

            @if (showHosComments()) {
              <app-review-block
                label="HOS Comment"
                icon="supervisor_account"
                [visible]="true"
                [readonly]="!workflow.isHosEditable()"
                [commentControl]="fc('reviewComments.hosComment')">
              </app-review-block>
            }

            @if (showRmcComments()) {
              <app-review-block
                label="RMC Comment"
                icon="verified"
                [visible]="true"
                [readonly]="!workflow.isRmcEditable()"
                [commentControl]="fc('reviewComments.rmcComment')">
              </app-review-block>
            }

            @if (showVcComments()) {
              <app-review-block
                label="VC Comment"
                icon="account_balance"
                [visible]="true"
                [readonly]="!workflow.isVcEditable()"
                [commentControl]="fc('reviewComments.vcComment')">
              </app-review-block>
            }

            @if (showHrComments()) {
              <app-review-block
                label="HR Comment"
                icon="people"
                [visible]="true"
                [readonly]="!workflow.isHrEditable()"
                [commentControl]="fc('reviewComments.hrComment')">
              </app-review-block>
            }
          </div>
        }

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

    /* DEV TEST: Application Status Override — temporary styling */
    .dev-test-override {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin: var(--space-6) 0;
      padding: var(--space-2);
      background: var(--color-dev-warning);
      border: 1px solid var(--color-dev-warning-border);
      border-radius: var(--radius-md);
    }

    .dev-test-override__label {
      font-weight: var(--fw-bold);
      color: var(--color-dev-text);
    }

    .dev-test-override__select {
      margin-left: var(--space-2);
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-dev-warning-border);
      border-radius: var(--radius-sm);
    }

    .dev-test-override__hint {
      margin-left: var(--space-2);
      color: var(--color-dev-text);
      font-size: var(--fs-xs);
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
      color: black;
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
      color: black;
      font-size: var(--fs-sm);
    }

    .main-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
    }

    .comment-toggle-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: var(--space-4);
      border-bottom: 1px solid var(--border-default);
      background: var(--color-surface);
    }

    .btn--comment-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }

      &.btn--comment-toggle-active {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .material-icons {
        font-size: 18px; // no token: material icon pixel size
      }
    }

    // NOTE: .input--text is defined globally in _forms.scss
    // Do not redefine locally; use global class directly

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

    .review-comments-section {
      margin-top: var(--space-6);
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
    }

    .review-comments-header {
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      color: black;
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-3);
      border-bottom: 2px solid var(--border-default); // 2px sub-space
    }

  `
})
export class ConferenceApplication implements OnInit {

  workflow = inject(ConferenceWorkflowService);
  private auth = inject(AuthService);

  currentStep = signal(1);
  isSaving = signal(false);
  isSubmitting = signal(false);
  applicantDetailsForm: FormGroup;

  showHosComments = signal(false);
  showRmcComments = signal(false);
  showVcComments = signal(false);
  showHrComments = signal(false);

  showAnyComments = computed(() =>
    this.showHosComments() || this.showRmcComments() ||
    this.showVcComments() || this.showHrComments()
  );

  visitedSteps = new Set<number>([1]);


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

  constructor(private fb: FormBuilder) {
    this.applicantDetailsForm = this.fb.group({
      metadata: this.fb.group({
        applicationStatus: ['fill_application']
      }),
      applicantName: [''],
      email: [''],
      schoolName: [''],
      // Review Comments
      reviewComments: this.fb.group({
        hosComment: ['', Validators.maxLength(500)],
        rmcComment: ['', Validators.maxLength(500)],
        vcComment: ['', Validators.maxLength(500)],
        hrComment: ['', Validators.maxLength(500)]
      })
    });

    effect(() => {
      const readOnly = this.workflow.isFormReadOnly();
      const applicantControls = ['applicantName', 'email', 'schoolName'];
      applicantControls.forEach(name => {
        const ctrl = this.applicantDetailsForm.get(name);
        readOnly ? ctrl?.disable({ emitEvent: false }) : ctrl?.enable({ emitEvent: false });
      });
    });
  }

  /** Helper to get a FormControl from the form */
  fc(path: string): FormControl {
    return this.applicantDetailsForm.get(path) as FormControl;
  }

  /**
   * DEV TEST: Live override for applicationStatus (ABAC testing)
   * Syncs the workflow.status signal whenever the test field changes.
   * Remove this method and the corresponding HTML when test is no longer needed.
   */
  onTestStatusChange(val: string): void {
    this.workflow.status.set(val as any);
  }

  // ── Comment toggles ────────────────────────────────────────────
  toggleHosComments(): void { this.showHosComments.update(v => !v); }
  toggleRmcComments(): void { this.showRmcComments.update(v => !v); }
  toggleVcComments(): void { this.showVcComments.update(v => !v); }
  toggleHrComments(): void { this.showHrComments.update(v => !v); }

  // ── Auto-fill applicant info + sync ABAC attributes to workflow ────
  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user && !this.applicantDetailsForm.get('applicantName')?.value) {
      this.applicantDetailsForm.patchValue({
        applicantName: user.name,
        email: user.email
      });
    }

    // Sync application attributes → workflow service (ABAC)
    const statusCtrl = this.applicantDetailsForm.get('metadata.applicationStatus');
    if (statusCtrl?.value) {
      this.workflow.status.set(statusCtrl.value as any);
    }

    // Listen for status changes
    statusCtrl?.valueChanges.subscribe(val => {
      if (val) this.workflow.status.set(val as any);
    });
  }

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
  }

  submitForm() {
    // TODO: Implement submit form functionality
  }
}
