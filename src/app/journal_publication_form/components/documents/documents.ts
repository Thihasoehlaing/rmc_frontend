import { Component, OnInit, ViewChild, inject, effect } from '@angular/core';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CommonModule } from '@angular/common';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../shared/components/note/note.component'; 
import { JournalWorkflowService } from '../../services/journal-workflow.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, NoteComponent, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent],
  templateUrl: './documents.html',
  styleUrl: './documents.scss'
})
export class DocumentsComponent implements OnInit {
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
      acceptanceNotification: ['', [Validators.required]],
      reviewersFeedback: ['', [Validators.required]],
      scopusEvidencePublication: ['', [Validators.required]],
      turnitinReport: ['', [Validators.required]],
      finalPaperDraft: ['', [Validators.required]],
      journalInvoice: ['', [Validators.required]],
      manuscriptInternallyReviewed: ['', [Validators.required]],
      reviewerName: ['', [Validators.required]],
      manuscriptPreviouslyPublished: ['', [Validators.required]]
    });
  }

  onDocumentSelected(controlName: string, file: File) {
    this.documentsForm.patchValue({
      [controlName]: file.name
    });
    this.documentsForm.get(controlName)?.markAsTouched();
  }
}