import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../shared/components/note/note.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, NoteComponent],
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
  @ViewChild('conferenceInvoiceUpload', { static: false }) conferenceInvoiceUpload?: FileUploadComponent;
  // File constants
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 10;

  constructor(private fb: FormBuilder) {}

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
      conferenceInvoice: ['', [Validators.required]],
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