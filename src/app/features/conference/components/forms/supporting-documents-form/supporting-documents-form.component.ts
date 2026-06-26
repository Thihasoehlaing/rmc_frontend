import { Component, OnInit, OnDestroy, ViewChild, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadComponent } from '../../../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../../../shared/components/note/note.component';
import { CustomSubheaderComponent } from '../../../../../shared/components/custom-subheader/custom-subheader.component';
import { CustomHeaderComponent } from '../../../../../shared/components/custom-header/custom-header.component';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';

@Component({
  selector: 'app-supporting-documents-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileUploadComponent,
    NoteComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
  ],
  templateUrl: './supporting-documents-form.component.html',
  styleUrl: './supporting-documents-form.component.scss',
})
export class SupportingDocumentsFormComponent implements OnInit, OnDestroy {
  @Input() workflow?: ConferenceWorkflowService;
  @Input() isFormReadOnly: boolean = false;

  form!: FormGroup;

  // References to file upload components for manual reset if needed
  @ViewChild('acceptanceNotificationUpload', { static: false })
  acceptanceNotificationUpload?: FileUploadComponent;
  @ViewChild('reviewersFeedbackUpload', { static: false })
  reviewersFeedbackUpload?: FileUploadComponent;
  @ViewChild('scopusEvidenceUpload', { static: false }) scopusEvidenceUpload?: FileUploadComponent;
  @ViewChild('turnitinReportUpload', { static: false }) turnitinReportUpload?: FileUploadComponent;
  @ViewChild('finalPaperUpload', { static: false }) finalPaperUpload?: FileUploadComponent;
  @ViewChild('conferenceInvoiceUpload', { static: false })
  conferenceInvoiceUpload?: FileUploadComponent;
  // File constants
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 10;

  constructor(
    private fb: FormBuilder,
    private formStateService: ConferenceFormStateService,
  ) {
    effect(() => {
      if (this.workflow?.isFormReadOnly()) {
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
      acceptanceNotification: ['', [Validators.required]],
      reviewersFeedback: ['', [Validators.required]],
      scopusEvidencePublication: ['', [Validators.required]],
      turnitinReport: ['', [Validators.required]],
      finalPaperDraft: ['', [Validators.required]],
      conferenceInvoice: ['', [Validators.required]],
      manuscriptInternallyReviewed: ['', [Validators.required]],
      reviewerName: ['', [Validators.required]],
      manuscriptPreviouslyPublished: ['', [Validators.required]],
    });
  }

  /**
   * Load form state from the state service
   */
  private loadFormState() {
    const savedState = this.formStateService.getFormSection('supportingDocuments');
    if (savedState) {
      this.form.patchValue(savedState, { emitEvent: false });
    }
  }

  /**
   * Save form state to the state service
   */
  private saveFormState() {
    if (this.form) {
      this.formStateService.saveFormSection('supportingDocuments', this.form.getRawValue());
    }
  }

  onFileSelected(controlName: string, file: File) {
    this.form.patchValue({
      [controlName]: file.name,
    });
    this.form.get(controlName)?.markAsTouched();
  }

  canUploadDocuments(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'draft',
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission',
    ];
    return allowedStatuses.includes(status);
  }
}
