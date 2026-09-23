import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { JournalDetails } from './components/journal-details/journal-details';
import { AuthorsDetails } from './components/authors-details/authors-details';
import { DocumentsComponent } from './components/documents/documents';
import { DeclarationComponent } from './components/declaration/declaration';
import {
  StepIndicatorComponent,
  WizardStep,
  StepStatus,
  MissingField,
} from '../../shared/components/step-indicator/step-indicator.component';
import {
  FormMainTitleComponent,
  GuidelineContext,
} from '../../shared/components/form-main-title/form-main-title.component';
import { FormWizardNavComponent } from '../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { FormValidationWarningDialogComponent } from '../../shared/components/form-validation-warning-dialog/form-validation-warning-dialog.component';
import { JournalWorkflowService } from './services/journal-workflow.service';
import { ReviewBlockComponent } from '../rdig/components/review-block/review-block.component';
import { ActivatedRoute, Router } from '@angular/router';
import {
  JournalApplicationApiService,
  JournalFormData,
  JournalCostingPayload,
  JournalRequestPayload,
} from './services/journal-application-api.service';
import { JournalOptionsService } from './services/journal-options.service';
import { ToastService } from '../../core/services/toast.service';
import { ActionLoadingService } from '../../core/services/action-loading.service';
import { AuthService } from '../../core/services/auth.service';
import {
  RequestCommentDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { environment } from '../../../environments/environment';
import { formatDisplayDateTime } from '../../shared/utils/date-time.util';

@Component({
  selector: 'app-journal-publication-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    JournalDetails,
    AuthorsDetails,
    DocumentsComponent,
    DeclarationComponent,
    StepIndicatorComponent,
    FormMainTitleComponent,
    FormWizardNavComponent,
    ReviewBlockComponent,
    FormValidationWarningDialogComponent,
  ],
  templateUrl: './journal-publication-form.component.html',
  styleUrl: './journal-publication-form.component.scss',
})
export class JournalPublicationFormComponent {
  workflow = inject(JournalWorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private journalApi = inject(JournalApplicationApiService);
  private journalOptions = inject(JournalOptionsService);
  private toastService = inject(ToastService);
  private workflowRequests = inject(WorkflowRequestsService);
  private actionLoading = inject(ActionLoadingService);
  private auth = inject(AuthService);
  requestId: number | null = this.readRequestId();
  isOptionsLoading = false;
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  showMissingFieldsWarning = false;
  sectionComments: RequestCommentDto[] = [];
  isLoadingSectionComments = false;
  readonly hasExistingRequestParam = this.hasRequestIdParam();
  readonly guidelineContext: GuidelineContext = this.hasExistingRequestParam
    ? 'existing-application'
    : 'new-application';
  /** Active Journal guideline served by the applicant-safe guideline-by-form endpoint. */
  readonly guidelinesEndpoint = `${environment.apiUrl}/admin-settings/guidelines/forms/JOURNAL`;
  reviewComments = {
    hosComment: new FormControl(''),
    rmcComment: new FormControl(''),
    vcComment: new FormControl(''),
    hrComment: new FormControl(''),
    ceoComment: new FormControl(''),
  };

  @ViewChild(JournalDetails) journalDetailsComponent?: JournalDetails;
  @ViewChild(StepIndicatorComponent) stepIndicator?: StepIndicatorComponent;
  @ViewChild(AuthorsDetails) authorsDetailsComponent?: AuthorsDetails;
  @ViewChild(DocumentsComponent) documentsComponent?: DocumentsComponent;
  @ViewChild(DeclarationComponent) declarationComponent?: DeclarationComponent;

  currentStep: number = 1;

  steps: WizardStep[] = [
    { label: 'Journal Details', icon: 'article' },
    { label: 'Authors Details', icon: 'group' },
    { label: 'Upload Supporting Documents & Manuscript Details', icon: 'upload_file' },
    { label: 'Declaration', icon: 'verified' },
  ];

  stepStatuses: StepStatus[] = [
    { visited: false, valid: true, missingFields: [] },
    { visited: false, valid: false, missingFields: ['Complete Authors Details'] },
    {
      visited: false,
      valid: false,
      missingFields: ['Complete Upload Supporting Documents & Manuscript Details'],
    },
    { visited: false, valid: false, missingFields: ['Complete Declaration'] },
  ];

  // Track form valid states
  formValid: { [key: number]: boolean } = {
    1: false,
    2: false,
    3: false,
    4: false,
  };
  private readonly checkedSteps = new Set<number>();

  private readonly journalDetailsFieldChecks = [
    { path: 'authorshipType', label: 'Author Role' },
    { path: 'scopusQuartile', label: 'Scopus Quartile' },
    { path: 'researchType', label: 'Research Type' },
    { path: 'restrictedPublisher', label: 'Restricted Publisher' },
    { path: 'citedApuPaper', label: 'APU Journal (JATI/EJBM) Citation' },
    { path: 'citedApuPaperDoi', label: 'APU Journal DOI Link' },
    { path: 'citedOtherApuPaper', label: 'Other APU-Affiliated Journal Citation' },
    { path: 'citedOtherApuPaperDoi', label: 'Other APU-Affiliated Journal DOI Link' },
    { path: 'citedOtherApuPaperReason', label: 'Other APU-Affiliated Journal Reason' },
    { path: 'journalName', label: 'Journal Name' },
    { path: 'paperTitle', label: 'Paper Title' },
    { path: 'projectAccountCode', label: 'Project Account Code' },
    { path: 'sponsoredBy', label: 'Sponsored By' },
    { path: 'costingRemarks', label: 'Costing Remarks' },
  ];

  private readonly documentFieldChecks = [
    { path: 'acceptanceNotification', label: 'Acceptance Notification' },
    { path: 'reviewersFeedback', label: "Reviewers' Feedback" },
    { path: 'scopusEvidencePublication', label: 'Screenshot of SCOPUS CiteScore' },
    { path: 'sriApproval', label: 'SRI Approval' },
    { path: 'finalPaperDraft', label: 'Final Paper Draft' },
    { path: 'journalInvoice', label: 'Journal Invoice' },
    { path: 'reviewerName', label: 'Name of Reviewer' },
    { path: 'manuscriptInternallyReviewed', label: 'Manuscript Internally Reviewed' },
    { path: 'manuscriptPreviouslyPublished', label: 'Manuscript Previously Published' },
  ];

  private readonly declarationFieldChecks = [
    { path: 'agreeToTerms', label: 'Terms Agreement' },
    { path: 'acknowledgeGrantFunder', label: 'Grant Funder Acknowledgement' },
  ];

  submitAttempted = false;
  selectedCommentSection: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo' | null = null;
  selectedFeedbackActorCode: string | null = null;

  readonly commentSections = [
    { code: 'journal_details', label: 'Journal Details', icon: 'article' },
    { code: 'authors', label: 'Authors', icon: 'group' },
    { code: 'manuscript_details', label: 'Manuscript Details', icon: 'description' },
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

  validateCurrentStep(markAsTouched: boolean = true): boolean {
    this.syncAuthorsProjectType();
    let isValid = true;
    switch (this.currentStep) {
      case 1:
        if (this.journalDetailsComponent && this.journalDetailsComponent.form?.invalid) {
          if (markAsTouched) this.journalDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        break;
      case 2:
        if (this.authorsDetailsComponent && this.authorsDetailsComponent.form?.invalid) {
          if (markAsTouched) this.authorsDetailsComponent.form.markAllAsTouched();
          isValid = false;
        }
        if (
          this.authorsDetailsComponent &&
          !this.authorsDetailsComponent.hasRequiredNonApuCoAuthor
        ) {
          if (markAsTouched) this.authorsDetailsComponent.markRequirementTouched();
          isValid = false;
        }
        break;
      case 3:
        if (this.documentsComponent && this.documentsComponent.documentsForm?.invalid) {
          if (markAsTouched) this.documentsComponent.documentsForm.markAllAsTouched();
          isValid = false;
        }
        break;
      case 4:
        if (this.declarationComponent && this.declarationComponent.declarationForm?.invalid) {
          if (markAsTouched) this.declarationComponent.declarationForm.markAllAsTouched();
          isValid = false;
        }
        break;
    }

    isValid = isValid && this.getMissingFieldsForStep(this.currentStep).length === 0;
    this.formValid[this.currentStep] = isValid;
    return isValid;
  }

  onStepClick(stepIndex: number) {
    if (stepIndex === this.currentStep) return;

    this.validateCurrentStep(false);
    this.checkedSteps.add(this.currentStep);
    this.refreshStepStatuses();
    this.currentStep = stepIndex;
  }

  goToMissingField(event: { step: number; field: MissingField }): void {
    if (event.step !== this.currentStep) {
      this.onStepClick(event.step);
    }

    const target =
      typeof event.field === 'string'
        ? event.field
        : event.field.target ?? event.field.label;

    window.setTimeout(() => {
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

  // Called by child components whenever their form validity changes.
  updateFormValidity(stepNumber: number, isValid: boolean) {
    this.formValid[stepNumber] = isValid;
    this.refreshStepStatuses();
  }

  private refreshStepStatuses(): void {
    this.stepStatuses = this.steps.map((_, index) => {
      const stepNumber = index + 1;
      const missingFields = this.getMissingFieldsForStep(stepNumber);
      const valid = missingFields.length === 0;
      this.formValid[stepNumber] = valid;
      return {
        visited: this.checkedSteps.has(stepNumber),
        valid,
        missingFields,
      };
    });
  }

  private getMissingFieldsForStep(stepNumber: number): MissingField[] {
    switch (stepNumber) {
      case 1:
        return this.getJournalDetailsMissingFields();
      case 2:
        return this.getAuthorsMissingFields();
      case 3:
        return this.getDocumentsMissingFields();
      case 4:
        return this.getDeclarationMissingFields();
      default:
        return [];
    }
  }

  private getJournalDetailsMissingFields(): MissingField[] {
    const component = this.journalDetailsComponent;
    if (!component?.form) return this.getFallbackMissingFields(1);

    const missing = this.getInvalidLabelsFromForm(
      component.form,
      this.journalDetailsFieldChecks,
    );
    const projectType = component.researchType ?? '';
    const requiresBreakdown = ['external-research', 'non-research'].includes(projectType);
    if (requiresBreakdown && component.getBreakdownArray(projectType).length === 0) {
      missing.push({ label: 'Detailed Costing Breakdown', target: 'costingBreakdown' });
    }
    return this.uniqueMissingFields(missing);
  }

  private getAuthorsMissingFields(): MissingField[] {
    const component = this.authorsDetailsComponent;
    if (!component?.form) return this.getFallbackMissingFields(2);

    const missing: MissingField[] = [];
    if (component.studentCoAuthors.invalid) {
      missing.push({ label: 'Student Co-Authors', target: 'studentCoAuthors' });
    }
    if (component.nonApuCoAuthors.invalid || !component.hasRequiredNonApuCoAuthor) {
      missing.push({ label: 'Non-APU Co-Authors', target: 'nonApuCoAuthors' });
    }
    return this.uniqueMissingFields(missing);
  }

  private getDocumentsMissingFields(): MissingField[] {
    const form = this.documentsComponent?.documentsForm;
    return form
      ? this.getInvalidLabelsFromForm(form, this.documentFieldChecks)
      : this.getFallbackMissingFields(3);
  }

  private getDeclarationMissingFields(): MissingField[] {
    const form = this.declarationComponent?.declarationForm;
    return form
      ? this.getInvalidLabelsFromForm(form, this.declarationFieldChecks)
      : this.getFallbackMissingFields(4);
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

  private getFallbackMissingFields(stepNumber: number): MissingField[] {
    return this.formValid[stepNumber]
      ? []
      : [{ label: `Complete ${this.steps[stepNumber - 1]?.label ?? `Step ${stepNumber}`}` }];
  }

  private uniqueMissingFields(fields: MissingField[]): MissingField[] {
    const seen = new Set<string>();
    return fields.filter((field) => {
      const key =
        typeof field === 'string' ? field : `${field.label}:${field.target ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getSafeMissingFieldFocusTarget(
    element?: HTMLElement | null,
  ): HTMLElement | undefined {
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
      'button, select, input[type="date"], input[type="datetime-local"], [role="button"], [role="combobox"]',
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

  private syncAuthorsProjectType(): void {
    this.authorsDetailsComponent?.setProjectType(
      this.journalDetailsComponent?.researchType ?? null,
    );
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  readonly isSaving = signal(false);
  readonly isSubmitting = signal(false);
  readonly saveSuccess = signal(false);
  readonly submitSuccess = signal(false);
  readonly isAdminReadOnlyDraft = signal(false);

  constructor() {
    this.loadOptionsAndInitialForm();
  }

  private loadOptionsAndInitialForm(): void {
    this.loadError.set(null);
    this.journalOptions.reloadFromStorage();

    this.journalOptions.loadBackendOptions().subscribe({
      next: () => {
        setTimeout(() => {
          this.loadError.set(null);
        });
      },
      error: () => {
        setTimeout(() => {
          this.loadError.set('Using local options because backend options could not be loaded.');
        });
      },
    });

    if (this.requestId) {
      setTimeout(() => void this.loadExistingForm(this.requestId as number));
    }
  }

  private async loadExistingForm(requestId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.journalApi.getForm(requestId));
      // The editable wizard is only for a still-draft application. Once
      // submitted, the application is shown in the read-only reviewer view —
      // so reviewers/approvers (and the applicant after submission) get that
      // view instead of the filling form.
      const status = String(response.data?.request?.status_code ?? '').toLowerCase();
      const isApplicantEditable = [
        'draft',
        'fill_application',
        'normal_application',
        'pending_applicant_resubmission_hos',
        'pending_applicant_resubmission_rmc',
      ].includes(status);
      if (!isApplicantEditable) {
        void this.router.navigateByUrl(this.journalDetailPath(response.data, requestId));
        return;
      }
      this.isAdminReadOnlyDraft.set(this.isSystemAdminReadOnlyRequest(response.data?.request ?? {}));
      this.hydrateFromApi(response.data);
      await this.loadSectionComments(requestId);
    } catch {
      setTimeout(() => {
        this.actionError.set('Unable to load this journal application.');
      });
    }
  }

  onNext() {
    if (this.isSaving() || this.isSubmitting() || this.isOptionsLoading) return;
    if (this.currentStep < this.totalSteps) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep + 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onPrev() {
    if (this.isSaving() || this.isSubmitting() || this.isOptionsLoading) return;
    if (this.currentStep > 1) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep - 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  async onSaveDraft() {
    if (this.isAdminReadOnlyDraft()) {
      this.actionError.set('System Admin can view this draft only. Save is disabled.');
      return;
    }

    if (this.isSaving() || this.isSubmitting() || this.isOptionsLoading) return;
    this.isSaving.set(true);
    this.actionError.set(null);
    this.saveSuccess.set(false);

    try {
      await this.saveDraftToBackend();
      this.saveSuccess.set(true);
      this.toastService.success('Journal draft saved.');
      setTimeout(() => {
        this.saveSuccess.set(false);
      }, 3000);
    } catch (error) {
      this.actionError.set(this.extractErrorMessage(error, 'Unable to save journal draft.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  async onSubmit() {
    if (this.isAdminReadOnlyDraft()) {
      this.actionError.set('System Admin can view this draft only. Submit is disabled.');
      return;
    }

    if (this.isSaving() || this.isSubmitting() || this.isOptionsLoading) return;
    this.submitAttempted = true;
    this.validateCurrentStep(true);
    this.syncAuthorsProjectType();
    if (this.authorsDetailsComponent) {
      const authorsValid =
        this.authorsDetailsComponent.form.valid &&
        this.authorsDetailsComponent.hasRequiredNonApuCoAuthor;
      if (!authorsValid) {
        this.authorsDetailsComponent.markRequirementTouched();
      }
      this.formValid[2] = authorsValid;
    }

    this.steps.forEach((_, index) => this.checkedSteps.add(index + 1));
    this.refreshStepStatuses();

    const allValid = Object.values(this.formValid).every(Boolean);
    if (!allValid) {
      this.showMissingFieldsWarning = true;
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      return;
    }

    this.showMissingFieldsWarning = false;

    this.isSubmitting.set(true);
    this.actionError.set(null);
    this.submitSuccess.set(false);
    const isResubmission = this.workflow.status().includes('resubmission');
    const loadingId = this.actionLoading.begin(
      isResubmission ? 'Resubmitting journal application' : 'Submitting journal application',
    );

    try {
      const requestId = await this.saveDraftToBackend();
      await firstValueFrom(this.journalApi.submit(requestId));
      this.submitSuccess.set(true);
      await this.router.navigateByUrl('/submissions/pending?tab=all');
    } catch (error) {
      this.actionError.set(
        this.extractErrorMessage(error, 'Unable to submit journal application.'),
      );
    } finally {
      this.isSubmitting.set(false);
      this.actionLoading.end(loadingId);
    }
  }

  onMissingFieldsWarningClosed(): void {
    this.showMissingFieldsWarning = false;
    this.stepIndicator?.showMissingFieldPrompt();
  }

  toggleCommentSection(section: 'hos' | 'rmc' | 'vc' | 'hr' | 'ceo') {
    if (this.selectedCommentSection === section) {
      this.selectedCommentSection = null;
    } else {
      this.selectedCommentSection = section;
    }
  }

  commentsForSection(sectionCode: string): RequestCommentDto[] {
    return this.sectionComments.filter((comment) => comment.section_code === sectionCode);
  }

  commentsForActor(actorCode: string | null): RequestCommentDto[] {
    if (!actorCode) return [];
    return this.sectionComments.filter(
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

  sectionsWithComments(): typeof this.commentSections {
    return this.commentSections.filter(
      (section) => this.commentsForSection(section.code).length > 0,
    );
  }

  sectionsWithCommentsForActor(actorCode: string | null): typeof this.commentSections {
    if (!actorCode) return [];
    return this.commentSections.filter(
      (section) => this.commentsForActorSection(actorCode, section.code).length > 0,
    );
  }

  hasSectionComments(): boolean {
    return this.sectionComments.length > 0;
  }

  toggleFeedbackActor(actorCode: string): void {
    this.selectedFeedbackActorCode =
      this.selectedFeedbackActorCode === actorCode ? null : actorCode;
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

  private async saveDraftToBackend(): Promise<number> {
    const sponsorshipError = this.journalDetailsComponent?.getExternalSponsorshipLimitError();
    if (sponsorshipError) {
      throw new Error(sponsorshipError);
    }

    const payload = this.buildJournalPayload();
    const requestId = await this.ensureDraftRequest(payload);

    await firstValueFrom(this.journalApi.updateDraft(requestId, payload));
    await this.replaceCostingItems(requestId);
    await firstValueFrom(this.journalApi.updateDraft(requestId, payload));
    await this.uploadPendingAttachments(requestId);
    await this.replaceAuthors(requestId);

    const refreshed = await firstValueFrom(this.journalApi.getForm(requestId));
    this.hydrateFromApi(refreshed.data);
    return requestId;
  }

  private async ensureDraftRequest(payload: JournalRequestPayload): Promise<number> {
    if (this.requestId) {
      return this.requestId;
    }

    const response = await firstValueFrom(this.journalApi.createDraft(payload));
    const requestId = Number(response.data.request?.id ?? response.data.request?.request_id);
    this.requestId = requestId;
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { request_id: requestId, id: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    return requestId;
  }

  private async loadSectionComments(requestId: number): Promise<void> {
    this.isLoadingSectionComments = true;
    try {
      const response = await firstValueFrom(this.workflowRequests.getComments(requestId));
      const sectionComments = (response.data ?? [])
        .filter((comment) => comment.comment_type === 'section_review')
        .sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        );
      setTimeout(() => {
        this.sectionComments = sectionComments;
        this.selectedFeedbackActorCode = this.actorTabsWithComments()[0]?.code ?? null;
        this.isLoadingSectionComments = false;
      });
    } catch {
      setTimeout(() => {
        this.sectionComments = [];
        this.selectedFeedbackActorCode = null;
        this.isLoadingSectionComments = false;
      });
    }
  }

  private normalizeActorCode(actorCode: string | null | undefined): string {
    const actor = (actorCode ?? '').toUpperCase();
    if (actor === 'HOS' || actor === 'HOD') return 'HOS_HOD';
    return actor;
  }

  private buildJournalPayload(): JournalRequestPayload {
    return {
      ...(this.journalDetailsComponent?.getJournalPayload() ?? {}),
      ...(this.documentsComponent?.getJournalPayload() ?? {}),
      ...(this.declarationComponent?.getJournalPayload() ?? {}),
    };
  }

  private async replaceCostingItems(requestId: number): Promise<void> {
    const existing = await firstValueFrom(this.journalApi.getForm(requestId));
    for (const item of existing.data.costing_items || []) {
      await firstValueFrom(this.journalApi.deleteCostingItem(requestId, item.id));
    }

    for (const item of this.journalDetailsComponent?.getCostingSaveItems() ?? []) {
      const payload = await this.attachCostingSupportingDocument(
        requestId,
        item.payload,
        item.file,
      );
      await firstValueFrom(this.journalApi.createCostingItem(requestId, payload));
    }
  }

  private async attachCostingSupportingDocument(
    requestId: number,
    payload: JournalCostingPayload,
    file?: File | null,
  ): Promise<JournalCostingPayload> {
    if (!file) {
      return payload;
    }

    const entityType =
      this.journalDetailsComponent?.researchType === 'non-research'
        ? 'non_research_project_supporting_document'
        : 'external_research_project_supporting_document';
    const response = await firstValueFrom(
      this.journalApi.uploadAttachment(requestId, {
        file,
        entity_type: entityType,
      }),
    );
    const attachmentId = Number(response.data?.id);
    return {
      ...payload,
      supporting_document_attachment_id:
        Number.isFinite(attachmentId) && attachmentId > 0
          ? attachmentId
          : payload.supporting_document_attachment_id,
    };
  }

  private async uploadPendingAttachments(requestId: number): Promise<void> {
    const uploads = this.documentsComponent?.getPendingAttachmentUploads() ?? [];
    for (const upload of uploads) {
      await firstValueFrom(this.journalApi.uploadAttachment(requestId, upload));
    }
    if (uploads.length) {
      this.documentsComponent?.markPendingAttachmentUploadsSaved();
    }
  }

  private async replaceAuthors(requestId: number): Promise<void> {
    const existing = await firstValueFrom(this.journalApi.getForm(requestId));

    for (const item of existing.data.apu_staff_co_authors || []) {
      await firstValueFrom(this.journalApi.deleteStaffAuthor(requestId, item.id));
    }
    for (const item of existing.data.apu_student_co_authors || []) {
      await firstValueFrom(this.journalApi.deleteStudentAuthor(requestId, item.id));
    }
    for (const item of existing.data.non_apu_co_authors || []) {
      await firstValueFrom(this.journalApi.deleteNonApuAuthor(requestId, item.id));
    }

    for (const payload of this.authorsDetailsComponent?.getStaffAuthorPayloads() ?? []) {
      await firstValueFrom(this.journalApi.createStaffAuthor(requestId, payload));
    }
    for (const payload of this.authorsDetailsComponent?.getStudentAuthorPayloads() ?? []) {
      await firstValueFrom(this.journalApi.createStudentAuthor(requestId, payload));
    }
    for (const payload of this.authorsDetailsComponent?.getNonApuAuthorPayloads() ?? []) {
      await firstValueFrom(this.journalApi.createNonApuAuthor(requestId, payload));
    }
  }

  private hydrateFromApi(data: JournalFormData): void {
    this.journalDetailsComponent?.hydrateFromApi(data);
    this.authorsDetailsComponent?.hydrateFromApi(data);
    this.documentsComponent?.hydrateFromApi(data);
    this.declarationComponent?.hydrateFromApi(data);

    const status = data.request?.status_code;
    if (status) {
      this.workflow.status.set(status as any);
    }
  }

  private journalDetailPath(data: JournalFormData, requestId: number): string {
    const request = data.request ?? {};
    const code = request.request_code ?? request.request_no ?? request.code;
    return code
      ? `/journal/detail/${encodeURIComponent(String(code))}`
      : `/submissions/detail/${requestId}`;
  }

  private readRequestId(): number | null {
    const params = this.route.snapshot.queryParamMap;
    const rawId = params.get('request_id') ?? params.get('id');
    const requestId = Number(rawId);
    return Number.isFinite(requestId) && requestId > 0 ? requestId : null;
  }

  private hasRequestIdParam(): boolean {
    const params = this.route.snapshot.queryParamMap;
    return params.has('request_id') || params.has('id');
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const maybeError = error as { error?: { message?: string }; message?: string };
    return maybeError?.error?.message || maybeError?.message || fallback;
  }

  isEffectiveFormReadOnly(): boolean {
    return this.workflow.isFormReadOnly() || this.isAdminReadOnlyDraft();
  }

  private isSystemAdminReadOnlyRequest(request: Record<string, unknown>): boolean {
    if (!this.auth.inGroup('SystemAdmin')) return false;
    const adminView = this.route.snapshot.queryParamMap.get('admin_view')?.toLowerCase() === 'true';
    const applicantUsername = String(request['applicant_staff_username'] ?? '').trim().toLowerCase();
    const currentUsername = this.auth.currentUser()?.username?.trim().toLowerCase();
    return adminView || Boolean(applicantUsername && currentUsername && applicantUsername !== currentUsername);
  }
}
