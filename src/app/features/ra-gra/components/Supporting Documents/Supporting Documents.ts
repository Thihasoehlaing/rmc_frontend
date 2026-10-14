import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

interface DocumentConfig {
  id: number;
  title: string;
  description: string;
  required: boolean;
}

@Component({
  selector: 'app-ragra-supporting-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './Supporting Documents.html',
  styleUrls: ['./Supporting Documents.scss']
})
export class SupportingDocumentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  form!: FormGroup;
  @Output() formValidityChange = new EventEmitter<boolean>();

  documents: DocumentConfig[] = [
    {
      id: 1,
      title: 'Employment Application Form',
      description: 'Official RA/GRA employment application form',
      required: true
    },
    {
      id: 2,
      title: 'Copy of Academic Transcripts',
      description: 'Official academic transcripts from your institution',
      required: true
    },
    {
      id: 3,
      title: "RA/GRA's CV",
      description: 'Current curriculum vitae or resume',
      required: true
    },
    {
      id: 4,
      title: 'Print Screen of Bank Statement',
      description: 'Recent bank account statement for salary processing',
      required: true
    },
    {
      id: 5,
      title: 'Recruitment Submission Form',
      description: 'HR recruitment and approval form',
      required: true
    },
    {
      id: 6,
      title: 'Confidentiality Agreement',
      description: 'Signed confidentiality and data protection agreement',
      required: true
    },
    {
      id: 7,
      title: 'NRIC/Passport',
      description: 'Copy of identification document',
      required: true
    },
    {
      id: 8,
      title: 'VISA',
      description: 'Student visa (for international students)',
      required: false
    },
    {
      id: 9,
      title: 'Other Supporting Documents',
      description: 'Any additional relevant documents (optional)',
      required: false
    }
  ];

  ngOnInit() {
    // Initialize form group for document uploads
    // For now, we'll create a simple form that's always valid for optional documents
    // In a real implementation, this would handle file uploads
    this.form = this.fb.group({});
    
    // Emit initial validity (true since documents are optional for navigation)
    this.formValidityChange.emit(true);
    
    // Listen to form changes
    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });
  }
}
