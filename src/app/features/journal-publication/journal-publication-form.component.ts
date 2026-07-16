import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { JournalDetails } from './components/journal-details/journal-details';
import { AuthorsDetails } from './components/authors-details/authors-details';
import { DocumentsComponent } from './components/documents/documents';
import { DeclarationComponent } from './components/declaration/declaration';
import {
  StepIndicatorComponent,
  WizardStep,
  StepStatus,
} from '../../shared/components/step-indicator/step-indicator.component';
import {
  FormMainTitleComponent,
  GuidelineContext,
} from '../../shared/components/form-main-title/form-main-title.component';
import { FormWizardNavComponent } from '../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { JournalWorkflowService } from './services/journal-workflow.service';
import { ReviewBlockComponent } from '../rdig/components/review-block/review-block.component';
import { JournalGuidelinesModalComponent } from './components/journal-guidelines-modal/journal-guidelines-modal.component';
import { ActivatedRoute, Router } from '@angular/router';
import {
  JournalApplicationApiService,
  JournalFormData,
  JournalCostingPayload,
  JournalRequestPayload,
} from './services/journal-application-api.service';
import { JournalOptionsService } from './services/journal-options.service';
import { ToastService } from '../../core/services/toast.service';
import {
  RequestCommentDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';

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
    JournalGuidelinesModalComponent,
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
  requestId: number | null = this.readRequestId();
  isOptionsLoading = false;
  loadError: string | null = null;
  actionError: string | null = null;
  sectionComments: RequestCommentDto[] = [];
  isLoadingSectionComments = false;
  readonly hasExistingRequestParam = this.hasRequestIdParam();
  readonly guidelineContext: GuidelineContext = this.hasExistingRequestParam
    ? 'existing-application'
    : 'new-application';
  reviewComments = {
    hosComment: new FormControl(''),
    rmcComment: new FormControl(''),
    vcComment: new FormControl(''),
    hrComment: new FormControl(''),
    ceoComment: new FormControl(''),
  };

  @ViewChild(JournalDetails) journalDetailsComponent?: JournalDetails;
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
    { visited: false, valid: true, missingFields: [] },
    { visited: false, valid: false, missingFields: ['Complete Declaration'] },
  ];

  // Track form valid states
  formValid: { [key: number]: boolean } = {
    1: false,
    2: false,
    3: true,
    4: false,
  };

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

    this.formValid[this.currentStep] = isValid;
    return isValid;
  }

  onStepClick(stepIndex: number) {
    if (stepIndex === this.currentStep) return;

    this.validateCurrentStep(false);
    this.stepStatuses[this.currentStep - 1] = {
      visited: true,
      valid: this.formValid[this.currentStep] || false,
      missingFields: this.formValid[this.currentStep]
        ? []
        : [this.getStepMissingLabel(this.currentStep)],
    };

    this.currentStep = stepIndex;
    this.stepStatuses = [...this.stepStatuses];
  }

  // Call this from child components when their form changes
  updateFormValidity(stepNumber: number, isValid: boolean) {
    this.formValid[stepNumber] = isValid;
    if (this.stepStatuses[stepNumber - 1]) {
      this.stepStatuses[stepNumber - 1].valid = isValid;
      this.stepStatuses[stepNumber - 1].missingFields = isValid
        ? []
        : [this.getStepMissingLabel(stepNumber)];
      this.stepStatuses = [...this.stepStatuses]; // Trigger change detection
    }
  }

  private getStepMissingLabel(stepNumber: number): string {
    return `Complete ${this.steps[stepNumber - 1]?.label ?? `Step ${stepNumber}`}`;
  }

  private syncAuthorsProjectType(): void {
    this.authorsDetailsComponent?.setProjectType(
      this.journalDetailsComponent?.researchType ?? null,
    );
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  isSaving = false;
  isSubmitting = false;
  saveSuccess = false;
  submitSuccess = false;

  constructor() {
    this.loadOptionsAndInitialForm();
  }

  private loadOptionsAndInitialForm(): void {
    this.loadError = null;
    this.journalOptions.reloadFromStorage();

    this.journalOptions.loadBackendOptions().subscribe({
      next: () => {
        setTimeout(() => {
          this.loadError = null;
        });
      },
      error: () => {
        setTimeout(() => {
          this.loadError = 'Using local options because backend options could not be loaded.';
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
      this.hydrateFromApi(response.data);
      await this.loadSectionComments(requestId);
    } catch {
      setTimeout(() => {
        this.actionError = 'Unable to load this journal application.';
      });
    }
  }

  onNext() {
    if (this.isSaving || this.isSubmitting || this.isOptionsLoading) return;
    if (this.currentStep < this.totalSteps) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep + 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onPrev() {
    if (this.isSaving || this.isSubmitting || this.isOptionsLoading) return;
    if (this.currentStep > 1) {
      const prevStep = this.currentStep;
      this.onStepClick(this.currentStep - 1);
      if (this.currentStep !== prevStep) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  async onSaveDraft() {
    if (this.isSaving || this.isSubmitting || this.isOptionsLoading) return;
    this.isSaving = true;
    this.actionError = null;
    this.saveSuccess = false;

    try {
      await this.saveDraftToBackend();
      this.saveSuccess = true;
      this.toastService.success('Journal draft saved.');
      setTimeout(() => {
        this.saveSuccess = false;
      }, 3000);
    } catch (error) {
      this.actionError = this.extractErrorMessage(error, 'Unable to save journal draft.');
    } finally {
      this.isSaving = false;
    }
  }

  async onSubmit() {
    if (this.isSaving || this.isSubmitting || this.isOptionsLoading) return;
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

    this.stepStatuses = this.stepStatuses.map((status, index) => ({
      ...status,
      visited: true,
      valid: this.formValid[index + 1] || false,
    }));

    const allValid = Object.values(this.formValid).every(Boolean);
    if (!allValid) {
      return;
    }

    this.isSubmitting = true;
    this.actionError = null;
    this.submitSuccess = false;

    try {
      const requestId = await this.saveDraftToBackend();
      await firstValueFrom(this.journalApi.submit(requestId));
      this.submitSuccess = true;
      await this.router.navigateByUrl('/submissions/pending?tab=all');
    } catch (error) {
      this.actionError = this.extractErrorMessage(error, 'Unable to submit journal application.');
    } finally {
      this.isSubmitting = false;
    }
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

  commentsForActor(actorCode: string): RequestCommentDto[] {
    return this.sectionComments.filter(
      (comment) => this.normalizeActorCode(comment.actor_type_code) === actorCode,
    );
  }

  commentsForActorSection(actorCode: string, sectionCode: string): RequestCommentDto[] {
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
    return iso
      ? new Date(iso).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';
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
}
