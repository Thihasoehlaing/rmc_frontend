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
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

interface UploadDocumentConfig {
  id: string;
  title: string;
  controlName: string;
  placeholder: string;
  required: boolean;
  subtitle?: string;
  note?: string;
  downloadLabel?: string;
  downloadAction?: 'employment' | 'recruitment' | 'confidentiality';
}
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { DecimalAmountDirective } from '../../../../shared/directives/decimal-amount.directive';

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
    FileUploadComponent,
    PaginationComponent,
    DecimalAmountDirective
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

  // File upload component references
  @ViewChild('employmentFormUpload') employmentFormUpload?: FileUploadComponent;
  @ViewChild('transcriptsUpload') transcriptsUpload?: FileUploadComponent;
  @ViewChild('cvUpload') cvUpload?: FileUploadComponent;
  @ViewChild('bankStatementUpload') bankStatementUpload?: FileUploadComponent;
  @ViewChild('recruitmentFormUpload') recruitmentFormUpload?: FileUploadComponent;
  @ViewChild('confidentialityFormUpload') confidentialityFormUpload?: FileUploadComponent;
  @ViewChild('otherDocumentsUpload') otherDocumentsUpload?: FileUploadComponent;
  @ViewChild('nricPassportUpload') nricPassportUpload?: FileUploadComponent;
  @ViewChild('visaUpload') visaUpload?: FileUploadComponent;

  // File constants
  readonly PDF_ACCEPT = '.pdf';
  readonly MAX_FILE_SIZE_MB = 4;
  readonly uploadPageSizeOptions = [4, 8, 12];
  uploadDocumentsCurrentPage = 1;
  uploadDocumentsPageSize = 4;

  // Select option placeholders
  programOptions: { label: string; value: string }[] = [
    { label: 'N/A', value: '' },
    { label: 'Bachelor of Science', value: 'BSc' },
    { label: 'Master of Science', value: 'MSc' },
    { label: 'Doctor of Philosophy', value: 'PhD' }
  ];

  nationalityOptions: { label: string; value: string }[] = [
    { label: 'Please select', value: '' },
    { label: 'Afghan', value: 'Afghan' },
    { label: 'Albanian', value: 'Albanian' },
    { label: 'Algerian', value: 'Algerian' },
    { label: 'American', value: 'American' },
    { label: 'Andorran', value: 'Andorran' },
    { label: 'Angolan', value: 'Angolan' },
    { label: 'Argentine', value: 'Argentine' },
    { label: 'Armenian', value: 'Armenian' },
    { label: 'Australian', value: 'Australian' },
    { label: 'Austrian', value: 'Austrian' },
    { label: 'Azerbaijani', value: 'Azerbaijani' },
    { label: 'Bahraini', value: 'Bahraini' },
    { label: 'Bangladeshi', value: 'Bangladeshi' },
    { label: 'Barbadian', value: 'Barbadian' },
    { label: 'Belarusian', value: 'Belarusian' },
    { label: 'Belgian', value: 'Belgian' },
    { label: 'Belizean', value: 'Belizean' },
    { label: 'Beninese', value: 'Beninese' },
    { label: 'Bhutanese', value: 'Bhutanese' },
    { label: 'Bolivian', value: 'Bolivian' },
    { label: 'Bosnian', value: 'Bosnian' },
    { label: 'Botswanan', value: 'Botswanan' },
    { label: 'Brazilian', value: 'Brazilian' },
    { label: 'British', value: 'British' },
    { label: 'Bruneian', value: 'Bruneian' },
    { label: 'Bulgarian', value: 'Bulgarian' },
    { label: 'Burkinabe', value: 'Burkinabe' },
    { label: 'Burmese', value: 'Burmese' },
    { label: 'Burundian', value: 'Burundian' },
    { label: 'Cambodian', value: 'Cambodian' },
    { label: 'Cameroonian', value: 'Cameroonian' },
    { label: 'Canadian', value: 'Canadian' },
    { label: 'Cape Verdean', value: 'Cape Verdean' },
    { label: 'Central African', value: 'Central African' },
    { label: 'Chadian', value: 'Chadian' },
    { label: 'Chilean', value: 'Chilean' },
    { label: 'Chinese', value: 'Chinese' },
    { label: 'Colombian', value: 'Colombian' },
    { label: 'Comoran', value: 'Comoran' },
    { label: 'Congolese', value: 'Congolese' },
    { label: 'Costa Rican', value: 'Costa Rican' },
    { label: 'Croatian', value: 'Croatian' },
    { label: 'Cuban', value: 'Cuban' },
    { label: 'Cypriot', value: 'Cypriot' },
    { label: 'Czech', value: 'Czech' },
    { label: 'Danish', value: 'Danish' },
    { label: 'Djiboutian', value: 'Djiboutian' },
    { label: 'Dominican', value: 'Dominican' },
    { label: 'Dutch', value: 'Dutch' },
    { label: 'East Timorese', value: 'East Timorese' },
    { label: 'Ecuadorean', value: 'Ecuadorean' },
    { label: 'Egyptian', value: 'Egyptian' },
    { label: 'Emirati', value: 'Emirati' },
    { label: 'Equatorial Guinean', value: 'Equatorial Guinean' },
    { label: 'Eritrean', value: 'Eritrean' },
    { label: 'Estonian', value: 'Estonian' },
    { label: 'Ethiopian', value: 'Ethiopian' },
    { label: 'Fijian', value: 'Fijian' },
    { label: 'Filipino', value: 'Filipino' },
    { label: 'Finnish', value: 'Finnish' },
    { label: 'French', value: 'French' },
    { label: 'Gabonese', value: 'Gabonese' },
    { label: 'Gambian', value: 'Gambian' },
    { label: 'Georgian', value: 'Georgian' },
    { label: 'German', value: 'German' },
    { label: 'Ghanaian', value: 'Ghanaian' },
    { label: 'Greek', value: 'Greek' },
    { label: 'Grenadian', value: 'Grenadian' },
    { label: 'Guatemalan', value: 'Guatemalan' },
    { label: 'Guinean', value: 'Guinean' },
    { label: 'Guyanese', value: 'Guyanese' },
    { label: 'Haitian', value: 'Haitian' },
    { label: 'Honduran', value: 'Honduran' },
    { label: 'Hungarian', value: 'Hungarian' },
    { label: 'Icelandic', value: 'Icelandic' },
    { label: 'Indian', value: 'Indian' },
    { label: 'Indonesian', value: 'Indonesian' },
    { label: 'Iranian', value: 'Iranian' },
    { label: 'Iraqi', value: 'Iraqi' },
    { label: 'Irish', value: 'Irish' },
    { label: 'Israeli', value: 'Israeli' },
    { label: 'Italian', value: 'Italian' },
    { label: 'Ivorian', value: 'Ivorian' },
    { label: 'Jamaican', value: 'Jamaican' },
    { label: 'Japanese', value: 'Japanese' },
    { label: 'Jordanian', value: 'Jordanian' },
    { label: 'Kazakh', value: 'Kazakh' },
    { label: 'Kenyan', value: 'Kenyan' },
    { label: 'Kuwaiti', value: 'Kuwaiti' },
    { label: 'Kyrgyz', value: 'Kyrgyz' },
    { label: 'Laotian', value: 'Laotian' },
    { label: 'Latvian', value: 'Latvian' },
    { label: 'Lebanese', value: 'Lebanese' },
    { label: 'Liberian', value: 'Liberian' },
    { label: 'Libyan', value: 'Libyan' },
    { label: 'Liechtensteiner', value: 'Liechtensteiner' },
    { label: 'Lithuanian', value: 'Lithuanian' },
    { label: 'Luxembourger', value: 'Luxembourger' },
    { label: 'Macedonian', value: 'Macedonian' },
    { label: 'Malagasy', value: 'Malagasy' },
    { label: 'Malawian', value: 'Malawian' },
    { label: 'Malaysian', value: 'Malaysian' },
    { label: 'Maldivian', value: 'Maldivian' },
    { label: 'Malian', value: 'Malian' },
    { label: 'Maltese', value: 'Maltese' },
    { label: 'Mauritanian', value: 'Mauritanian' },
    { label: 'Mauritian', value: 'Mauritian' },
    { label: 'Mexican', value: 'Mexican' },
    { label: 'Moldovan', value: 'Moldovan' },
    { label: 'Monacan', value: 'Monacan' },
    { label: 'Mongolian', value: 'Mongolian' },
    { label: 'Montenegrin', value: 'Montenegrin' },
    { label: 'Moroccan', value: 'Moroccan' },
    { label: 'Mozambican', value: 'Mozambican' },
    { label: 'Namibian', value: 'Namibian' },
    { label: 'Nepalese', value: 'Nepalese' },
    { label: 'New Zealander', value: 'New Zealander' },
    { label: 'Nicaraguan', value: 'Nicaraguan' },
    { label: 'Nigerian', value: 'Nigerian' },
    { label: 'Nigerien', value: 'Nigerien' },
    { label: 'North Korean', value: 'North Korean' },
    { label: 'Norwegian', value: 'Norwegian' },
    { label: 'Omani', value: 'Omani' },
    { label: 'Pakistani', value: 'Pakistani' },
    { label: 'Palauan', value: 'Palauan' },
    { label: 'Palestinian', value: 'Palestinian' },
    { label: 'Panamanian', value: 'Panamanian' },
    { label: 'Papua New Guinean', value: 'Papua New Guinean' },
    { label: 'Paraguayan', value: 'Paraguayan' },
    { label: 'Peruvian', value: 'Peruvian' },
    { label: 'Polish', value: 'Polish' },
    { label: 'Portuguese', value: 'Portuguese' },
    { label: 'Qatari', value: 'Qatari' },
    { label: 'Romanian', value: 'Romanian' },
    { label: 'Russian', value: 'Russian' },
    { label: 'Rwandan', value: 'Rwandan' },
    { label: 'Saint Lucian', value: 'Saint Lucian' },
    { label: 'Salvadoran', value: 'Salvadoran' },
    { label: 'Samoan', value: 'Samoan' },
    { label: 'San Marinese', value: 'San Marinese' },
    { label: 'Sao Tomean', value: 'Sao Tomean' },
    { label: 'Saudi Arabian', value: 'Saudi Arabian' },
    { label: 'Senegalese', value: 'Senegalese' },
    { label: 'Serbian', value: 'Serbian' },
    { label: 'Seychellois', value: 'Seychellois' },
    { label: 'Sierra Leonean', value: 'Sierra Leonean' },
    { label: 'Singaporean', value: 'Singaporean' },
    { label: 'Slovak', value: 'Slovak' },
    { label: 'Slovenian', value: 'Slovenian' },
    { label: 'Solomon Islander', value: 'Solomon Islander' },
    { label: 'Somali', value: 'Somali' },
    { label: 'South African', value: 'South African' },
    { label: 'South Korean', value: 'South Korean' },
    { label: 'South Sudanese', value: 'South Sudanese' },
    { label: 'Spanish', value: 'Spanish' },
    { label: 'Sri Lankan', value: 'Sri Lankan' },
    { label: 'Sudanese', value: 'Sudanese' },
    { label: 'Surinamese', value: 'Surinamese' },
    { label: 'Swazi', value: 'Swazi' },
    { label: 'Swedish', value: 'Swedish' },
    { label: 'Swiss', value: 'Swiss' },
    { label: 'Syrian', value: 'Syrian' },
    { label: 'Taiwanese', value: 'Taiwanese' },
    { label: 'Tajik', value: 'Tajik' },
    { label: 'Tanzanian', value: 'Tanzanian' },
    { label: 'Thai', value: 'Thai' },
    { label: 'Togolese', value: 'Togolese' },
    { label: 'Tongan', value: 'Tongan' },
    { label: 'Trinidadian', value: 'Trinidadian' },
    { label: 'Tunisian', value: 'Tunisian' },
    { label: 'Turkish', value: 'Turkish' },
    { label: 'Turkmen', value: 'Turkmen' },
    { label: 'Tuvaluan', value: 'Tuvaluan' },
    { label: 'Ugandan', value: 'Ugandan' },
    { label: 'Ukrainian', value: 'Ukrainian' },
    { label: 'Uruguayan', value: 'Uruguayan' },
    { label: 'Uzbek', value: 'Uzbek' },
    { label: 'Vanuatuan', value: 'Vanuatuan' },
    { label: 'Venezuelan', value: 'Venezuelan' },
    { label: 'Vietnamese', value: 'Vietnamese' },
    { label: 'Yemeni', value: 'Yemeni' },
    { label: 'Zambian', value: 'Zambian' },
    { label: 'Zimbabwean', value: 'Zimbabwean' }
  ];

  secondReportingOptions: { label: string; value: string }[] = [
    { label: 'Please select', value: '' },
    { label: 'Dr. Ahmad bin Abdullah', value: 'report1' },
    { label: 'Dr. Sarah Lee', value: 'report2' },
    { label: 'Prof. John Smith', value: 'report3' }
  ];

  readonly uploadDocuments: UploadDocumentConfig[] = [
    {
      id: 'employmentApplicationForm',
      title: 'Employment Application Form',
      controlName: 'employmentApplicationForm',
      placeholder: 'Upload employment application form PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please ensure all sections are completed, and the form is signed by the applicant.',
      downloadLabel: 'Download Employment Application Form (PDF)',
      downloadAction: 'employment'
    },
    {
      id: 'academicTranscripts',
      title: 'Copy of Academic Transcripts (E.g. Diploma, Degree, Master)',
      controlName: 'academicTranscripts',
      placeholder: 'Upload academic transcripts PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please combine all pages into one PDF file for submission.'
    },
    {
      id: 'ragraCv',
      title: "RA/GRA's CV",
      controlName: 'ragraCv',
      placeholder: 'Upload CV PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please ensure the Curriculum Vitae (CV) is updated and included relevant academic and research experiences.'
    },
    {
      id: 'bankStatement',
      title: 'Print Screen of Bank Statement',
      controlName: 'bankStatement',
      placeholder: 'Upload bank statement PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: "Please upload a screenshot of the first page of student's bank statement showing account holder name and account number."
    },
    {
      id: 'recruitmentSubmissionForm',
      title: 'Recruitment Submission Form',
      controlName: 'recruitmentSubmissionForm',
      placeholder: 'Upload recruitment submission form PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please ensure all sections are completed, and the form is signed by the applicant.',
      downloadLabel: 'Download Recruitment Submission Form (PDF)',
      downloadAction: 'recruitment'
    },
    {
      id: 'confidentialityAgreementForm',
      title: 'Non-Employee Confidentiality Agreement Form (For Student)',
      controlName: 'confidentialityAgreementForm',
      placeholder: 'Upload confidentiality agreement form PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please ensure all pages are completed, and signed by the student.',
      downloadLabel: 'Download Confidentiality Agreement Form (PDF)',
      downloadAction: 'confidentiality'
    },
    {
      id: 'otherSupportingDocuments',
      title: 'Other Supporting Documents (If any)',
      controlName: 'otherSupportingDocuments',
      placeholder: 'Upload other supporting documents PDF',
      required: false,
      subtitle: 'Max file size: 4 MB. PDF ONLY',
      note: 'Please upload any other relevant supporting documents e.g. Research Agreement, Research Proposal etc. (if any).'
    },
    {
      id: 'nricPassportUpload',
      title: 'NRIC/Passport',
      controlName: 'nricPassportUpload',
      placeholder: 'Upload NRIC/Passport PDF',
      required: true,
      subtitle: 'Max file size: 4 MB. PDF ONLY'
    },
    {
      id: 'visa',
      title: 'VISA',
      controlName: 'visa',
      placeholder: 'Upload VISA PDF',
      required: false,
      subtitle: 'Max file size: 4 MB. PDF ONLY'
    }
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      // Left column
      studentId:           ['', [Validators.required]],
      programTitle:        [''],   // validators applied conditionally
      studentName:         ['', [Validators.required]],
      personalEmail:       ['', [Validators.required, Validators.email]],
      residentialAddress:  ['', [Validators.required]],
      jobDuties:           ['', [Validators.required, Validators.maxLength(1000)]],
      commencementDate:    ['', [Validators.required]],
      durationDays:        ['', [Validators.required, Validators.min(1)]],

      // Right column
      nationality:              ['', [Validators.required]],
      nricPassport:             ['', [Validators.required]],
      apuEmail:                 ['', [Validators.required, Validators.email]],
      phoneNumber:              ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      visaExpiryDate:           [''],   // optional
      secondReportingPerson:    ['', [Validators.required]],
      monthlyAllowance:         ['', [Validators.required, Validators.min(500), Validators.max(2800)]],
      feeReductionPercentage:   ['0'],  // validators applied conditionally; default 0%
      appointmentEndDate:       ['', [Validators.required]],

      // Upload documents
      employmentApplicationForm:      ['', [Validators.required]],
      academicTranscripts:            ['', [Validators.required]],
      ragraCv:                        ['', [Validators.required]],
      bankStatement:                  ['', [Validators.required]],
      recruitmentSubmissionForm:      ['', [Validators.required]],
      confidentialityAgreementForm:   ['', [Validators.required]],
      otherSupportingDocuments:       [''],
      nricPassportUpload:             ['', [Validators.required]],
      visa:                           ['']
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

  get paginatedUploadDocuments(): UploadDocumentConfig[] {
    const currentPage = Math.min(this.uploadDocumentsCurrentPage, this.getUploadTotalPages());
    const startIndex = (currentPage - 1) * this.uploadDocumentsPageSize;
    return this.uploadDocuments.slice(startIndex, startIndex + this.uploadDocumentsPageSize);
  }

  getUploadTotalPages(): number {
    return Math.max(1, Math.ceil(this.uploadDocuments.length / this.uploadDocumentsPageSize));
  }

  getUploadPageStart(): number {
    if (this.uploadDocuments.length === 0) {
      return 0;
    }
    return ((Math.min(this.uploadDocumentsCurrentPage, this.getUploadTotalPages()) - 1) * this.uploadDocumentsPageSize) + 1;
  }

  getUploadPageEnd(): number {
    if (this.uploadDocuments.length === 0) {
      return 0;
    }
    return Math.min(this.getUploadPageStart() + this.uploadDocumentsPageSize - 1, this.uploadDocuments.length);
  }

  onUploadDocumentsPageChange(page: number) {
    this.uploadDocumentsCurrentPage = page;
  }

  onUploadDocumentsPageSizeChange(pageSize: number) {
    this.uploadDocumentsPageSize = pageSize;
    this.uploadDocumentsCurrentPage = 1;
  }

  onUploadDocumentAction(action?: UploadDocumentConfig['downloadAction']) {
    if (action === 'employment') {
      this.downloadEmploymentForm();
    } else if (action === 'recruitment') {
      this.downloadRecruitmentForm();
    } else if (action === 'confidentiality') {
      this.downloadConfidentialityForm();
    }
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

  onDocumentSelected(controlName: string, file: File | null) {
    if (file) {
      this.form.patchValue({
        [controlName]: file.name
      });
    } else {
      this.form.patchValue({
        [controlName]: null
      });
    }
    this.form.get(controlName)?.markAsTouched();
  }

  // Download links - these would typically point to actual document URLs
  downloadEmploymentForm() {
    // Implement download logic
  }

  downloadRecruitmentForm() {
    // Implement download logic
  }

  downloadConfidentialityForm() {
    // Implement download logic
  }
}
