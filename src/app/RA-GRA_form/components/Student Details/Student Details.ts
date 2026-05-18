import {
  Component,
  Input,
  OnInit,
  OnChanges,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-ragra-student-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ValidationMessageComponent,
    CustomSubheaderComponent,
    NoteComponent,
    CharacterCounterComponent,
    FileUploadComponent
  ],
  templateUrl: './Student Details.html',
  styleUrls: ['./Student Details.scss']
})
export class StudentDetailsComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);

  /** Passed from the shell — drives conditional field visibility and validators. */
  @Input() positionRequested: 'RA' | 'GRA' | '' = '';

  /** Emits the form's validity state whenever it changes. */
  @Output() formValidityChange = new EventEmitter<boolean>();

  /** Exposed publicly so the shell can call form.markAllAsTouched() via @ViewChild. */
  form!: FormGroup;

  // ── File upload ViewChild refs (for programmatic reset if needed) ──
  @ViewChild('employmentFormUpload')      employmentFormUpload?: FileUploadComponent;
  @ViewChild('academicTranscriptsUpload') academicTranscriptsUpload?: FileUploadComponent;
  @ViewChild('cvUpload')                  cvUpload?: FileUploadComponent;
  @ViewChild('bankStatementUpload')       bankStatementUpload?: FileUploadComponent;
  @ViewChild('recruitmentFormUpload')     recruitmentFormUpload?: FileUploadComponent;
  @ViewChild('confidentialityFormUpload') confidentialityFormUpload?: FileUploadComponent;
  @ViewChild('otherDocumentsUpload')      otherDocumentsUpload?: FileUploadComponent;
  @ViewChild('nricPassportUpload')        nricPassportUpload?: FileUploadComponent;
  @ViewChild('visaUpload')                visaUpload?: FileUploadComponent;

  // ── File upload constants ──────────────────────────────────────────
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 10;

  ngOnInit(): void {
    this.form = this.fb.group({
      // ── Student Details fields ─────────────────────────────────
      // Left column
      studentId:           ['', [Validators.required]],
      programTitle:        [''],   // validators applied conditionally
      studentName:         ['', [Validators.required]],
      personalEmail:       ['', [Validators.required, Validators.email]],
      residentialAddress:  ['', [Validators.required]],
      jobDuties:           ['', [Validators.required, Validators.maxLength(500)]],
      commencementDate:    ['', [Validators.required]],
      durationDays:        [null, [Validators.required, Validators.min(1)]],

      // Right column
      nationality:              ['', [Validators.required]],
      nricPassport:             ['', [Validators.required]],
      apuEmail:                 ['', [Validators.required, Validators.email]],
      phoneNumber:              ['', [Validators.required]],
      visaExpiryDate:           [''],   // optional — no validators
      secondReportingPerson:    ['', [Validators.required]],
      monthlyAllowance:         [null, [Validators.required, Validators.min(0)]],
      feeReductionPercentage:   ['0'],  // validators applied conditionally; default 0%
      appointmentEndDate:       ['', [Validators.required]],

      // ── Upload Supporting Documents controls ───────────────────
      employmentForm:       ['', [Validators.required]],
      academicTranscripts:  ['', [Validators.required]],
      cv:                   ['', [Validators.required]],
      bankStatement:        ['', [Validators.required]],
      recruitmentForm:      ['', [Validators.required]],
      confidentialityForm:  ['', [Validators.required]],
      otherDocuments:       [''],   // optional
      nricPassportDoc:      ['', [Validators.required]],
      visa:                 ['', [Validators.required]]
    });

    // Apply conditional validators based on the initial positionRequested value
    this.applyConditionalValidators();

    // Emit validity on every change
    this.form.statusChanges.subscribe(() => {
      this.formValidityChange.emit(this.form.valid);
    });

    // Emit initial validity
    this.formValidityChange.emit(this.form.valid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['positionRequested'] && this.form) {
      this.applyConditionalValidators();
    }
  }

  /**
   * Called by each app-file-upload (fileSelected) output.
   * Patches the matching form control with the file name (truthy = valid),
   * or null (clears the control) when the file is removed/rejected.
   */
  onDocumentSelected(controlName: string, file: File | null): void {
    this.form.patchValue({ [controlName]: file ? file.name : null });
    this.form.get(controlName)?.markAsTouched();
  }

  /**
   * Adds or removes Validators.required on the two GRA-only fields
   * (programTitle and feeReductionPercentage) based on positionRequested.
   */
  private applyConditionalValidators(): void {
    const isGra = this.positionRequested === 'GRA';

    const programTitle = this.form.get('programTitle')!;
    const feeReduction = this.form.get('feeReductionPercentage')!;

    if (isGra) {
      programTitle.setValidators([Validators.required]);
      feeReduction.setValidators([Validators.required]);
    } else {
      programTitle.clearValidators();
      feeReduction.clearValidators();
    }

    programTitle.updateValueAndValidity();
    feeReduction.updateValueAndValidity();
  }
}
