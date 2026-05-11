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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  /** Passed from the shell — drives GRA-only field visibility and validators. */
  @Input() positionRequested: 'RA' | 'GRA' | '' = '';

  /** Emits the form's validity state whenever it changes. */
  @Output() formValidityChange = new EventEmitter<boolean>();

  /** Exposed publicly so the shell can call form.markAllAsTouched() via @ViewChild. */
  form!: FormGroup;

  // ── File upload ViewChild refs ─────────────────────────────────
  @ViewChild('employmentFormUpload')      employmentFormUpload?: FileUploadComponent;
  @ViewChild('academicTranscriptsUpload') academicTranscriptsUpload?: FileUploadComponent;
  @ViewChild('cvUpload')                  cvUpload?: FileUploadComponent;
  @ViewChild('bankStatementUpload')       bankStatementUpload?: FileUploadComponent;
  @ViewChild('recruitmentFormUpload')     recruitmentFormUpload?: FileUploadComponent;
  @ViewChild('confidentialityFormUpload') confidentialityFormUpload?: FileUploadComponent;
  @ViewChild('otherDocumentsUpload')      otherDocumentsUpload?: FileUploadComponent;
  @ViewChild('nricPassportUpload')        nricPassportUpload?: FileUploadComponent;
  @ViewChild('visaUpload')                visaUpload?: FileUploadComponent;

  // ── File upload constants ──────────────────────────────────────
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 10;

  // ── Dropdown option lists ──────────────────────────────────────

  readonly nationalityOptions = [
    'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan',
    'Argentine', 'Armenian', 'Australian', 'Austrian', 'Azerbaijani',
    'Bahraini', 'Bangladeshi', 'Belarusian', 'Belgian', 'Bolivian',
    'Bosnian', 'Brazilian', 'British', 'Bruneian', 'Bulgarian',
    'Cambodian', 'Cameroonian', 'Canadian', 'Chilean', 'Chinese',
    'Colombian', 'Congolese', 'Croatian', 'Cuban', 'Czech',
    'Danish', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian',
    'Emirati', 'Estonian', 'Ethiopian', 'Filipino', 'Finnish',
    'French', 'Georgian', 'German', 'Ghanaian', 'Greek',
    'Guatemalan', 'Honduran', 'Hungarian', 'Icelandic', 'Indian',
    'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli',
    'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian',
    'Kazakhstani', 'Kenyan', 'Korean', 'Kuwaiti', 'Kyrgyz',
    'Laotian', 'Latvian', 'Lebanese', 'Libyan', 'Lithuanian',
    'Luxembourgish', 'Macedonian', 'Malagasy', 'Malaysian', 'Maldivian',
    'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican',
    'Moldovan', 'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican',
    'Namibian', 'Nepalese', 'New Zealander', 'Nicaraguan', 'Nigerian',
    'Norwegian', 'Omani', 'Pakistani', 'Palestinian', 'Panamanian',
    'Paraguayan', 'Peruvian', 'Polish', 'Portuguese', 'Qatari',
    'Romanian', 'Russian', 'Rwandan', 'Saudi', 'Senegalese',
    'Serbian', 'Singaporean', 'Slovak', 'Slovenian', 'Somali',
    'South African', 'Spanish', 'Sri Lankan', 'Sudanese', 'Swedish',
    'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian',
    'Thai', 'Togolese', 'Tunisian', 'Turkish', 'Turkmen',
    'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek', 'Venezuelan',
    'Vietnamese', 'Yemeni', 'Zambian', 'Zimbabwean'
  ];

  readonly programTitleOptions = [
    'Bachelor of Computer Science (Hons)',
    'Bachelor of Software Engineering (Hons)',
    'Bachelor of Information Technology (Hons)',
    'Bachelor of Business Administration (Hons)',
    'Bachelor of Accounting (Hons)',
    'Bachelor of Engineering (Hons) in Electrical & Electronic Engineering',
    'Bachelor of Engineering (Hons) in Mechanical Engineering',
    'Bachelor of Arts (Hons) in Digital Media',
    'Bachelor of Arts (Hons) in Graphic Design',
    'Master of Science in Computer Science',
    'Master of Science in Data Science',
    'Master of Science in Cybersecurity',
    'Master of Business Administration (MBA)',
    'Master of Engineering in Electrical Engineering',
    'Master of Engineering in Mechanical Engineering',
    'Master of Arts in Digital Media',
    'Doctor of Philosophy (PhD) in Computer Science',
    'Doctor of Philosophy (PhD) in Engineering',
    'Doctor of Philosophy (PhD) in Business',
  ];

  readonly secondReportingPersonOptions = [
    'Dr. Ahmad Fadzil bin Hassan',
    'Dr. Aisha binti Mohd Noor',
    'Dr. Chong Wei Liang',
    'Dr. Kavitha Subramaniam',
    'Dr. Lee Kok Weng',
    'Dr. Mohd Rizal bin Ariffin',
    'Dr. Nurul Ain binti Zakaria',
    'Dr. Priya Rajan',
    'Dr. Rajesh Kumar',
    'Dr. Siti Hajar binti Abdullah',
    'Dr. Tan Boon Huat',
    'Dr. Vijayalakshmi Muthu',
    'Prof. Dr. Abdul Razak bin Ibrahim',
    'Prof. Dr. Lim Chee Seong',
    'Prof. Dr. Norzaidi Mohd Daud',
  ];

  readonly feeReductionOptions = [
    { value: '0',   label: '0%'   },
    { value: '50',  label: '50%'  },
    { value: '60',  label: '60%'  },
    { value: '70',  label: '70%'  },
    { value: '80',  label: '80%'  },
    { value: '90',  label: '90%'  },
    { value: '100', label: '100%' },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────

  ngOnInit(): void {
    this.form = this.fb.group({
      // Left column (top → bottom)
      studentId:          ['', [Validators.required]],
      programTitle:       ['', [Validators.required]],                  // always shown
      studentName:        ['', [Validators.required]],
      personalEmail:      ['', [Validators.required, Validators.email]],
      residentialAddress: ['', [Validators.required]],
      jobDuties:          ['', [Validators.required, Validators.maxLength(1000)]],
      commencementDate:   ['', [Validators.required]],
      durationDays:       [null, [Validators.required, Validators.min(1)]],

      // Right column (top → bottom)
      nationality:            ['', [Validators.required]],
      nricPassport:           ['', [Validators.required]],
      apuEmail:               ['', [Validators.required, Validators.email]],
      phoneNumber:            ['', [Validators.required, Validators.pattern('^[0-9+\\-\\s()]+$')]],
      visaExpiryDate:         [''],                                      // optional
      secondReportingPerson:  ['', [Validators.required]],
      monthlyAllowance:       [null, [Validators.required, Validators.min(500), Validators.max(2800)]],
      feeReductionPercentage: ['0'],                                     // GRA only — validators applied conditionally
      appointmentEndDate:     ['', [Validators.required]],

      // ── Upload Supporting Documents ────────────────────────────
      employmentForm:      ['', [Validators.required]],
      academicTranscripts: ['', [Validators.required]],
      cv:                  ['', [Validators.required]],
      bankStatement:       ['', [Validators.required]],
      recruitmentForm:     ['', [Validators.required]],
      confidentialityForm: ['', [Validators.required]],
      otherDocuments:      [''],   // optional
      nricPassportDoc:     ['', [Validators.required]],
      visa:                ['', [Validators.required]],
    });

    this.applyConditionalValidators();

    this.form.statusChanges.subscribe(() => {
      this.formValidityChange.emit(this.form.valid);
    });

    this.formValidityChange.emit(this.form.valid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['positionRequested'] && this.form) {
      this.applyConditionalValidators();
    }
  }

  /**
   * Adds Validators.required to GRA-only fields (programTitle, feeReductionPercentage)
   * when positionRequested === 'GRA', and clears them otherwise so hidden fields
   * never block form submission.
   */
  /** Patches a document upload control when a file is selected or cleared. */
  onDocumentSelected(controlName: string, file: File | null): void {
    this.form.patchValue({ [controlName]: file ? file.name : null });
    this.form.get(controlName)?.markAsTouched();
  }

  private applyConditionalValidators(): void {
    const isGra = this.positionRequested === 'GRA';
    const feeReduction = this.form.get('feeReductionPercentage')!;

    if (isGra) {
      feeReduction.setValidators([Validators.required]);
    } else {
      feeReduction.clearValidators();
    }

    feeReduction.updateValueAndValidity();
  }
}
