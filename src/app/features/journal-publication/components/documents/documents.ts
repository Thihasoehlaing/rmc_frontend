import { Component, OnInit, ViewChild, inject, effect, Output, EventEmitter } from '@angular/core';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../../shared/components/note/note.component'; 
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { JournalFormData, JournalRequestPayload } from '../../services/journal-application-api.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, NoteComponent, CustomHeaderComponent],
  templateUrl: './documents.html',
  styleUrl: './documents.scss'
})
export class DocumentsComponent implements OnInit {
  @Output() formValidityChange = new EventEmitter<boolean>();
  documentsForm!: FormGroup;

  // References to file upload components for manual reset if needed
  @ViewChild('acceptanceNotificationUpload', { static: false }) acceptanceNotificationUpload?: FileUploadComponent;
  @ViewChild('reviewersFeedbackUpload', { static: false }) reviewersFeedbackUpload?: FileUploadComponent;
  @ViewChild('scopusEvidenceUpload', { static: false }) scopusEvidenceUpload?: FileUploadComponent;
  @ViewChild('turnitinReportUpload', { static: false }) turnitinReportUpload?: FileUploadComponent;
  @ViewChild('finalPaperUpload', { static: false }) finalPaperUpload?: FileUploadComponent;
  @ViewChild('journalInvoiceUpload', { static: false }) journalInvoiceUpload?: FileUploadComponent;
  // File constants
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 10;

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
      acceptanceNotification: [''],
      reviewersFeedback: [''],
      scopusEvidencePublication: [''],
      turnitinReport: [''],
      finalPaperDraft: [''],
      journalInvoice: [''],
      manuscriptInternallyReviewed: [''],
      reviewerName: [''],
      manuscriptPreviouslyPublished: ['']
    });

    this.documentsForm.statusChanges.subscribe(status => {
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

    this.documentsForm.patchValue(
      {
        reviewerName: journal.reviewer_name || '',
        manuscriptInternallyReviewed: this.fromOptionalBoolean(journal.is_manuscript_internally_reviewed),
        manuscriptPreviouslyPublished: this.fromOptionalBoolean(journal.is_published_elsewhere),
      },
      { emitEvent: false },
    );
  }

  onDocumentSelected(controlName: string, file: File | null) {
    if (file) {
      this.documentsForm.patchValue({
        [controlName]: file.name
      });
    } else {
      this.documentsForm.patchValue({
        [controlName]: null
      });
    }
    this.documentsForm.get(controlName)?.markAsTouched();
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
}
