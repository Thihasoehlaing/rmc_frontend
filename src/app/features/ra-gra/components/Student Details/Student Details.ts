import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { DecimalAmountDirective } from '../../../../shared/directives/decimal-amount.directive';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../core/interfaces/components.interface';

@Component({
  selector: 'app-ragra-student-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ValidationMessageComponent,
    NoteComponent,
    CharacterCounterComponent,
    DecimalAmountDirective,
    SearchableDropdownComponent
  ],
  templateUrl: './Student Details.html',
  styleUrls: ['./Student Details.scss']
})
export class StudentDetailsComponent implements OnInit, OnChanges, OnDestroy {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  /** Passed from the shell — drives conditional field visibility and validators. */
  @Input() positionRequested: 'RA' | 'GRA' | '' = '';

  /** Emits the form's validity state whenever it changes. */
  @Output() formValidityChange = new EventEmitter<boolean>();

  /** Exposed publicly so the shell can call form.markAllAsTouched() via @ViewChild. */
  form!: FormGroup;

  // Select option data (DropdownOption<string> format for searchable-dropdown)
  programOptions: DropdownOption<string>[] = [
    { label: 'Bachelor of Science', value: 'BSc' },
    { label: 'Master of Science', value: 'MSc' },
    { label: 'Doctor of Philosophy', value: 'PhD' }
  ];

  nationalityOptions: DropdownOption<string>[] = [
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

  secondReportingOptions: DropdownOption<string>[] = [
    { label: 'Dr. Ahmad bin Abdullah', value: 'report1' },
    { label: 'Dr. Sarah Lee', value: 'report2' },
    { label: 'Prof. John Smith', value: 'report3' }
  ];

  feeReductionOptions: DropdownOption<string>[] = [
    { label: '0%', value: '0' },
    { label: '50%', value: '50' },
    { label: '60%', value: '60' },
    { label: '70%', value: '70' },
    { label: '80%', value: '80' },
    { label: '90%', value: '90' },
    { label: '100%', value: '100' }
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
      durationDays:        [{ value: '', disabled: true }, [Validators.required, Validators.min(1)]],

      // Right column
      nationality:              ['', [Validators.required]],
      nricPassport:             ['', [Validators.required]],
      apuEmail:                 ['', [Validators.required, Validators.email]],
      phoneNumber:              ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      visaExpiryDate:           [''],   // optional
      secondReportingPerson:    ['', [Validators.required]],
      monthlyAllowance:         ['', [Validators.required, Validators.min(500), Validators.max(2800)]],
      feeReductionPercentage:   ['0'],  // validators applied conditionally; default 0%
      appointmentEndDate:       ['', [Validators.required]]
    });

    // Apply conditional validators based on the initial positionRequested value
    this.applyConditionalValidators();

    // Set up automatic duration calculation
    this.setupDurationCalculation();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set up automatic calculation of appointment duration based on start and end dates.
   * The duration field is disabled (read-only) and calculated inclusively:
   * if start = Jan 1 and end = Jan 10, duration = 10 days.
   */
  private setupDurationCalculation(): void {
    const commencementControl = this.form.get('commencementDate')!;
    const endDateControl = this.form.get('appointmentEndDate')!;
    const durationControl = this.form.get('durationDays')!;

    combineLatest([
      commencementControl.valueChanges,
      endDateControl.valueChanges
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([startDate, endDate]) => {
        const duration = this.calculateDuration(startDate, endDate);
        // Update the disabled control's value
        durationControl.setValue(duration, { emitEvent: false });
      });

    // Calculate initial duration if both dates are already set
    const initialDuration = this.calculateDuration(
      commencementControl.value,
      endDateControl.value
    );
    if (initialDuration !== null) {
      durationControl.setValue(initialDuration, { emitEvent: false });
    }
  }

  /**
   * Calculate the number of days between two dates inclusively.
   * Returns null if either date is missing or invalid, or if end < start.
   */
  private calculateDuration(startDate: string, endDate: string): number | null {
    if (!startDate || !endDate) {
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }

    // Check if end date is before start date
    if (end < start) {
      return null;
    }

    // Calculate difference in milliseconds
    const diffMs = end.getTime() - start.getTime();
    // Convert to days and add 1 for inclusive count
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
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
