import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../../../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ConferenceGuidelinesModalComponent } from '../../components/conference-guidelines-modal/conference-guidelines-modal.component';
import { FormMainTitleComponent } from '../../../../shared/components/form-main-title/form-main-title.component';
import { ConferenceDetailsFormComponent } from '../../components/forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../../components/forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../../components/forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../../components/forms/declaration-form/declaration-form.component';
import { ReviewBlockComponent } from '../../../rdig/components/review-block/review-block.component';
import { ConferenceWorkflowService } from '../../services/conference-workflow.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { GuidelineContext } from '../../../../shared/components/form-main-title/form-main-title.component';

@Component({
  selector: 'app-conference-application',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepIndicatorComponent,
    FormWizardNavComponent,
    FormMainTitleComponent,
    ConferenceGuidelinesModalComponent,
    ConferenceDetailsFormComponent,
    AuthorDetailsFormComponent,
    SupportingDocumentsFormComponent,
    DeclarationFormComponent,
    ReviewBlockComponent
  ],
  template: `
    <div class="conference-wizard application-form-page">
      <app-form-main-title
        #conferenceFormTitle
        title="Conference Application"
        modalTitle="Guidelines for Applicants"
        [guidelineContext]="guidelineContext"
        [customModal]="true"
        (helpClick)="openGuidelines()">
      </app-form-main-title>

      <app-conference-guidelines-modal
        #guidelinesModal
        (closed)="conferenceFormTitle.onGuidelinesClosed()">
      </app-conference-guidelines-modal>

      <app-step-indicator
        [currentStep]="currentStep()"
        [steps]="wizardSteps"
        [stepStatuses]="stepStatuses()"
        [submitAttempted]="submitAttempted()"
        (stepClick)="goToStep($event)">
      </app-step-indicator>

      <!-- DEV TEST START: Application Status Override -->
      <div class="dev-test-override application-form-dev-tools">
        <label class="dev-test-override__label application-form-dev-tools__label">DEV TEST: Application Status</label>
        <select
          [formControl]="fc('metadata.applicationStatus')"
          (change)="onTestStatusChange($any($event.target).value)"
          class="dev-test-override__select input--select application-form-dev-tools__control">
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
      <div class="applicant-details application-form-surface">
        <h3 class="applicant-details__title">Applicant Details</h3>
        <form [formGroup]="applicantDetailsForm" class="applicant-details__content">
          <div class="detail-field">
            <label class="detail-label is-required">Applicant Name</label>
            <input
              type="text"
              class="input--text input--disabled-readonly"
              formControlName="applicantName"
              placeholder="Ex: Jessica Teh Sze Hui"
              readonly>
          </div>
          <div class="detail-field">
            <label class="detail-label is-required">Applicant Email</label>
            <input
              type="email"
              class="input--text input--disabled-readonly"
              formControlName="email"
              placeholder="TPXXXXXX@mail.apu.edu.my"
              readonly>
          </div>
          <div class="detail-field">
            <label class="detail-label is-required">Applicant School / Department</label>
            <input
              type="text"
              class="input--text input--disabled-readonly"
              formControlName="schoolName"
              placeholder="Ex: School of Culinary Arts and Hospitality"
              readonly>
          </div>
        </form>
      </div>

      <!-- Main Form Section with Shadow -->
      <div class="main-section application-form-content">
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

        <!-- Form Content -->
        <div class="wizard-content application-form-surface">
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
      gap: var(--space-5);
      width: 100%;
      max-width: var(--page-max-width);
      margin: 0 auto;
      padding: var(--space-4) 0;
      box-sizing: border-box;

      @media (max-width: 768px) {
        gap: var(--space-4);
        padding: var(--space-3) 0;
      }
    }

    /* DEV TEST: Application Status Override — temporary styling */
    .dev-test-override {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-3);
      margin: var(--space-4) 0 0;
      padding: var(--space-2);
      background: var(--color-warning-light);
      border: 1px solid color-mix(in srgb, var(--color-warning) 35%, var(--color-surface));
      border-radius: var(--radius-md);
    }

    .dev-test-override__label {
      font-weight: var(--fw-bold);
      color: var(--color-dev-text);
    }

    .dev-test-override__select {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-dev-warning-border);
      border-radius: var(--radius-sm);
    }

    .dev-test-override__hint {
      color: var(--color-dev-text);
      font-size: var(--fs-xs);
    }

    .applicant-details {
      background: var(--color-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-5);
      box-shadow: var(--shadow-sm);

      @media (max-width: 768px) {
        padding: var(--space-4);
      }
    }

    .applicant-details__title {
      margin: 0 0 var(--space-4) 0;
      font-size: var(--fs-base);
      font-weight: var(--fw-bold);
      color: var(--color-heading);
    }

    .applicant-details__content {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);

      @media (max-width: 1024px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .detail-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
    }

    .detail-label {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      line-height: var(--line-height-control);
    }

    .detail-label.is-required::after {
      content: ' *';
      color: var(--color-error-dark);
    }

    .input--disabled-readonly {
      background: var(--color-surface-nested);
      border-color: var(--border-default);
      color: var(--color-text-muted);
      cursor: not-allowed;
      opacity: 1;
    }

    .main-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .comment-toggle-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      justify-content: flex-end;
      max-width: 100%;
      padding: 0;
    }

    .btn--comment-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: var(--input-height-sm);
      padding: 0 var(--space-5);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-light);
      }

      &.btn--comment-toggle-active {
        background: var(--color-primary);
        color: var(--button-color-primary);
        border-color: var(--color-primary);

        .material-icons {
          color: var(--button-color-primary);
        }

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          border-color: var(--color-primary-hover);
          color: var(--button-color-primary);
        }
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
      padding: var(--space-4);
      animation: stepFadeIn var(--transition-base) ease;
    }

    .review-comments-section {
      padding: var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);

      @media (max-width: 768px) {
        padding: var(--space-4);
      }
    }

    .review-comments-header {
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      color: var(--color-heading);
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-3);
      border-bottom: 2px solid var(--border-default); // 2px sub-space
    }

    @keyframes stepFadeIn {
      from {
        opacity: 0;
        transform: translateY(var(--space-2));
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

  `
})
export class ConferenceApplication implements OnInit {

  workflow = inject(ConferenceWorkflowService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  readonly guidelineContext: GuidelineContext =
    this.route.snapshot.queryParamMap.has('id') ? 'existing-application' : 'new-application';
  @ViewChild('guidelinesModal') guidelinesModal?: ConferenceGuidelinesModalComponent;

  currentStep = signal(1);
  submitAttempted = signal(false);
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

  checkedSteps = new Set<number>();


  wizardSteps: WizardStep[] = [
    { label: 'Conference Details', icon: 'info' },
    { label: 'Author Details', icon: 'person' },
    { label: 'Documents', icon: 'description' },
    { label: 'Declaration', icon: 'check_circle' }
  ];

  stepStatuses = signal<StepStatus[]>([
    { visited: false, valid: false, missingFields: ['Complete Conference Details'] },
    { visited: false, valid: false, missingFields: ['Complete Author Details'] },
    { visited: false, valid: false, missingFields: ['Upload required documents'] },
    { visited: false, valid: false, missingFields: ['Complete Declaration'] }
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

  openGuidelines(): void {
    this.guidelinesModal?.open();
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
        email: user.email,
        schoolName: user.department
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
    if (step !== this.currentStep()) {
      this.markStepChecked(this.currentStep());
    }
    this.currentStep.set(step);
  }

  nextStep() {
    if (this.currentStep() < this.wizardSteps.length) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  private markStepChecked(step: number) {
    this.checkedSteps.add(step);
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
    this.submitAttempted.set(true);
    console.log('Submit form triggered');
  }
}
