import { Component, OnInit, ViewChild, inject, effect, Output, EventEmitter } from '@angular/core';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import {
  JournalAttachmentUpload,
  JournalFormData,
  JournalRequestPayload,
} from '../../services/journal-application-api.service';

interface PendingDocumentUpload {
  controlName: string;
  entityType: string;
  file: File;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileUploadComponent,
    NoteComponent,
    ValidationMessageComponent,
    CustomHeaderComponent,
    CharacterCounterComponent,
    DialogComponent,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class DocumentsComponent implements OnInit {
  @Output() formValidityChange = new EventEmitter<boolean>();
  documentsForm!: FormGroup;
  isPreviouslyPublishedWarningOpen = false;
  uploadedFileUrlsByControl: Record<string, string> = {};
  private uploadedFileNamesByControl: Record<string, string> = {};

  // References to file upload components for manual reset if needed
  @ViewChild('acceptanceNotificationUpload', { static: false })
  acceptanceNotificationUpload?: FileUploadComponent;
  @ViewChild('reviewersFeedbackUpload', { static: false })
  reviewersFeedbackUpload?: FileUploadComponent;
  @ViewChild('scopusEvidenceUpload', { static: false }) scopusEvidenceUpload?: FileUploadComponent;
  @ViewChild('sriApprovalUpload', { static: false }) sriApprovalUpload?: FileUploadComponent;
  @ViewChild('turnitinReportUpload', { static: false }) turnitinReportUpload?: FileUploadComponent;
  @ViewChild('finalPaperUpload', { static: false }) finalPaperUpload?: FileUploadComponent;
  @ViewChild('journalInvoiceUpload', { static: false }) journalInvoiceUpload?: FileUploadComponent;
  // File constants
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 4;
  private readonly documentEntityTypes: Record<string, string> = {
    acceptanceNotification: 'acceptance_notification',
    reviewersFeedback: 'reviewers_feedback',
    scopusEvidencePublication: 'scopus_citescore_screenshot',
    sriApproval: 'sri_approval',
    turnitinReport: 'turnitin_report',
    finalPaperDraft: 'final_paper_draft',
    journalInvoice: 'journal_invoice',
  };
  private pendingUploads = new Map<string, PendingDocumentUpload>();

  workflow = inject(JournalWorkflowService);

  constructor(private fb: FormBuilder) {
    effect(() => {
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.documentsForm?.disable({ emitEvent: false });
        } else {
          this.documentsForm?.enable({ emitEvent: false });
        }
      }, 0);
    });
  }

  ngOnInit() {
    this.initializeDocumentsForm();
  }

  initializeDocumentsForm() {
    this.documentsForm = this.fb.group({
      acceptanceNotification: ['', Validators.required],
      reviewersFeedback: ['', Validators.required],
      scopusEvidencePublication: ['', Validators.required],
      sriApproval: ['', Validators.required],
      turnitinReport: ['', Validators.required],
      finalPaperDraft: ['', Validators.required],
      journalInvoice: ['', Validators.required],
      manuscriptInternallyReviewed: ['', Validators.required],
      reviewerName: ['', [Validators.required, Validators.maxLength(100)]],
      manuscriptPreviouslyPublished: ['', [Validators.required, this.previouslyPublishedValidator]],
    });

    this.documentsForm.statusChanges.subscribe((status) => {
      this.formValidityChange.emit(status === 'VALID');
    });
    this.formValidityChange.emit(this.documentsForm.valid);
  }

  getJournalPayload(): JournalRequestPayload {
    const value = this.documentsForm.getRawValue();
    return {
      reviewer_name: value.reviewerName || null,
      is_manuscript_internally_reviewed: this.toOptionalBoolean(value.manuscriptInternallyReviewed),
      is_published_elsewhere: this.toOptionalBoolean(value.manuscriptPreviouslyPublished),
    };
  }

  hydrateFromApi(data: JournalFormData): void {
    const journal = data.journal;
    if (!journal || !this.documentsForm) {
      return;
    }

    const attachmentNames = this.attachmentNamesByControl(data.attachments || []);
    const attachmentUrls = this.attachmentUrlsByControl(data.attachments || []);
    this.uploadedFileNamesByControl = attachmentNames;
    this.uploadedFileUrlsByControl = attachmentUrls;
    this.documentsForm.patchValue(
      {
        ...attachmentNames,
        reviewerName: journal.reviewer_name || '',
        manuscriptInternallyReviewed: this.fromOptionalBoolean(
          journal.is_manuscript_internally_reviewed,
        ),
        manuscriptPreviouslyPublished: this.fromOptionalBoolean(journal.is_published_elsewhere),
      },
      { emitEvent: false },
    );
    this.formValidityChange.emit(this.documentsForm.valid);
  }

  onDocumentSelected(controlName: string, file: File | null) {
    if (file) {
      this.pendingUploads.set(controlName, {
        controlName,
        entityType: this.documentEntityTypes[controlName] || controlName,
        file,
      });
      this.documentsForm.patchValue({
        [controlName]: file.name,
      });
    } else {
      this.pendingUploads.delete(controlName);
      this.documentsForm.patchValue({
        [controlName]: this.uploadedFileNamesByControl[controlName] || null,
      });
    }
    this.documentsForm.get(controlName)?.markAsTouched();
  }

  getPendingAttachmentUploads(): JournalAttachmentUpload[] {
    return [...this.pendingUploads.values()].map((upload) => ({
      file: upload.file,
      entity_type: upload.entityType,
    }));
  }

  markPendingAttachmentUploadsSaved(): void {
    this.pendingUploads.clear();
  }

  /**
   * Strip digit characters from name text inputs.
   * Bound to (input) on name fields to prevent numeric entry.
   */
  stripDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      const ctrl = this.documentsForm.get(input.getAttribute('formControlName') || input.id || '');
      if (ctrl) {
        ctrl.setValue(cleaned, { emitEvent: true });
      }
    }
  }

  showPreviouslyPublishedWarning(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.documentsForm.get('manuscriptPreviouslyPublished')?.markAsTouched();
    this.isPreviouslyPublishedWarningOpen = true;
  }

  closePreviouslyPublishedWarning(): void {
    this.isPreviouslyPublishedWarningOpen = false;
  }

  private previouslyPublishedValidator(control: AbstractControl): ValidationErrors | null {
    return control.value === 'yes' ? { previouslyPublishedNotAllowed: true } : null;
  }
  private toOptionalBoolean(value: unknown): boolean | undefined {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return undefined;
  }

  private fromOptionalBoolean(value: unknown): 'yes' | 'no' | '' {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return '';
  }

  private attachmentNamesByControl(attachments: any[]): Record<string, string> {
    return this.attachmentValuesByControl(attachments, (attachment) => attachment.file_name || '');
  }

  private attachmentUrlsByControl(attachments: any[]): Record<string, string> {
    return this.attachmentValuesByControl(
      attachments,
      (attachment) => attachment.download_url || attachment.file_url || attachment.url || '',
    );
  }

  private attachmentValuesByControl(
    attachments: any[],
    valueForAttachment: (attachment: any) => string,
  ): Record<string, string> {
    const entityToControl = new Map(
      Object.entries(this.documentEntityTypes).map(([control, entity]) => [entity, control]),
    );
    entityToControl.set('scopus_evidence_publication', 'scopusEvidencePublication');
    const values: Record<string, string> = {};

    for (const attachment of attachments) {
      const controlName = entityToControl.get(attachment.entity_type);
      if (controlName && !values[controlName]) {
        values[controlName] = valueForAttachment(attachment);
      }
    }

    return values;
  }
}
