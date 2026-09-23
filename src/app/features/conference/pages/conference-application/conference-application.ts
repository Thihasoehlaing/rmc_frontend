import { Component, signal, computed, effect, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Observable, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  StepIndicatorComponent,
  WizardStep,
  StepStatus,
  MissingField,
} from '../../../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { FormMainTitleComponent } from '../../../../shared/components/form-main-title/form-main-title.component';
import { ConferenceDetailsFormComponent } from '../../components/forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../../components/forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../../components/forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../../components/forms/declaration-form/declaration-form.component';
import {
  ConferenceWorkflowService,
  ConferenceStatus,
} from '../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../services/conference-form-state.service';
import {
  ConferenceApiService,
  ConferenceFormData,
  ConferenceRequestDto,
} from '../../services/conference-api.service';
import { MasterDataService, CodeOption } from '../../../../core/services/master-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GuidelineContext } from '../../../../shared/components/form-main-title/form-main-title.component';
import { FormPageSkeletonComponent } from '../../../../shared/components/form-page-skeleton/form-page-skeleton.component';
import { FormValidationWarningDialogComponent } from '../../../../shared/components/form-validation-warning-dialog/form-validation-warning-dialog.component';
import {
  RequestCommentDto,
  WorkflowRequestsService,
} from '../../../../core/services/workflow-requests.service';
import { environment } from '../../../../../environments/environment';
import { ActionLoadingService } from '../../../../core/services/action-loading.service';
import {
  formatCountryForDisplay,
  normalizeCountryForStorage,
} from '../../../../shared/utils/country.util';
import { formatDisplayDateTime } from '../../../../shared/utils/date-time.util';

@Component({
  selector: 'app-conference-application',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepIndicatorComponent,
    FormWizardNavComponent,
    FormMainTitleComponent,
    ConferenceDetailsFormComponent,
    AuthorDetailsFormComponent,
    SupportingDocumentsFormComponent,
    DeclarationFormComponent,
    FormPageSkeletonComponent,
    FormValidationWarningDialogComponent,
  ],
  template: `
    @if (isLoadingApplication()) {
      <app-form-page-skeleton></app-form-page-skeleton>
    } @else {
      <div class="conference-wizard application-form-page">
        <app-form-main-title
          title="Conference Application"
          modalTitle="Guidelines for Applicants"
          [guidelineContext]="guidelineContext"
          [endpoint]="guidelinesEndpoint"
        >
        </app-form-main-title>

        <app-step-indicator
          [currentStep]="currentStep()"
          [steps]="wizardSteps"
          [stepStatuses]="getStepStatuses()"
          [submitAttempted]="submitAttempted()"
          (stepClick)="goToStep($event)"
          (missingFieldClick)="goToMissingField($event)"
        >
        </app-step-indicator>

        @if (hasExistingRequestParam && (isLoadingSectionComments() || sectionComments().length)) {
          <section
            class="applicant-section-comments application-form-surface"
            aria-label="Reviewer section comments"
          >
            <div class="applicant-section-comments__header">
              <div class="applicant-section-comments__icon">
                <span class="material-icons" aria-hidden="true">reviews</span>
              </div>
              <div>
                <p class="applicant-section-comments__eyebrow">Reviewer feedback</p>
                <h2>Section Comments</h2>
                <p>Use these comments as your checklist before resubmitting the application.</p>
              </div>
            </div>

            @if (isLoadingSectionComments()) {
              <div class="applicant-section-comments__loading">Loading reviewer comments...</div>
            } @else {
              <div class="applicant-section-comments__actors" aria-label="Reviewer feedback actors">
                @for (actor of actorTabsWithComments(); track actor.code) {
                  <button
                    type="button"
                    class="applicant-comment-actor"
                    [class.applicant-comment-actor--active]="
                      selectedFeedbackActorCode() === actor.code
                    "
                    (click)="toggleFeedbackActor(actor.code)"
                  >
                    <span class="material-icons" aria-hidden="true">{{ actor.icon }}</span>
                    <span>{{ actor.label }}</span>
                    <small>{{ actorCommentCount(actor.code) }}</small>
                  </button>
                }
              </div>

              <div class="applicant-section-comments__grid">
                @for (
                  section of sectionsWithCommentsForActor(selectedFeedbackActorCode());
                  track section.code
                ) {
                  <article class="applicant-comment-section">
                    <header>
                      <span class="material-icons" aria-hidden="true">{{ section.icon }}</span>
                      <div>
                        <h3>{{ section.label }}</h3>
                        <small>
                          {{
                            commentsForActorSection(selectedFeedbackActorCode(), section.code)
                              .length
                          }}
                          comment(s)
                        </small>
                      </div>
                    </header>
                    <div class="applicant-comment-section__list">
                      @for (
                        comment of commentsForActorSection(
                          selectedFeedbackActorCode(),
                          section.code
                        );
                        track comment.id
                      ) {
                        <div class="applicant-comment">
                          <div class="applicant-comment__meta">
                            <strong>{{
                              comment.staff_name || comment.staff_username || 'Reviewer'
                            }}</strong>
                            <span>
                              {{ prettyActor(comment.actor_type_code) }} ·
                              {{ formatCommentDate(comment.created_at) }}
                            </span>
                          </div>
                          <p>{{ comment.comment_text }}</p>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }

        <!-- Main Form Section with Shadow -->
        <div class="main-section application-form-content">
          <!-- Form Content -->
          <div class="wizard-content application-form-surface">
            @switch (currentStep()) {
              @case (1) {
                <app-conference-details-form
                  #conferenceDetailsStep
                  [workflow]="workflow"
                  [applicantDetailsForm]="applicantDetailsForm"
                  [isFormReadOnly]="isEffectiveFormReadOnly()"
                >
                </app-conference-details-form>
              }
              @case (2) {
                <app-author-details-form
                  #authorDetailsStep
                  [workflow]="workflow"
                  [isFormReadOnly]="isEffectiveFormReadOnly()"
                >
                </app-author-details-form>
              }
              @case (3) {
                <app-supporting-documents-form
                  #supportingDocumentsStep
                  [workflow]="workflow"
                  [isFormReadOnly]="isEffectiveFormReadOnly()"
                >
                </app-supporting-documents-form>
              }
              @case (4) {
                <app-declaration-form
                  #declarationStep
                  [workflow]="workflow"
                  [isFormReadOnly]="isEffectiveFormReadOnly()"
                >
                </app-declaration-form>
              }
            }
          </div>

          <!-- Submission feedback -->
          @if (submissionErrorMessage()) {
            <p class="submission-error">{{ submissionErrorMessage() }}</p>
          }

          @if (isAdminReadOnlyDraft()) {
            <p class="submission-error submission-info">
              System Admin view only. This draft can be inspected, but cannot be saved or submitted.
            </p>
          }

          <app-form-validation-warning-dialog
            [isOpen]="showMissingFieldsWarning()"
            (close)="onMissingFieldsWarningClosed()"
          ></app-form-validation-warning-dialog>

          <!-- Navigation Buttons -->
          <app-form-wizard-nav
            [currentStep]="currentStep()"
            [totalSteps]="wizardSteps.length"
            [isSaving]="isSaving()"
            [isSubmitting]="isSubmitting()"
            [readOnly]="isEffectiveFormReadOnly()"
            (prev)="previousStep()"
            (next)="nextStep()"
            (saveDraft)="saveDraft()"
            (submitForm)="submitForm()"
          >
          </app-form-wizard-nav>
        </div>
      </div>
    }
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

    .main-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .applicant-section-comments {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
      border: 1px solid color-mix(in srgb, var(--color-warning) 34%, var(--border-default));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-warning) 10%, var(--color-surface)) 0%,
        var(--color-surface) 68%
      );
      box-shadow: var(--shadow-sm);
    }

    .applicant-section-comments__header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);

      h2,
      p {
        margin: 0;
      }

      h2 {
        color: var(--color-heading);
        font-size: var(--fs-xl);
        font-weight: var(--fw-bold);
      }

      p:not(.applicant-section-comments__eyebrow) {
        margin-top: var(--space-1);
        color: var(--color-text-secondary);
        font-size: var(--fs-sm);
        line-height: var(--lh-relaxed);
      }
    }

    .applicant-section-comments__icon {
      display: inline-grid;
      flex: 0 0 auto;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning) 14%, var(--color-surface));
    }

    .applicant-section-comments__eyebrow {
      color: var(--color-warning);
      font-size: var(--fs-xs);
      font-weight: var(--fw-bold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .applicant-section-comments__loading {
      padding: var(--space-4);
      border: 1px dashed color-mix(in srgb, var(--color-warning) 35%, var(--border-default));
      border-radius: var(--radius-lg);
      color: var(--color-text-secondary);
      background: color-mix(in srgb, var(--color-warning) 6%, var(--color-surface));
    }

    .applicant-section-comments__actors {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .applicant-comment-actor {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 46px;
      padding: 0 var(--space-4);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      box-shadow: var(--shadow-xs);

      small {
        display: inline-grid;
        place-items: center;
        min-width: 22px;
        height: 22px;
        padding: 0 var(--space-2);
        border-radius: var(--radius-full);
        background: var(--color-background-secondary);
        color: var(--color-text-muted);
        font-size: var(--fs-xs);
        font-weight: var(--fw-bold);
      }

      &:hover,
      &.applicant-comment-actor--active {
        border-color: var(--color-primary);
        color: var(--button-color-primary);
        background: var(--color-primary);
      }
    }

    .applicant-section-comments__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      gap: var(--space-4);
    }

    .applicant-comment-section {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      background: var(--color-surface);

      header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      h3,
      small {
        margin: 0;
      }

      h3 {
        color: var(--color-heading);
        font-size: var(--fs-md);
        font-weight: var(--fw-semibold);
      }

      small {
        color: var(--color-text-muted);
        font-size: var(--fs-xs);
      }
    }

    .applicant-comment-section__list {
      display: grid;
      gap: var(--space-2);
    }

    .applicant-comment {
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-background-secondary);

      p {
        margin: var(--space-2) 0 0;
        color: var(--color-text);
        font-size: var(--fs-sm);
        line-height: var(--lh-relaxed);
        white-space: pre-wrap;
      }
    }

    .applicant-comment__meta {
      display: grid;
      gap: 2px;

      strong {
        color: var(--color-heading);
        font-size: var(--fs-sm);
      }

      span {
        color: var(--color-text-muted);
        font-size: var(--fs-xs);
      }
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

    .submission-error {
      color: var(--color-error-dark, #b91c1c);
      font-size: var(--fs-sm);
      margin: 0;
    }

    .submission-info {
      color: var(--color-primary);
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
  `,
})
export class ConferenceApplication implements OnInit {
  workflow = inject(ConferenceWorkflowService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private conferenceApi = inject(ConferenceApiService);
  private workflowRequests = inject(WorkflowRequestsService);
  private formStateService = inject(ConferenceFormStateService);
  private masterData = inject(MasterDataService);
  private actionLoading = inject(ActionLoadingService);
  readonly hasExistingRequestParam = this.route.snapshot.queryParamMap.has('request_id');
  readonly guidelineContext: GuidelineContext = this.route.snapshot.queryParamMap.has('request_id')
    ? 'existing-application'
    : 'new-application';
  readonly guidelinesEndpoint = `${environment.apiUrl}/admin-settings/guidelines/forms/CONFERENCE`;
  @ViewChild('conferenceDetailsStep') conferenceDetailsStep?: ConferenceDetailsFormComponent;
  @ViewChild(StepIndicatorComponent) stepIndicator?: StepIndicatorComponent;
  @ViewChild('authorDetailsStep') authorDetailsStep?: AuthorDetailsFormComponent;
  @ViewChild('supportingDocumentsStep') supportingDocumentsStep?: SupportingDocumentsFormComponent;
  @ViewChild('declarationStep') declarationStep?: DeclarationFormComponent;

  currentStep = signal(1);
  submitAttempted = signal(false);
  isSaving = signal(false);
  isSubmitting = signal(false);
  isLoadingApplication = signal(false);
  submissionErrorMessage = signal('');
  showMissingFieldsWarning = signal(false);
  isAdminReadOnlyDraft = signal(false);
  readonly isEffectiveFormReadOnly = computed(
    () => this.workflow.isFormReadOnly() || this.isAdminReadOnlyDraft(),
  );
  sectionComments = signal<RequestCommentDto[]>([]);
  isLoadingSectionComments = signal(false);
  selectedFeedbackActorCode = signal<string | null>(null);
  applicantDetailsForm: FormGroup;

  readonly commentSections = [
    { code: 'conference_details', label: 'Conference Details', icon: 'event_note' },
    { code: 'travel_details', label: 'Travel Details', icon: 'flight_takeoff' },
    { code: 'authors', label: 'Authors', icon: 'group' },
    { code: 'supporting_documents', label: 'Supporting Documents', icon: 'upload_file' },
    { code: 'costing_sponsorship', label: 'Costing & Sponsorship', icon: 'payments' },
  ];

  readonly commentActors = [
    { code: 'HOS_HOD', label: 'HOS Comments', icon: 'groups' },
    { code: 'RMC', label: 'RMC Comments', icon: 'verified' },
    { code: 'VC', label: 'VC Comments', icon: 'account_balance' },
    { code: 'HR', label: 'HR Comments', icon: 'people' },
    { code: 'CEO', label: 'CEO Comments', icon: 'stars' },
  ];

  showHosComments = signal(false);
  showRmcComments = signal(false);
  showVcComments = signal(false);
  showHrComments = signal(false);

  showAnyComments = computed(
    () =>
      this.showHosComments() ||
      this.showRmcComments() ||
      this.showVcComments() ||
      this.showHrComments(),
  );

  checkedSteps = new Set<number>();

  wizardSteps: WizardStep[] = [
    { label: 'Conference Details', icon: 'info' },
    { label: 'Author Details', icon: 'person' },
    { label: 'Documents', icon: 'description' },
    { label: 'Declaration', icon: 'check_circle' },
  ];

  private readonly applicantDetailsFieldChecks: Array<{
    path: string;
    label: string;
    target?: string;
  }> = [
    { path: 'applicantName', label: 'Applicant Name' },
    { path: 'email', label: 'Applicant Email' },
    { path: 'schoolName', label: 'Applicant School / Department' },
  ];

  private readonly conferenceDetailsFieldChecks: Array<{
    path: string;
    label: string;
    target?: string;
  }> = [
    { path: 'fundingRequestType', label: 'Conference Funding Request Type' },
    { path: 'conferenceType', label: 'Conference Type' },
    { path: 'travelRequired', label: 'Is Travelling Required?' },
    { path: 'bookingDoneBy', label: 'Booking Done By' },
    { path: 'bookingDoneByOther', label: 'Booking Responsible Person' },
    { path: 'hasAdvance', label: 'Is There an Advance?' },
    { path: 'advanceReason', label: 'Advance Reason' },
    { path: 'hasColleagues', label: 'Colleagues Involved' },
    { path: 'selectedColleagues', label: 'Select Colleagues' },
    { path: 'authorshipType', label: 'Author Role' },
    { path: 'scopusPublicationGuaranteed', label: 'SCOPUS Indexed Publication' },
    { path: 'restrictedPublisher', label: 'Restricted Publisher' },
    { path: 'sdgKeyword1', label: 'Please key in 3 SDG keywords', target: 'sdgKeywords' },
    { path: 'sdgKeyword2', label: 'Please key in 3 SDG keywords', target: 'sdgKeywords' },
    { path: 'sdgKeyword3', label: 'Please key in 3 SDG keywords', target: 'sdgKeywords' },
    { path: 'conferenceName', label: 'Conference Name' },
    { path: 'conferenceStartDate', label: 'Conference Start Date' },
    { path: 'conferenceEndDate', label: 'Conference End Date' },
    { path: 'activities', label: 'Conference Schedule - Add Activity', target: 'activityTable' },
    { path: 'localOrOverseas', label: 'Select Conference Venue' },
    { path: 'researchType', label: 'Research Type' },
    { path: 'citedJournalPaper', label: 'Cited APU/JATI/EJBM Paper' },
    { path: 'citedJournalPaperExplanation', label: 'Cited Paper Explanation' },
    { path: 'conferenceLocation', label: 'Conference Location' },
    { path: 'paperTitle', label: 'Paper Title' },
    { path: 'selectedRegion', label: 'Select Region' },
    { path: 'externalProjectAccountCode', label: 'Project Account Code' },
  ];

  private readonly authorDetailsFieldChecks: Array<{
    path: string;
    label: string;
    target?: string;
  }> = [
    { path: 'fullName', label: 'Full Name' },
    { path: 'employeeId', label: 'Employee ID' },
    { path: 'designation', label: 'Designation' },
    { path: 'department', label: 'Department' },
    { path: 'email', label: 'Email' },
    { path: 'phoneNumber', label: 'Phone Number' },
  ];

  private readonly supportingDocumentsFieldChecks: Array<{
    path: string;
    label: string;
    target?: string;
  }> = [
    { path: 'acceptanceNotification', label: 'Acceptance Notification' },
    { path: 'reviewersFeedback', label: 'Reviewers Feedback' },
    { path: 'scopusEvidencePublication', label: 'SCOPUS Evidence Publication' },
    { path: 'sriApproval', label: 'SRI Approval' },
    { path: 'turnitinReport', label: 'Turnitin Report' },
    { path: 'finalPaperDraft', label: 'Final Paper Draft' },
    { path: 'conferenceInvoice', label: 'Conference Invoice' },
    { path: 'manuscriptInternallyReviewed', label: 'Manuscript Internally Reviewed' },
    { path: 'reviewerName', label: 'Reviewer Name' },
    { path: 'manuscriptPreviouslyPublished', label: 'Manuscript Previously Published' },
  ];

  private readonly declarationFieldChecks: Array<{ path: string; label: string; target?: string }> =
    [
      { path: 'agreeToTerms', label: 'Terms Agreement' },
      { path: 'acknowledgeGrantFunder', label: 'Grant Funder Acknowledgement' },
    ];

  constructor(private fb: FormBuilder) {
    this.applicantDetailsForm = this.fb.group({
      metadata: this.fb.group({
        applicationStatus: ['draft'],
        conferenceRequestId: [null], // the real backend's conference request id
        applicantUserId: [null],
      }),
      applicantName: ['', [Validators.required]],
      email: ['', [Validators.required]],
      schoolName: ['', [Validators.required]],
      // Review Comments
      reviewComments: this.fb.group({
        hosComment: ['', Validators.maxLength(1000)],
        rmcComment: ['', Validators.maxLength(1000)],
        vcComment: ['', Validators.maxLength(1000)],
        hrComment: ['', Validators.maxLength(1000)],
      }),
    });

    effect(() => {
      this.syncReviewCommentRequired('hosComment', this.workflow.isHosEditable());
      this.syncReviewCommentRequired('rmcComment', this.workflow.isRmcEditable());
      this.syncReviewCommentRequired('vcComment', this.workflow.isVcEditable());
      this.syncReviewCommentRequired('hrComment', this.workflow.isHrEditable());
    });
  }

  /** Helper to get a FormControl from the form */
  fc(path: string): FormControl {
    return this.applicantDetailsForm.get(path) as FormControl;
  }

  // ── Comment toggles ────────────────────────────────────────────
  toggleHosComments(): void {
    this.showHosComments.update((v) => !v);
  }
  toggleRmcComments(): void {
    this.showRmcComments.update((v) => !v);
  }
  toggleVcComments(): void {
    this.showVcComments.update((v) => !v);
  }
  toggleHrComments(): void {
    this.showHrComments.update((v) => !v);
  }

  // ── Auto-fill applicant info + sync ABAC attributes to workflow ────
  ngOnInit(): void {
    const requestId = this.route.snapshot.queryParamMap.get('request_id');
    if (requestId) {
      this.loadApplication(Number(requestId));
    } else {
      this.formStateService.clearFormState();
      const user = this.auth.currentUser();
      if (user) {
        this.applicantDetailsForm.patchValue({
          applicantName: user.name,
          email: user.email,
          schoolName: user.department,
        });
      }
      this.workflow.status.set('draft');
    }

    // Listen for status changes
    this.applicantDetailsForm.get('metadata.applicationStatus')?.valueChanges.subscribe((val) => {
      if (val) this.workflow.status.set(val as ConferenceStatus);
    });
  }

  private loadApplication(requestId: number): void {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      this.submissionErrorMessage.set('Invalid Conference request id.');
      return;
    }

    this.formStateService.clearFormState();
    this.isLoadingApplication.set(true);
    this.conferenceApi.getForm(requestId).subscribe({
      next: (response) => {
        const status = String(response.data.request?.status_code ?? '').toLowerCase();
        const isApplicantEditable = [
          'draft',
          'fill_application',
          'normal_application',
          'hos_request_resubmission',
          'rmc_request_resubmission',
          'pending_applicant_resubmission_hos',
          'pending_applicant_resubmission_rmc',
        ].includes(status);
        if (!isApplicantEditable) {
          this.isLoadingApplication.set(false);
          void this.router.navigateByUrl(this.conferenceDetailPath(response.data, requestId));
          return;
        }
        this.patchFromBackend(response.data);
        this.isAdminReadOnlyDraft.set(
          this.isSystemAdminReadOnlyRequest(response.data.request ?? {}),
        );
        this.loadSectionComments(requestId);
        this.isLoadingApplication.set(false);
      },
      error: (err) => {
        console.error('Failed to load conference application:', err);
        this.submissionErrorMessage.set(
          this.extractErrorMessage(err, 'Failed to load the Conference application.'),
        );
        this.isLoadingApplication.set(false);
      },
    });
  }

  private loadSectionComments(requestId: number): void {
    this.isLoadingSectionComments.set(true);
    this.workflowRequests.getComments(requestId).subscribe({
      next: (response) => {
        const comments = (response.data ?? []).filter(
          (comment) => comment.comment_type === 'section_review',
        );
        this.sectionComments.set(comments);
        this.selectedFeedbackActorCode.set(this.actorTabsWithComments()[0]?.code ?? null);
        this.isLoadingSectionComments.set(false);
      },
      error: () => {
        this.sectionComments.set([]);
        this.selectedFeedbackActorCode.set(null);
        this.isLoadingSectionComments.set(false);
      },
    });
  }

  commentsForActor(actorCode: string | null): RequestCommentDto[] {
    if (!actorCode) return [];
    return this.sectionComments().filter(
      (comment) => this.normalizeActorCode(comment.actor_type_code) === actorCode,
    );
  }

  commentsForActorSection(actorCode: string | null, sectionCode: string): RequestCommentDto[] {
    return this.commentsForActor(actorCode).filter(
      (comment) => comment.section_code === sectionCode,
    );
  }

  actorTabsWithComments(): typeof this.commentActors {
    return this.commentActors.filter((actor) => this.commentsForActor(actor.code).length > 0);
  }

  actorCommentCount(actorCode: string): number {
    return this.commentsForActor(actorCode).length;
  }

  sectionsWithCommentsForActor(actorCode: string | null): typeof this.commentSections {
    if (!actorCode) return [];
    return this.commentSections.filter(
      (section) => this.commentsForActorSection(actorCode, section.code).length > 0,
    );
  }

  toggleFeedbackActor(actorCode: string): void {
    this.selectedFeedbackActorCode.update((selected) =>
      selected === actorCode ? null : actorCode,
    );
  }

  prettyActor(actorCode: string | null | undefined): string {
    const actor = this.normalizeActorCode(actorCode);
    const labels: Record<string, string> = {
      HOS_HOD: 'HOS/HOD',
      RMC: 'RMC',
      VC: 'VC',
      HR: 'HR',
      CEO: 'CEO',
    };
    return labels[actor] ?? actorCode ?? 'Reviewer';
  }

  formatCommentDate(iso: string | null | undefined): string {
    return formatDisplayDateTime(iso);
  }

  private normalizeActorCode(actorCode: string | null | undefined): string {
    const actor = (actorCode ?? '').toUpperCase();
    return actor === 'HOS' || actor === 'HOD' ? 'HOS_HOD' : actor;
  }

  private conferenceDetailPath(data: ConferenceFormData, requestId: number): string {
    const request = data.request ?? {};
    const code = request.request_code;
    return code
      ? `/conference/detail/${encodeURIComponent(String(code))}`
      : `/submissions/detail/${requestId}`;
  }

  private patchFromBackend(data: ConferenceFormData): void {
    const request = data.request;
    const conference = data.conference ?? {};
    const requestId = request.id ?? request.request_id;
    const status = (request.status_code || 'draft') as ConferenceStatus;

    this.applicantDetailsForm.patchValue({
      applicantName: request.applicant_name ?? this.auth.currentUser()?.name ?? '',
      email: request.applicant_email ?? this.auth.currentUser()?.email ?? '',
      schoolName: request.applicant_department ?? this.auth.currentUser()?.department ?? '',
      metadata: {
        applicationStatus: status,
        conferenceRequestId: requestId ?? null,
        applicantUserId: request.applicant_staff_username ?? null,
      },
    });
    this.workflow.status.set(status);

    this.formStateService.clearFormState();
    const toYesNo = (value: unknown) => (value ? 'yes' : 'no');
    const projectType = String(conference.project_type ?? '');
    const breakdown = data.costing_items.map((item) => ({
      backendId: item.id,
      itemDescription:
        item.vote_number_description_snapshot ?? item.account_code_description_snapshot ?? '',
      voteNumber: item.vote_number_snapshot ?? item.account_code_snapshot ?? '',
      accountCode: item.project_account_code_snapshot ?? '',
      currency: item.currency ?? 'MYR',
      cost: item.cost_in_foreign_currency ?? '',
      exchangeRate: item.exchange_rate ?? '1',
      costInRM: item.cost_in_rm ?? '',
      description: item.description ?? '',
      supportingDocument:
        data.attachments.find(
          (attachment) => attachment.id === item.supporting_document_attachment_id,
        )?.file_name ?? '',
      supportingDocumentAttachmentId: item.supporting_document_attachment_id ?? null,
    }));
    this.formStateService.saveFormSection('conferenceDetails', {
      fundingRequestType: conference.conference_funding_request_type ?? '',
      conferenceType: conference.conference_type ?? '',
      travelRequired: toYesNo(conference.is_travelling_required),
      purposeOfBusinessTravel: conference.purpose_of_business_travel ?? '',
      bookingDoneBy:
        conference.bookings_done_by_type === 'SELF'
          ? 'themselves'
          : conference.bookings_done_by_type === 'OTHER'
            ? 'other'
            : '',
      bookingDoneByOther: conference.bookings_done_by_other_name ?? '',
      hasAdvance: toYesNo(conference.is_cash_advance_required),
      advanceReason: conference.cash_advance_reason ?? '',
      hasColleagues: toYesNo(conference.has_travelling_colleagues),
      selectedColleagues: data.travelling_colleagues
        .map((item) => item.staff_username)
        .filter((value): value is string => !!value),
      authorshipType: conference.author_role ?? '',
      scopusPublicationGuaranteed: toYesNo(conference.is_scopus_indexed),
      restrictedPublisher: toYesNo(conference.is_restricted_publisher),
      sdgKeyword1: conference.sdg_keyword_1 ?? '',
      sdgKeyword2: conference.sdg_keyword_2 ?? '',
      sdgKeyword3: conference.sdg_keyword_3 ?? '',
      conferenceName: conference.conference_name ?? '',
      conferenceStartDate: conference.conference_start_date ?? '',
      conferenceEndDate: conference.conference_end_date ?? '',
      activities: data.travel_events.map((item) => ({
        backendId: item.id,
        date: item.event_date ?? '',
        startTime: item.start_time ?? item.event_time ?? '',
        endTime: item.end_time ?? '',
        description: item.description ?? '',
      })),
      localOrOverseas: conference.location_type ?? '',
      researchType: projectType,
      citedJournalPaper: toYesNo(conference.cited_apu_jati_ejbm),
      citedJournalPaperExplanation: conference.cited_apu_jati_ejbm_explanation ?? '',
      conferenceLocation: conference.conference_location ?? '',
      paperTitle: conference.paper_title ?? '',
      selectedRegion: conference.region_id != null ? String(conference.region_id) : '',
      regionName: conference['region_name_snapshot'] ?? '',
      percentage: conference['region_percentage_snapshot'] ?? '',
      limit: conference['region_limit_snapshot'] ?? '',
      regionDescription: conference['region_description_snapshot'] ?? '',
      projectAccountCode: projectType === 'research' ? (conference.project_account_code ?? '') : '',
      externalProjectAccountCode:
        projectType === 'external-research' ? (conference.project_account_code ?? '') : '',
      sponsoredAmountExternal:
        projectType === 'research' ? (conference.external_sponsorship_amount ?? '') : '',
      sponsoredBy: projectType === 'research' ? (conference.external_sponsored_by ?? '') : '',
      costingRemarks: projectType === 'research' ? (conference.remarks ?? '') : '',
      externalSponsoredAmountExternal:
        projectType === 'external-research' ? (conference.external_sponsorship_amount ?? '') : '',
      externalSponsoredBy:
        projectType === 'external-research' ? (conference.external_sponsored_by ?? '') : '',
      externalCostingRemarks: projectType === 'external-research' ? (conference.remarks ?? '') : '',
      localSponsoredAmountExternal:
        projectType !== 'research' && projectType !== 'external-research'
          ? (conference.external_sponsorship_amount ?? '')
          : '',
      localSponsoredBy:
        projectType !== 'research' && projectType !== 'external-research'
          ? (conference.external_sponsored_by ?? '')
          : '',
      localCostingRemarks:
        projectType !== 'research' && projectType !== 'external-research'
          ? (conference.remarks ?? '')
          : '',
      researchBreakdown: projectType === 'research' ? breakdown : [],
      externalResearchBreakdown: projectType === 'external-research' ? breakdown : [],
      localBreakdown:
        projectType !== 'research' && projectType !== 'external-research' ? breakdown : [],
    });

    this.formStateService.saveFormSection('authorDetails', {
      fullName: request.applicant_name ?? '',
      employeeId: request.applicant_staff_username ?? '',
      designation: '',
      department: request.applicant_department ?? '',
      email: request.applicant_email ?? '',
      phoneNumber: '',
      coAuthors: '',
      isPresenter: true,
      testSubsections: data.apu_staff_co_authors.map((item) => ({
        backendId: item.id,
        staffName: item.staff_name ?? '',
        schoolDepartment: item.staff_department ?? '',
        affiliation: item.affiliation ?? '',
      })),
      studentCoAuthors: data.apu_student_co_authors.map((item) => ({
        backendId: item.id,
        tpNumber: item.tp_number ?? '',
        fullName: item.full_name ?? '',
        schoolDepartment: item.school_department ?? '',
        affiliation: item.affiliation ?? '',
      })),
      nonApuCoAuthors: data.non_apu_co_authors.map((item) => ({
        backendId: item.id,
        fullName: item.full_name ?? '',
        country: formatCountryForDisplay(item.country),
        email: item.email ?? '',
        organisationType: item.organisation_type ?? '',
        schoolDepartment: item.school_department ?? '',
        institutionName: item.institution_company_name ?? '',
      })),
    });

    const supportingDocuments: Record<string, unknown> = {
      manuscriptInternallyReviewed: toYesNo(conference.is_manuscript_internally_reviewed),
      reviewerName: conference.reviewer_name ?? '',
      manuscriptPreviouslyPublished: toYesNo(conference.is_published_elsewhere),
    };
    for (const field of this.supportingDocumentFields) {
      const attachment = data.attachments.find(
        (item) => item.entity_type === `conference_${field}`,
      );
      supportingDocuments[field] = attachment?.file_name ?? '';
    }
    this.formStateService.saveFormSection('supportingDocuments', supportingDocuments);
    this.formStateService.saveFormSection('declaration', {
      agreeToTerms: !!conference.declaration_terms_accepted,
      acknowledgeGrantFunder: !!conference.declaration_funder_acknowledged,
    });

    this.loadedCoAuthorIds = {
      staff: new Set(
        data.apu_staff_co_authors.map((item) => item.id).filter((id): id is number => !!id),
      ),
      student: new Set(
        data.apu_student_co_authors.map((item) => item.id).filter((id): id is number => !!id),
      ),
      nonApu: new Set(
        data.non_apu_co_authors.map((item) => item.id).filter((id): id is number => !!id),
      ),
      costing: new Set(
        data.costing_items.map((item) => item.id).filter((id): id is number => !!id),
      ),
    };
  }

  goToStep(step: number) {
    if (step !== this.currentStep()) {
      this.markStepChecked(this.currentStep());
    }
    this.flushActiveStepFormState();
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

  goToMissingField(event: { step: number; field: MissingField }): void {
    this.goToStep(event.step);
    const field = event.field;
    const target = typeof field === 'string' ? field : (field.target ?? field.label);

    setTimeout(() => {
      const escapedTarget = target.replace(/"/g, '\\"');
      const selector =
        '[data-missing-field-target="' +
        escapedTarget +
        '"], [formControlName="' +
        escapedTarget +
        '"]';
      const element = document.querySelector<HTMLElement>(selector);
      const focusTarget = this.getSafeMissingFieldFocusTarget(element);
      const scrollTarget = this.getMissingFieldScrollTarget(element, focusTarget);

      scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightMissingFieldTarget(scrollTarget ?? element ?? undefined);
      focusTarget?.focus({ preventScroll: true });

      if (focusTarget && this.canProgrammaticallyClickMissingField(focusTarget)) {
        focusTarget.click();
      }
    });
  }

  private getSafeMissingFieldFocusTarget(element?: HTMLElement | null): HTMLElement | undefined {
    if (!element) return undefined;
    const target = element.matches('input, textarea, select, button, [tabindex]')
      ? element
      : element.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');

    if (!target) return undefined;
    if (this.isValueChangingChoiceControl(target)) {
      return this.getMissingFieldScrollTarget(element, target);
    }
    return target;
  }

  private getMissingFieldScrollTarget(
    element?: HTMLElement | null,
    focusTarget?: HTMLElement,
  ): HTMLElement | undefined {
    const source = focusTarget ?? element ?? undefined;
    if (!source) return undefined;
    return (
      source.closest<HTMLElement>(
        '[data-missing-field-target], .form-field, .form-group, .radio-group, .checkbox-group, .toggle-group',
      ) ?? source
    );
  }

  private canProgrammaticallyClickMissingField(element: HTMLElement): boolean {
    if (this.isValueChangingChoiceControl(element)) return false;
    if (element.matches('input[type="file"]')) return false;
    return element.matches(
      'button, select, input[type="date"], input[type="datetime-local"], [role="combobox"]',
    );
  }

  private isValueChangingChoiceControl(element: HTMLElement): boolean {
    const input = element instanceof HTMLInputElement ? element : null;
    if (input && ['radio', 'checkbox'].includes(input.type)) return true;
    const role = element.getAttribute('role');
    return role === 'switch' || role === 'checkbox' || role === 'radio';
  }

  private highlightMissingFieldTarget(element?: HTMLElement): void {
    if (!element) return;
    const previousOutline = element.style.outline;
    const previousBoxShadow = element.style.boxShadow;
    const previousBorderRadius = element.style.borderRadius;
    element.style.outline = '2px solid var(--color-primary)';
    element.style.boxShadow = '0 0 0 4px var(--color-primary-light)';
    element.style.borderRadius = 'var(--radius-md)';

    window.setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.boxShadow = previousBoxShadow;
      element.style.borderRadius = previousBorderRadius;
    }, 1800);
  }

  private markStepChecked(step: number) {
    this.checkedSteps.add(step);
  }

  getStepStatuses(): StepStatus[] {
    const missingByStep = [
      this.getConferenceDetailsMissingFields(),
      this.getAuthorDetailsMissingFields(),
      this.getSupportingDocumentsMissingFields(),
      this.getDeclarationMissingFields(),
    ];

    return this.wizardSteps.map((_, index) => ({
      visited: this.checkedSteps.has(index + 1),
      valid: missingByStep[index].length === 0,
      missingFields: missingByStep[index],
    }));
  }

  private getConferenceDetailsMissingFields(): MissingField[] {
    if (!this.workflow.isApplicantEditable()) return [];
    if (this.conferenceDetailsStep?.form) {
      const missing = [
        ...this.getMissingFromValue(
          this.applicantDetailsForm.getRawValue(),
          this.applicantDetailsFieldChecks,
        ),
        ...this.getInvalidLabelsFromForm(
          this.conferenceDetailsStep.form,
          this.conferenceDetailsFieldChecks,
        ),
      ];
      this.conferenceDetailsStep.activities.controls.forEach((control) => {
        if (control.invalid)
          missing.push({ label: 'Conference Schedule - Add Activity', target: 'activityTable' });
      });
      if (
        this.conferenceDetailsStep.form.get('researchType')?.value === 'external-research' &&
        this.conferenceDetailsStep.externalBreakdowns.length === 0
      ) {
        missing.push({
          label: 'External Research Project Costing - Add Entry',
          target: 'externalResearchCostingEntries',
        });
      }
      return this.uniqueLabels(missing);
    }

    const state = this.formStateService.getFormSection('conferenceDetails') ?? {};
    return this.uniqueLabels([
      ...this.getMissingFromValue(
        this.applicantDetailsForm.getRawValue(),
        this.applicantDetailsFieldChecks,
      ),
      ...this.getMissingFromValue(state, this.conferenceDetailsFieldChecks, {
        bookingDoneByOther: state['bookingDoneBy'] === 'other',
        advanceReason: state['hasAdvance'] === 'yes',
        selectedColleagues: state['hasColleagues'] === 'yes',
        citedJournalPaperExplanation: state['citedJournalPaper'] === 'no',
        externalProjectAccountCode: state['researchType'] === 'external-research',
      }),
      ...this.getInvalidActivityLabels(state['activities']),
      ...this.getMissingExternalResearchCostingLabels(state),
    ]);
  }

  private getAuthorDetailsMissingFields(): MissingField[] {
    return [];
  }

  private getSupportingDocumentsMissingFields(): MissingField[] {
    if (!this.workflow.isApplicantEditable()) return [];
    if (this.supportingDocumentsStep?.form) {
      return this.getInvalidLabelsFromForm(
        this.supportingDocumentsStep.form,
        this.supportingDocumentsFieldChecks,
      );
    }

    const state = this.formStateService.getFormSection('supportingDocuments') ?? {};
    const missing = this.getMissingFromValue(state, this.supportingDocumentsFieldChecks);
    if (state['manuscriptPreviouslyPublished'] === 'yes') {
      missing.push({
        label: 'Manuscript Previously Published',
        target: 'manuscriptPreviouslyPublished',
      });
    }
    return this.uniqueLabels(missing);
  }

  private getDeclarationMissingFields(): MissingField[] {
    const missing: MissingField[] = [];

    if (this.workflow.isApplicantEditable()) {
      if (this.declarationStep?.form) {
        missing.push(
          ...this.getInvalidLabelsFromForm(this.declarationStep.form, this.declarationFieldChecks),
        );
      } else {
        const state = this.formStateService.getFormSection('declaration') ?? {};
        missing.push(...this.getMissingFromValue(state, this.declarationFieldChecks, {}, true));
      }
    }

    missing.push(...this.getReviewCommentMissingFields());
    return this.uniqueLabels(missing);
  }

  private getInvalidLabelsFromForm(
    form: FormGroup,
    checks: Array<{ path: string; label: string; target?: string }>,
  ): MissingField[] {
    return checks
      .filter(({ path }) => {
        const control = form.get(path);
        return !!control && control.enabled && control.invalid;
      })
      .map(({ path, label, target }) => ({ label, target: target ?? path }));
  }

  private getMissingFromValue(
    value: Record<string, unknown>,
    checks: Array<{ path: string; label: string; target?: string }>,
    conditionalRequired: Record<string, boolean> = {},
    requireTrue = false,
  ): MissingField[] {
    return checks
      .filter(({ path }) => {
        if (conditionalRequired[path] === false) return false;
        const fieldValue = value[path];
        return requireTrue ? fieldValue !== true : this.isEmptyRequiredValue(fieldValue);
      })
      .map(({ path, label, target }) => ({ label, target: target ?? path }));
  }

  private getInvalidActivityLabels(activities: unknown): MissingField[] {
    const rows = Array.isArray(activities) ? activities : [];
    return rows.some((activity) => {
      const rowValue = (activity ?? {}) as Record<string, unknown>;
      return ['date', 'startTime', 'endTime', 'description'].some((field) =>
        this.isEmptyRequiredValue(rowValue[field]),
      );
    })
      ? [{ label: 'Conference Schedule - Add Activity', target: 'activityTable' }]
      : [];
  }

  private getMissingExternalResearchCostingLabels(state: Record<string, unknown>): MissingField[] {
    const entries = state['externalResearchBreakdown'];
    return state['researchType'] === 'external-research' &&
      (!Array.isArray(entries) || entries.length === 0)
      ? [
          {
            label: 'External Research Project Costing - Add Entry',
            target: 'externalResearchCostingEntries',
          },
        ]
      : [];
  }

  private getInvalidArrayLabels(rows: unknown, label: string, target: string): MissingField[] {
    if (!Array.isArray(rows)) return [];
    const hasIncompleteRow = rows.some((row) => {
      const rowValue = (row ?? {}) as Record<string, unknown>;
      return Object.entries(rowValue).some(
        ([field, value]) => field !== 'affiliation' && this.isEmptyRequiredValue(value),
      );
    });
    return hasIncompleteRow ? [{ label, target }] : [];
  }

  private getReviewCommentMissingFields(): MissingField[] {
    const checks: Array<{ path: string; label: string; required: boolean }> = [
      { path: 'hosComment', label: 'HOS Comment', required: this.workflow.isHosEditable() },
      { path: 'rmcComment', label: 'RMC Comment', required: this.workflow.isRmcEditable() },
      { path: 'vcComment', label: 'VC Comment', required: this.workflow.isVcEditable() },
      { path: 'hrComment', label: 'HR Comment', required: this.workflow.isHrEditable() },
    ];

    const group = this.applicantDetailsForm.get('reviewComments') as FormGroup;
    return checks
      .filter(({ path, required }) => required && group.get(path)?.invalid)
      .map(({ path, label }) => ({ label, target: `reviewComments.${path}` }));
  }

  private syncReviewCommentRequired(path: string, required: boolean): void {
    const control = this.applicantDetailsForm.get(`reviewComments.${path}`);
    if (!control) return;
    required
      ? control.addValidators(Validators.required)
      : control.removeValidators(Validators.required);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private isEmptyRequiredValue(value: unknown): boolean {
    if (Array.isArray(value)) return value.length === 0;
    return value === null || value === undefined || String(value).trim() === '';
  }

  private uniqueLabels(labels: MissingField[]): MissingField[] {
    const seen = new Set<string>();
    return labels.filter((field) => {
      const key = typeof field === 'string' ? field : `${field.label}:${field.target ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private markCurrentStepFormTouched(): void {
    if (this.currentStep() === 1) {
      this.applicantDetailsForm.markAllAsTouched();
      this.conferenceDetailsStep?.form.markAllAsTouched();
      return;
    }

    const activeForm =
      this.currentStep() === 2
        ? this.authorDetailsStep?.form
        : this.currentStep() === 3
          ? this.supportingDocumentsStep?.form
          : this.declarationStep?.form;
    activeForm?.markAllAsTouched();
  }

  /** Flushes whichever sub-form is currently mounted into the shared state service. */
  private flushActiveStepFormState(): void {
    this.conferenceDetailsStep?.flushFormState();
    this.authorDetailsStep?.flushFormState();
    this.supportingDocumentsStep?.flushFormState();
    this.declarationStep?.flushFormState();
  }

  // Real backend integration for the applicant side of the shared workflow.
  // Reviewer actions and section comments use WorkflowRequestsService, matching Journal.

  private voteNumberIdByCode: Map<string, number> | null = null;
  private accountCodeIdByCode: Map<string, number> | null = null;
  private projectAccountCodeIdByCode: Map<string, number> | null = null;

  private loadCodeLookups(): Observable<void> {
    if (this.voteNumberIdByCode && this.accountCodeIdByCode && this.projectAccountCodeIdByCode) {
      return of(void 0);
    }
    return forkJoin([
      this.masterData.getVoteNumbers('CONFERENCE'),
      this.masterData.getAccountCodes('CONFERENCE'),
      this.masterData.getProjectAccountCodes('CONFERENCE'),
    ]).pipe(
      map(([voteNumbers, accountCodes, projectAccountCodes]) => {
        this.voteNumberIdByCode = new Map(
          (voteNumbers.data ?? []).map((v: CodeOption) => [v.code, v.id]),
        );
        this.accountCodeIdByCode = new Map(
          (accountCodes.data ?? []).map((v: CodeOption) => [v.code, v.id]),
        );
        this.projectAccountCodeIdByCode = new Map(
          (projectAccountCodes.data ?? []).map((v: CodeOption) => [v.code, v.id]),
        );
      }),
    );
  }

  /** Maps the conferenceDetails + supportingDocuments state sections to the backend's snake_case schema. */
  private buildConferenceRequestDto(): Partial<ConferenceRequestDto> {
    const cd: any = this.formStateService.getFormSection('conferenceDetails') ?? {};
    const sd: any = this.formStateService.getFormSection('supportingDocuments') ?? {};
    const declaration: any = this.formStateService.getFormSection('declaration') ?? {};
    const researchType = cd.researchType || '';
    const isExternal = researchType === 'external-research';
    const isResearch = researchType === 'research';

    const sponsoredAmount = isExternal
      ? cd.externalSponsoredAmountExternal
      : isResearch
        ? cd.sponsoredAmountExternal
        : cd.localSponsoredAmountExternal;
    const sponsoredBy = isExternal
      ? cd.externalSponsoredBy
      : isResearch
        ? cd.sponsoredBy
        : cd.localSponsoredBy;
    const remarks = isExternal
      ? cd.externalCostingRemarks
      : isResearch
        ? cd.costingRemarks
        : cd.localCostingRemarks;

    const toBool = (v: unknown) => v === true || v === 'yes' || v === 'true';
    const nullableDecimal = (value: unknown) => {
      const text = value == null ? '' : String(value).trim();
      return text === '' ? null : text;
    };

    return {
      conference_funding_request_type: cd.fundingRequestType || null,
      conference_type: cd.conferenceType || null,
      is_travelling_required: toBool(cd.travelRequired),
      purpose_of_business_travel: cd.purposeOfBusinessTravel || null,
      author_role: cd.authorshipType || null,
      is_scopus_indexed: toBool(cd.scopusPublicationGuaranteed),
      is_restricted_publisher: toBool(cd.restrictedPublisher),
      cited_apu_jati_ejbm: toBool(cd.citedJournalPaper),
      cited_apu_jati_ejbm_explanation: cd.citedJournalPaperExplanation || null,
      sdg_keyword_1: cd.sdgKeyword1 || null,
      sdg_keyword_2: cd.sdgKeyword2 || null,
      sdg_keyword_3: cd.sdgKeyword3 || null,
      conference_name: cd.conferenceName || null,
      conference_start_date: cd.conferenceStartDate || null,
      conference_end_date: cd.conferenceEndDate || null,
      location_type: cd.localOrOverseas || null,
      conference_location: cd.conferenceLocation || null,
      project_type: researchType || null,
      project_account_code:
        (isExternal ? cd.externalProjectAccountCode : cd.projectAccountCode) || null,
      paper_title: cd.paperTitle || null,
      region_id: cd.selectedRegion ? Number(cd.selectedRegion) : null,
      is_manuscript_internally_reviewed: toBool(sd.manuscriptInternallyReviewed),
      reviewer_name: sd.reviewerName || null,
      is_published_elsewhere: toBool(sd.manuscriptPreviouslyPublished),
      declaration_terms_accepted: toBool(declaration.agreeToTerms),
      declaration_funder_acknowledged: toBool(declaration.acknowledgeGrantFunder),
      external_sponsorship_amount: nullableDecimal(sponsoredAmount),
      external_sponsored_by: sponsoredBy || null,
      remarks: remarks || null,
      bookings_done_by_type:
        cd.bookingDoneBy === 'themselves' ? 'SELF' : cd.bookingDoneBy === 'other' ? 'OTHER' : null,
      bookings_done_by_other_name:
        cd.bookingDoneBy === 'other' ? cd.bookingDoneByOther || null : null,
      is_cash_advance_required: toBool(cd.hasAdvance),
      cash_advance_reason: toBool(cd.hasAdvance) ? cd.advanceReason || null : null,
      has_travelling_colleagues: toBool(cd.hasColleagues),
      travel_events: (cd.activities ?? []).map((activity: any, index: number) => ({
        event_date: activity.date || null,
        start_time: activity.startTime || null,
        end_time: activity.endTime || null,
        description: activity.description || null,
        display_order: index + 1,
      })),
      travelling_colleagues: (cd.selectedColleagues ?? []).map(
        (staffUsername: string, index: number) => ({
          staff_username: staffUsername,
          display_order: index + 1,
        }),
      ),
    };
  }

  /** Generic create/update/delete sync for a plain-object array against its backend child-resource endpoints. */
  private syncPlainArray<T>(
    items: any[],
    toPayload: (raw: any) => T,
    create: (payload: T) => Observable<{ data: { id?: number } }>,
    update: (backendId: number, payload: T) => Observable<unknown>,
    remove: (backendId: number) => Observable<unknown>,
    previouslyLoadedIds: Set<number>,
  ): Observable<unknown> {
    const currentIds = new Set<number>();
    const ops: Observable<unknown>[] = [];

    for (const item of items) {
      const payload = toPayload(item);
      if (item.backendId) {
        currentIds.add(Number(item.backendId));
        ops.push(update(Number(item.backendId), payload));
      } else {
        ops.push(
          create(payload).pipe(
            tap((res) => {
              const newId = res?.data?.id;
              if (newId) {
                item.backendId = newId;
                currentIds.add(newId);
              }
            }),
          ),
        );
      }
    }

    for (const oldId of previouslyLoadedIds) {
      if (!currentIds.has(oldId)) {
        ops.push(remove(oldId));
      }
    }

    return ops.length ? forkJoin(ops) : of(null);
  }

  private loadedCoAuthorIds = {
    staff: new Set<number>(),
    student: new Set<number>(),
    nonApu: new Set<number>(),
    costing: new Set<number>(),
  };

  private syncCoAuthors(id: number): Observable<unknown> {
    const authorDetails: any = this.formStateService.getFormSection('authorDetails') ?? {};
    const staff: any[] = authorDetails.testSubsections ?? [];
    const students: any[] = authorDetails.studentCoAuthors ?? [];
    const nonApu: any[] = authorDetails.nonApuCoAuthors ?? [];

    return forkJoin([
      this.syncPlainArray(
        staff,
        (raw) => ({
          staff_name: raw.staffName || null,
          staff_department: raw.schoolDepartment || null,
          affiliation: raw.affiliation || null,
        }),
        (payload) => this.conferenceApi.createStaffCoAuthor(id, payload),
        (backendId, payload) => this.conferenceApi.updateStaffCoAuthor(id, backendId, payload),
        (backendId) => this.conferenceApi.deleteStaffCoAuthor(id, backendId),
        this.loadedCoAuthorIds.staff,
      ),
      this.syncPlainArray(
        students,
        (raw) => ({
          tp_number: raw.tpNumber || null,
          full_name: raw.fullName || null,
          school_department: raw.schoolDepartment || null,
          affiliation: raw.affiliation || null,
        }),
        (payload) => this.conferenceApi.createStudentCoAuthor(id, payload),
        (backendId, payload) => this.conferenceApi.updateStudentCoAuthor(id, backendId, payload),
        (backendId) => this.conferenceApi.deleteStudentCoAuthor(id, backendId),
        this.loadedCoAuthorIds.student,
      ),
      this.syncPlainArray(
        nonApu,
        (raw) => ({
          full_name: raw.fullName || null,
          country: normalizeCountryForStorage(raw.country),
          email: raw.email || null,
          organisation_type: raw.organisationType || null,
          school_department: raw.schoolDepartment || null,
          institution_company_name: raw.institutionName || null,
        }),
        (payload) => this.conferenceApi.createNonApuCoAuthor(id, payload),
        (backendId, payload) => this.conferenceApi.updateNonApuCoAuthor(id, backendId, payload),
        (backendId) => this.conferenceApi.deleteNonApuCoAuthor(id, backendId),
        this.loadedCoAuthorIds.nonApu,
      ),
    ]).pipe(
      tap(() => {
        this.loadedCoAuthorIds.staff = new Set(staff.map((s) => s.backendId).filter(Boolean));
        this.loadedCoAuthorIds.student = new Set(students.map((s) => s.backendId).filter(Boolean));
        this.loadedCoAuthorIds.nonApu = new Set(nonApu.map((s) => s.backendId).filter(Boolean));
      }),
    );
  }

  /** Uploads the local-breakdown's pending supporting document, if any, and resolves its attachment id. */
  private uploadPendingCostingFile(id: number, entry: any): Observable<number | null> {
    if (!entry.pendingFileKey) return of(entry.supportingDocumentAttachmentId ?? null);
    const file = this.formStateService.getPendingFile(entry.pendingFileKey);
    if (!file) return of(entry.supportingDocumentAttachmentId ?? null);

    return this.conferenceApi
      .uploadAttachment(id, file, 'conference_costing_supporting_document')
      .pipe(
        map((res) => {
          const attachmentId = res?.data?.id ?? null;
          entry.supportingDocumentAttachmentId = attachmentId;
          this.formStateService.clearPendingFile(entry.pendingFileKey);
          return attachmentId;
        }),
      );
  }

  private syncCostingItems(id: number): Observable<unknown> {
    const cd: any = this.formStateService.getFormSection('conferenceDetails') ?? {};
    const researchType = cd.researchType || '';
    const isVoteNumberType = researchType === 'external-research' || researchType === 'research';
    const items: any[] =
      researchType === 'external-research'
        ? (cd.externalResearchBreakdown ?? [])
        : researchType === 'research'
          ? (cd.researchBreakdown ?? [])
          : (cd.localBreakdown ?? []);

    return this.loadCodeLookups().pipe(
      switchMap(() =>
        items.length
          ? forkJoin(items.map((entry) => this.uploadPendingCostingFile(id, entry)))
          : of([]),
      ),
      switchMap(() =>
        this.syncPlainArray(
          items,
          (raw) => ({
            // Research/external rows resolve against the vote-number list; local rows
            // resolve against the (LOCAL) account-code list — both are stored in
            // `voteNumber` by the breakdown form. There is no per-item project account
            // code field in the UI, so project_account_code_id is left unset (the
            // conference-level project_account_code string covers that).
            project_account_code_id: null,
            vote_number_id:
              isVoteNumberType && raw.voteNumber
                ? (this.voteNumberIdByCode?.get(raw.voteNumber) ?? null)
                : null,
            account_code_id:
              !isVoteNumberType && raw.voteNumber
                ? (this.accountCodeIdByCode?.get(raw.voteNumber) ?? null)
                : null,
            supporting_document_attachment_id: raw.supportingDocumentAttachmentId ?? null,
            currency: String(raw.currency || 'MYR').toUpperCase(),
            cost_in_foreign_currency: raw.cost != null ? String(raw.cost) : null,
            exchange_rate: raw.exchangeRate != null ? String(raw.exchangeRate) : null,
            cost_in_rm: raw.costInRM != null ? String(raw.costInRM) : null,
            description: raw.description || null,
          }),
          (payload) => this.conferenceApi.createCostingItem(id, payload),
          (backendId, payload) => this.conferenceApi.updateCostingItem(id, backendId, payload),
          (backendId) => this.conferenceApi.deleteCostingItem(id, backendId),
          this.loadedCoAuthorIds.costing,
        ).pipe(
          tap(() => {
            this.loadedCoAuthorIds.costing = new Set(items.map((i) => i.backendId).filter(Boolean));
          }),
        ),
      ),
    );
  }

  private readonly supportingDocumentFields: string[] = [
    'acceptanceNotification',
    'reviewersFeedback',
    'scopusEvidencePublication',
    'sriApproval',
    'turnitinReport',
    'finalPaperDraft',
    'conferenceInvoice',
  ];

  private uploadPendingSupportingDocuments(id: number): Observable<unknown> {
    const uploads: Observable<unknown>[] = [];
    for (const field of this.supportingDocumentFields) {
      const file = this.formStateService.getPendingFile(`supportingDocuments.${field}`);
      if (file) {
        uploads.push(
          this.conferenceApi
            .uploadAttachment(id, file, `conference_${field}`)
            .pipe(
              tap(() => this.formStateService.clearPendingFile(`supportingDocuments.${field}`)),
            ),
        );
      }
    }
    return uploads.length ? forkJoin(uploads) : of(null);
  }

  /** Creates/updates the Conference draft on the real backend, then syncs every child array. Resolves to the backend id. */
  private syncToRealBackend(): Observable<number> {
    this.flushActiveStepFormState();
    const dto = this.buildConferenceRequestDto();
    const existingIdRaw = this.applicantDetailsForm.get('metadata.conferenceRequestId')?.value;
    const existingId = existingIdRaw ? Number(existingIdRaw) : null;

    const ensureDraft$: Observable<number> = existingId
      ? this.conferenceApi.updateDraft(existingId, dto).pipe(map(() => existingId))
      : this.conferenceApi.createDraft(dto).pipe(
          map((res) => {
            const newId = res.data.request.id ?? res.data.request.request_id;
            if (!newId) throw new Error('Backend did not return a new Conference request id.');
            this.applicantDetailsForm
              .get('metadata.conferenceRequestId')
              ?.setValue(newId, { emitEvent: false });
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { request_id: newId },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
            return newId;
          }),
        );

    return ensureDraft$.pipe(
      switchMap((id) =>
        forkJoin([
          this.syncCoAuthors(id),
          this.syncCostingItems(id),
          this.uploadPendingSupportingDocuments(id),
        ]).pipe(map(() => id)),
      ),
    );
  }

  saveDraft(): void {
    if (this.isAdminReadOnlyDraft()) {
      this.submissionErrorMessage.set('System Admin can view this draft only. Save is disabled.');
      return;
    }

    this.submissionErrorMessage.set('');
    this.isSaving.set(true);
    this.syncToRealBackend().subscribe({
      next: () => {
        this.isSaving.set(false);
        this.formStateService.clearFormState();
        this.router.navigateByUrl('/submissions/draft?tab=all');
      },
      error: (err) => {
        console.error('Save draft failed:', err);
        this.isSaving.set(false);
        this.submissionErrorMessage.set(
          this.extractErrorMessage(err, 'Failed to save draft. Please try again.'),
        );
      },
    });
  }

  submitForm(): void {
    if (this.isAdminReadOnlyDraft()) {
      this.submissionErrorMessage.set('System Admin can view this draft only. Submit is disabled.');
      return;
    }

    this.submitAttempted.set(true);
    this.flushActiveStepFormState();

    const conferenceDetails = this.formStateService.getFormSection('conferenceDetails');
    if (conferenceDetails?.['restrictedPublisher'] === 'yes') {
      this.checkedSteps.add(1);
      this.currentStep.set(1);
      this.submissionErrorMessage.set(
        "You can't submit this application because the conference proceeding publisher is restricted.",
      );
      return;
    }

    const supportingDocuments = this.formStateService.getFormSection('supportingDocuments');
    if (supportingDocuments?.['manuscriptPreviouslyPublished'] === 'yes') {
      this.checkedSteps.add(3);
      this.currentStep.set(3);
      this.submissionErrorMessage.set(
        "You can't submit this application because the manuscript or content was published previously.",
      );
      return;
    }

    const firstInvalidStep = this.getStepStatuses().findIndex((step) => !step.valid);
    if (firstInvalidStep >= 0) {
      this.checkedSteps.add(firstInvalidStep + 1);
      this.currentStep.set(firstInvalidStep + 1);
      this.submissionErrorMessage.set('Complete the required fields before submitting.');
      this.showMissingFieldsWarning.set(true);
      window.requestAnimationFrame(() => {
        this.markCurrentStepFormTouched();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    this.submissionErrorMessage.set('');
    this.showMissingFieldsWarning.set(false);
    this.isSubmitting.set(true);

    const currentStatus = this.applicantDetailsForm.get('metadata.applicationStatus')
      ?.value as ConferenceStatus;
    const isResubmission =
      currentStatus === 'hos_request_resubmission' ||
      currentStatus === 'rmc_request_resubmission' ||
      currentStatus === 'pending_applicant_resubmission_hos' ||
      currentStatus === 'pending_applicant_resubmission_rmc';
    const loadingId = this.actionLoading.begin(
      isResubmission ? 'Resubmitting conference application' : 'Submitting conference application',
    );
    let submissionSucceeded = false;

    this.syncToRealBackend()
      .pipe(
        switchMap((id) => {
          if (currentStatus === 'draft') return this.conferenceApi.submit(id);
          if (isResubmission) return this.conferenceApi.resubmit(id);
          throw new Error(`Conference request cannot be submitted from status "${currentStatus}".`);
        }),
        finalize(() => {
          if (!submissionSucceeded) {
            this.actionLoading.end(loadingId);
          }
        }),
      )
      .subscribe({
        next: () => {
          submissionSucceeded = true;
          this.isSubmitting.set(false);
          this.formStateService.clearFormState();
          void this.router
            .navigateByUrl('/submissions/pending?tab=all')
            .finally(() => this.actionLoading.end(loadingId));
        },
        error: (err) => {
          console.error('Submit failed:', err);
          this.isSubmitting.set(false);
          this.submissionErrorMessage.set(
            this.extractErrorMessage(err, 'Failed to submit. Please try again.'),
          );
        },
      });
  }

  onMissingFieldsWarningClosed(): void {
    this.showMissingFieldsWarning.set(false);
    this.stepIndicator?.showMissingFieldPrompt();
  }

  private extractErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }

  private isSystemAdminReadOnlyRequest(request: {
    applicant_staff_username?: string | null;
  }): boolean {
    if (!this.auth.inGroup('SystemAdmin')) return false;
    const adminView = this.route.snapshot.queryParamMap.get('admin_view')?.toLowerCase() === 'true';
    const applicantUsername = String(request.applicant_staff_username ?? '')
      .trim()
      .toLowerCase();
    const currentUsername = this.auth.currentUser()?.username?.trim().toLowerCase();
    return (
      adminView ||
      Boolean(applicantUsername && currentUsername && applicantUsername !== currentUsername)
    );
  }
}
