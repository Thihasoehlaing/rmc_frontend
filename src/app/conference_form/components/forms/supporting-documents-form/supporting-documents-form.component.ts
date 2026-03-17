import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';

@Component({
  selector: 'app-supporting-documents-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, NoteComponent],
  templateUrl: './supporting-documents-form.component.html',
  styleUrl: './supporting-documents-form.component.scss'
})
export class SupportingDocumentsFormComponent implements OnInit {
  form!: FormGroup;

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
    this.initializeForm();
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
      manuscriptPreviouslyPublished: ['', [Validators.required]]
    });
  }

  onFileSelected(controlName: string, file: File) {
    this.form.patchValue({
      [controlName]: file.name
    });
    this.form.get(controlName)?.markAsTouched();
  }
}
