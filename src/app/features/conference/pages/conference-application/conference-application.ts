import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  StepIndicatorComponent,
  WizardStep,
  StepStatus,
} from '../../../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ConferenceGuidelinesModalComponent } from '../../components/conference-guidelines-modal/conference-guidelines-modal.component';
import { FormMainTitleComponent } from '../../../../shared/components/form-main-title/form-main-title.component';
import { ConferenceDetailsFormComponent } from '../../components/forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../../components/forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../../components/forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../../components/forms/declaration-form/declaration-form.component';
import { ReviewBlockComponent } from '../../../rdig/components/review-block/review-block.component';
import { ConferenceWorkflowService, ConferenceStatus } from '../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../services/conference-form-state.service';
import {
  ConferenceApiService,
  ConferenceRequestDto,
} from '../../services/conference-api.service';
import { MasterDataService, CodeOption } from '../../../../core/services/master-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GuidelineContext } from '../../../../shared/components/form-main-title/form-main-title.component';
import { FormPageSkeletonComponent } from '../../../../shared/components/form-page-skeleton/form-page-skeleton.component';

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
    ReviewBlockComponent,
    FormPageSkeletonComponent,
  ],
  template: `
    @if (isLoadingApplication()) {
      <app-form-page-skeleton></app-form-page-skeleton>
    } @else {
      <div class="conference-wizard application-form-page">
        <app-form-main-title
          #conferenceFormTitle
          title="Conference Application"
          modalTitle="Guidelines for Applicants"
          [guidelineContext]="guidelineContext"
          [customModal]="true"
          (helpClick)="openGuidelines()"
        >
        </app-form-main-title>

        <app-conference-guidelines-modal
          #guidelinesModal
          (closed)="conferenceFormTitle.onGuidelinesClosed()"
        >
        </app-conference-guidelines-modal>

        <app-step-indicator
          [currentStep]="currentStep()"
          [steps]="wizardSteps"
          [stepStatuses]="stepStatuses()"
          [submitAttempted]="submitAttempted()"
          (stepClick)="goToStep($event)"
        >
        </app-step-indicator>

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
                readonly
              />
            </div>
            <div class="detail-field">
              <label class="detail-label is-required">Applicant Email</label>
              <input
                type="email"
                class="input--text input--disabled-readonly"
                formControlName="email"
                placeholder="TPXXXXXX@mail.apu.edu.my"
                readonly
              />
            </div>
            <div class="detail-field">
              <label class="detail-label is-required">Applicant School / Department</label>
              <input
                type="text"
                class="input--text input--disabled-readonly"
                formControlName="schoolName"
                placeholder="Ex: School of Culinary Arts and Hospitality"
                readonly
              />
            </div>
          </form>
        </div>

        <!-- Main Form Section with Shadow -->
        <div class="main-section application-form-content">
          <!-- Comment Toggle Buttons (shown per ABAC status) -->
          @if (
            workflow.showHosToggle() ||
            workflow.showRmcToggle() ||
            workflow.showVcToggle() ||
            workflow.showHrToggle()
          ) {
            <div class="comment-toggle-bar">
              @if (workflow.showHosToggle()) {
                <button
                  type="button"
                  class="btn btn--comment-toggle"
                  [class.btn--comment-toggle-active]="showHosComments()"
                  (click)="toggleHosComments()"
                >
                  <span class="material-icons">supervisor_account</span>
                  {{ showHosComments() ? 'Hide HOS Comments' : 'HOS Comments' }}
                </button>
              }

              @if (workflow.showRmcToggle()) {
                <button
                  type="button"
                  class="btn btn--comment-toggle"
                  [class.btn--comment-toggle-active]="showRmcComments()"
                  (click)="toggleRmcComments()"
                >
                  <span class="material-icons">verified</span>
                  {{ showRmcComments() ? 'Hide RMC Comments' : 'RMC Comments' }}
                </button>
              }

              @if (workflow.showVcToggle()) {
                <button
                  type="button"
                  class="btn btn--comment-toggle"
                  [class.btn--comment-toggle-active]="showVcComments()"
                  (click)="toggleVcComments()"
                >
                  <span class="material-icons">account_balance</span>
                  {{ showVcComments() ? 'Hide VC Comments' : 'VC Comments' }}
                </button>
              }

              @if (workflow.showHrToggle()) {
                <button
                  type="button"
                  class="btn btn--comment-toggle"
                  [class.btn--comment-toggle-active]="showHrComments()"
                  (click)="toggleHrComments()"
                >
                  <span class="material-icons">people</span>
                  {{ showHrComments() ? 'Hide HR Comments' : 'HR Comments' }}
                </button>
              }
            </div>
          }

          <!-- Form Content -->
          <div class="wizard-content application-form-surface">
            @switch (currentStep()) {
              @case (1) {
                <app-conference-details-form
                  #conferenceDetailsStep
                  [workflow]="workflow"
                  [isFormReadOnly]="workflow.isFormReadOnly()"
                >
                </app-conference-details-form>
              }
              @case (2) {
                <app-author-details-form
                  #authorDetailsStep
                  [workflow]="workflow"
                  [isFormReadOnly]="workflow.isFormReadOnly()"
                >
                </app-author-details-form>
              }
              @case (3) {
                <app-supporting-documents-form
                  #supportingDocumentsStep
                  [workflow]="workflow"
                  [isFormReadOnly]="workflow.isFormReadOnly()"
                >
                </app-supporting-documents-form>
              }
              @case (4) {
                <app-declaration-form
                  #declarationStep
                  [workflow]="workflow"
                  [isFormReadOnly]="workflow.isFormReadOnly()"
                >
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
                  [commentControl]="fc('reviewComments.hosComment')"
                >
                </app-review-block>
              }

              @if (showRmcComments()) {
                <app-review-block
                  label="RMC Comment"
                  icon="verified"
                  [visible]="true"
                  [readonly]="!workflow.isRmcEditable()"
                  [commentControl]="fc('reviewComments.rmcComment')"
                >
                </app-review-block>
              }

              @if (showVcComments()) {
                <app-review-block
                  label="VC Comment"
                  icon="account_balance"
                  [visible]="true"
                  [readonly]="!workflow.isVcEditable()"
                  [commentControl]="fc('reviewComments.vcComment')"
                >
                </app-review-block>
              }

              @if (showHrComments()) {
                <app-review-block
                  label="HR Comment"
                  icon="people"
                  [visible]="true"
                  [readonly]="!workflow.isHrEditable()"
                  [commentControl]="fc('reviewComments.hrComment')"
                >
                </app-review-block>
              }
            </div>
          }

          <!-- Submission feedback -->
          @if (submissionErrorMessage()) {
            <p class="submission-error">{{ submissionErrorMessage() }}</p>
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);

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

    .submission-error {
      color: var(--color-error-dark, #b91c1c);
      font-size: var(--fs-sm);
      margin: 0;
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
  private http = inject(HttpClient);
  private conferenceApi = inject(ConferenceApiService);
  private formStateService = inject(ConferenceFormStateService);
  private masterData = inject(MasterDataService);
  readonly guidelineContext: GuidelineContext = this.route.snapshot.queryParamMap.has('id')
    ? 'existing-application'
    : 'new-application';
  @ViewChild('guidelinesModal') guidelinesModal?: ConferenceGuidelinesModalComponent;
  @ViewChild('conferenceDetailsStep') conferenceDetailsStep?: ConferenceDetailsFormComponent;
  @ViewChild('authorDetailsStep') authorDetailsStep?: AuthorDetailsFormComponent;
  @ViewChild('supportingDocumentsStep') supportingDocumentsStep?: SupportingDocumentsFormComponent;
  @ViewChild('declarationStep') declarationStep?: DeclarationFormComponent;

  currentStep = signal(1);
  submitAttempted = signal(false);
  isSaving = signal(false);
  isSubmitting = signal(false);
  isLoadingApplication = signal(false);
  submissionErrorMessage = signal('');
  applicantDetailsForm: FormGroup;

  /** json-server record id — drives the dashboard list views. */
  private loadedAppId = signal<string | null>(null);

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

  stepStatuses = signal<StepStatus[]>([
    { visited: false, valid: false, missingFields: ['Complete Conference Details'] },
    { visited: false, valid: false, missingFields: ['Complete Author Details'] },
    { visited: false, valid: false, missingFields: ['Upload required documents'] },
    { visited: false, valid: false, missingFields: ['Complete Declaration'] },
  ]);

  constructor(private fb: FormBuilder) {
    this.applicantDetailsForm = this.fb.group({
      metadata: this.fb.group({
        applicationStatus: ['draft'],
        conferenceRequestId: [null], // the real backend's conference request id
        applicantUserId: [null],
      }),
      applicantName: [''],
      email: [''],
      schoolName: [''],
      // Review Comments
      reviewComments: this.fb.group({
        hosComment: ['', Validators.maxLength(500)],
        rmcComment: ['', Validators.maxLength(500)],
        vcComment: ['', Validators.maxLength(500)],
        hrComment: ['', Validators.maxLength(500)],
      }),
    });
  }

  /** Helper to get a FormControl from the form */
  fc(path: string): FormControl {
    return this.applicantDetailsForm.get(path) as FormControl;
  }

  openGuidelines(): void {
    this.guidelinesModal?.open();
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
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.loadApplication(id);
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
    this.applicantDetailsForm
      .get('metadata.applicationStatus')
      ?.valueChanges.subscribe((val) => {
        if (val) this.workflow.status.set(val as ConferenceStatus);
      });
  }

  private loadApplication(id: string): void {
    this.isLoadingApplication.set(true);
    this.http.get<any>(`http://localhost:3000/applications/${id}`).subscribe({
      next: (data) => {
        this.patchFromSavedData(id, data);
        this.isLoadingApplication.set(false);
      },
      error: (err) => {
        console.error('Failed to load conference application:', err);
        this.isLoadingApplication.set(false);
      },
    });
  }

  private patchFromSavedData(id: string, data: any): void {
    this.loadedAppId.set(id);
    const status = (data.workflow?.currentStatus ?? 'draft') as ConferenceStatus;

    this.applicantDetailsForm.patchValue({
      applicantName: data.applicantDetails?.applicantName ?? this.auth.currentUser()?.name ?? '',
      email: data.applicantDetails?.email ?? this.auth.currentUser()?.email ?? '',
      schoolName: data.applicantDetails?.schoolName ?? this.auth.currentUser()?.department ?? '',
      metadata: {
        applicationStatus: status,
        conferenceRequestId: data.metadata?.conferenceRequestId ?? null,
        applicantUserId: data.metadata?.applicantUserId ?? null,
      },
      reviewComments: data.reviewComments ?? {},
    });
    this.workflow.status.set(status);

    // Push each section into the shared form-state service so the active sub-form picks it up
    // the next time it (re)initializes.
    this.formStateService.clearFormState();
    if (data.conferenceDetails) {
      this.formStateService.saveFormSection('conferenceDetails', data.conferenceDetails);
    }
    if (data.authorDetails) {
      this.formStateService.saveFormSection('authorDetails', data.authorDetails);
    }
    if (data.supportingDocuments) {
      this.formStateService.saveFormSection('supportingDocuments', data.supportingDocuments);
    }
    if (data.declaration) {
      this.formStateService.saveFormSection('declaration', data.declaration);
    }

    // Seed the delete-diff tracking sets from whatever backend ids were already saved.
    const idsOf = (arr: any[] | undefined) =>
      new Set<number>((arr ?? []).map((item) => item.backendId).filter(Boolean));
    this.loadedCoAuthorIds = {
      staff: idsOf(data.authorDetails?.testSubsections),
      student: idsOf(data.authorDetails?.studentCoAuthors),
      nonApu: idsOf(data.authorDetails?.nonApuCoAuthors),
      costing: idsOf(
        data.conferenceDetails?.researchBreakdown ??
          data.conferenceDetails?.externalResearchBreakdown ??
          data.conferenceDetails?.localBreakdown,
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

  private markStepChecked(step: number) {
    this.checkedSteps.add(step);
    this.stepStatuses.update((statuses) => {
      const updated = [...statuses];
      if (updated[step - 1]) {
        updated[step - 1].visited = true;
      }
      return updated;
    });
  }

  /** Flushes whichever sub-form is currently mounted into the shared state service. */
  private flushActiveStepFormState(): void {
    this.conferenceDetailsStep?.flushFormState();
    this.authorDetailsStep?.flushFormState();
    this.supportingDocumentsStep?.flushFormState();
    this.declarationStep?.flushFormState();
  }

  // ── Real backend integration (Conference) ──────────────────────
  // The applicant-facing lifecycle (create/save/load/submit) writes through to
  // the real backend. There is no HOS/RMC/VC/HR approval action wired up in this
  // codebase yet for Conference (only comment toggles), so this only covers the
  // applicant's own submission/resubmission.

  private voteNumberIdByCode: Map<string, number> | null = null;
  private accountCodeIdByCode: Map<string, number> | null = null;
  private projectAccountCodeIdByCode: Map<string, number> | null = null;

  private loadCodeLookups(): Observable<void> {
    if (this.voteNumberIdByCode && this.accountCodeIdByCode && this.projectAccountCodeIdByCode) {
      return of(void 0);
    }
    return forkJoin([
      this.masterData.getVoteNumbers(),
      this.masterData.getAccountCodes(),
      this.masterData.getProjectAccountCodes(),
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
    const researchType = cd.researchType || '';
    const isExternal = researchType === 'external-research';
    const isResearch = researchType === 'research';

    const sponsoredAmount = isExternal
      ? cd.externalSponsoredAmountExternal
      : isResearch
        ? cd.sponsoredAmountExternal
        : cd.localSponsoredAmountExternal;
    const sponsoredBy = isExternal ? cd.externalSponsoredBy : isResearch ? cd.sponsoredBy : cd.localSponsoredBy;
    const remarks = isExternal ? cd.externalCostingRemarks : isResearch ? cd.costingRemarks : cd.localCostingRemarks;

    const toBool = (v: unknown) => v === true || v === 'yes' || v === 'true';

    return {
      conference_funding_request_type: cd.fundingRequestType || null,
      conference_type: cd.conferenceType || null,
      is_travelling_required: toBool(cd.travelRequired),
      author_role: cd.authorshipType || null,
      is_scopus_indexed: toBool(cd.scopusPublicationGuaranteed),
      is_restricted_publisher: !!cd.restrictedPublisher,
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
      project_account_code: cd.projectAccountCode || null,
      paper_title: cd.paperTitle || null,
      region_id: cd.selectedRegion ? Number(cd.selectedRegion) : null,
      is_manuscript_internally_reviewed: toBool(sd.manuscriptInternallyReviewed),
      reviewer_name: sd.reviewerName || null,
      is_published_elsewhere: toBool(sd.manuscriptPreviouslyPublished),
      external_sponsorship_amount: sponsoredAmount != null ? String(sponsoredAmount) : null,
      external_sponsored_by: sponsoredBy || null,
      remarks: remarks || null,
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
          country: raw.country || null,
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

    return this.conferenceApi.uploadAttachment(id, file, 'conference_costing_supporting_document').pipe(
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
        ? cd.externalResearchBreakdown ?? []
        : researchType === 'research'
          ? cd.researchBreakdown ?? []
          : cd.localBreakdown ?? [];

    return this.loadCodeLookups().pipe(
      switchMap(() =>
        items.length ? forkJoin(items.map((entry) => this.uploadPendingCostingFile(id, entry))) : of([]),
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
              isVoteNumberType && raw.voteNumber ? this.voteNumberIdByCode?.get(raw.voteNumber) ?? null : null,
            account_code_id:
              !isVoteNumberType && raw.voteNumber ? this.accountCodeIdByCode?.get(raw.voteNumber) ?? null : null,
            supporting_document_attachment_id: raw.supportingDocumentAttachmentId ?? null,
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
          this.conferenceApi.uploadAttachment(id, file, `conference_${field}`).pipe(
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
            const newId = (res.data as any)?.id ?? res.data?.request_id;
            if (!newId) throw new Error('Backend did not return a new Conference request id.');
            this.applicantDetailsForm
              .get('metadata.conferenceRequestId')
              ?.setValue(newId, { emitEvent: false });
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
    this.isSaving.set(true);
    this.syncToRealBackend()
      .pipe(
        catchError((err) => {
          console.error('Conference backend sync failed — draft will still save locally:', err);
          return of(null);
        }),
      )
      .subscribe(() => this.saveDraftToLocalStore());
  }

  /** json-server-backed draft save — drives the dashboard list views and the local workflow simulation. */
  private saveDraftToLocalStore(): void {
    const rawMeta = this.applicantDetailsForm.get('metadata')?.getRawValue() ?? {};
    const applicantUserId = rawMeta.applicantUserId || this.auth.currentUser()?.id || null;

    const formData: Record<string, unknown> = {
      formType: 'Conference',
      applicantDetails: {
        applicantName: this.applicantDetailsForm.get('applicantName')?.value,
        email: this.applicantDetailsForm.get('email')?.value,
        schoolName: this.applicantDetailsForm.get('schoolName')?.value,
      },
      conferenceDetails: this.formStateService.getFormSection('conferenceDetails') ?? {},
      authorDetails: this.formStateService.getFormSection('authorDetails') ?? {},
      supportingDocuments: this.formStateService.getFormSection('supportingDocuments') ?? {},
      declaration: this.formStateService.getFormSection('declaration') ?? {},
      reviewComments: this.applicantDetailsForm.get('reviewComments')?.getRawValue() ?? {},
      metadata: { ...rawMeta, applicantUserId },
      workflow: { currentStatus: rawMeta.applicationStatus ?? 'draft' },
      isDraft: (rawMeta.applicationStatus ?? 'draft') === 'draft',
      savedAt: new Date().toISOString(),
    };

    const appId = this.loadedAppId();
    const isEdit = !!appId;
    const url = isEdit
      ? `http://localhost:3000/applications/${appId}`
      : 'http://localhost:3000/applications';

    const request$ = isEdit ? this.http.put(url, formData) : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        if (!isEdit && response?.id) {
          this.loadedAppId.set(response.id);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: response.id },
            replaceUrl: true,
          });
        }
        this.isSaving.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Save draft failed:', err);
        this.isSaving.set(false);
        this.submissionErrorMessage.set('Failed to save draft. Please try again.');
      },
    });
  }

  submitForm(): void {
    this.submitAttempted.set(true);
    this.isSubmitting.set(true);

    const currentStatus = this.applicantDetailsForm.get('metadata.applicationStatus')?.value as ConferenceStatus;
    const isResubmission =
      currentStatus === 'hos_request_resubmission' || currentStatus === 'rmc_request_resubmission';
    const nextStatus: ConferenceStatus = isResubmission
      ? 'hos_pending'
      : currentStatus === 'draft'
        ? 'hos_pending'
        : currentStatus;

    this.syncToRealBackend()
      .pipe(
        switchMap((id) => {
          if (currentStatus === 'draft') return this.conferenceApi.submit(id);
          if (isResubmission) return this.conferenceApi.resubmit(id);
          return of(null);
        }),
        catchError((err) => {
          console.error('Conference backend submit sync failed — continuing with local workflow:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.applicantDetailsForm
          .get('metadata.applicationStatus')
          ?.setValue(nextStatus, { emitEvent: false });
        this.workflow.status.set(nextStatus);
        this.saveSubmissionToLocalStore();
      });
  }

  private saveSubmissionToLocalStore(): void {
    const rawMeta = this.applicantDetailsForm.get('metadata')?.getRawValue() ?? {};

    const formData: Record<string, unknown> = {
      formType: 'Conference',
      applicantDetails: {
        applicantName: this.applicantDetailsForm.get('applicantName')?.value,
        email: this.applicantDetailsForm.get('email')?.value,
        schoolName: this.applicantDetailsForm.get('schoolName')?.value,
      },
      conferenceDetails: this.formStateService.getFormSection('conferenceDetails') ?? {},
      authorDetails: this.formStateService.getFormSection('authorDetails') ?? {},
      supportingDocuments: this.formStateService.getFormSection('supportingDocuments') ?? {},
      declaration: this.formStateService.getFormSection('declaration') ?? {},
      reviewComments: this.applicantDetailsForm.get('reviewComments')?.getRawValue() ?? {},
      metadata: rawMeta,
      workflow: { currentStatus: rawMeta.applicationStatus ?? 'draft' },
      isDraft: false,
      savedAt: new Date().toISOString(),
    };

    const appId = this.loadedAppId();
    const isEdit = !!appId;
    const url = isEdit
      ? `http://localhost:3000/applications/${appId}`
      : 'http://localhost:3000/applications';
    const request$ = isEdit ? this.http.put(url, formData) : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        if (!isEdit && response?.id) {
          this.loadedAppId.set(response.id);
        }
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Submit failed:', err);
        this.isSubmitting.set(false);
        this.submissionErrorMessage.set('Failed to submit. Please try again.');
      },
    });
  }
}
