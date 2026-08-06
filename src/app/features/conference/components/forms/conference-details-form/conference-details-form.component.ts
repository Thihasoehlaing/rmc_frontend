import { Component, OnInit, OnDestroy, Input, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NoteComponent } from '../../../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ValidationMessageComponent } from '../../../../../shared/components/validation-message/validation-message.component';
import { CharacterCounterComponent } from '../../../../../shared/components/character-counter/character-counter.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { CustomSubheaderComponent } from '../../../../../shared/components/custom-subheader/custom-subheader.component';
import { CustomHeaderComponent } from '../../../../../shared/components/custom-header/custom-header.component';
import { DropdownOption } from '../../../../../core/interfaces/components.interface';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';
import { BreakdownOptionsService } from '../../../services/breakdown-options.service';
import {
  AccountCodeOption,
  MasterDataService,
  RegionOption,
  StaffOption,
} from '../../../../../core/services/master-data.service';
import {
  SDG_KEYWORD_MAX_LENGTH,
  SDG_KEYWORD_PLACEHOLDERS,
} from '../../../../../shared/validators/sdg-keyword.validator';

import { TableActionIconComponent } from '../../../../../shared/components/table-action-icon/table-action-icon.component';
import { DecimalAmountDirective } from '../../../../../shared/directives/decimal-amount.directive';
import { MyrCurrencyPipe } from '../../../../../shared/pipes/myr-currency.pipe';
@Component({
  selector: 'app-conference-details-form',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    NoteComponent,
    SearchableDropdownComponent,
    ValidationMessageComponent,
    CharacterCounterComponent,
    DataTableComponent,
    DialogComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    DecimalAmountDirective,
    MyrCurrencyPipe,
  ],
  templateUrl: './conference-details-form.component.html',
  styleUrl: './conference-details-form.component.scss',
})
export class ConferenceDetailsFormComponent implements OnInit, OnDestroy {
  readonly klangValleyAccountCodeDescription = 'TRAINING PRESENTATION PUBLICATION';
  readonly klangValleyAccountCode = '6203/100';
  readonly tableRecordLimit = 10;
  readonly activityRecordLimit = 20;
  @Input() workflow?: ConferenceWorkflowService;
  @Input() applicantDetailsForm?: FormGroup;
  @Input() isFormReadOnly: boolean = false;

  private breakdownOptionsService = inject(BreakdownOptionsService);
  private readonly masterData = inject(MasterDataService);
  form!: FormGroup;
  breakdownForm!: FormGroup;
  sdgKeywordsForm!: FormGroup;
  activityForm!: FormGroup;
  readonly sdgKeywordMaxLength = SDG_KEYWORD_MAX_LENGTH;
  readonly sdgKeywordPlaceholders = SDG_KEYWORD_PLACEHOLDERS;
  isBreakdownModalOpen = false;
  isSDGKeywordsModalOpen = false;
  isActivityModalOpen = false;
  isRestrictedPublisherWarningOpen = false;
  activityEditingIndex: number | null = null;
  breakdownType: 'research' | 'external-research' | 'local' | null = null;
  breakdownEditingIndex: number | null = null;

  // Breakdown arrays
  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  localBreakdowns: any[] = [];
  readonly activityTableColumns: DataTableColumn[] = [
    { key: 'date', label: 'Date', width: '180px' },
    { key: 'startTime', label: 'Start Time', width: '150px' },
    { key: 'endTime', label: 'End Time', width: '150px' },
    { key: 'description', label: 'Description', width: '420px' },
    { key: 'actions', label: 'Actions', width: '96px', align: 'center', headerAlign: 'center' },
  ];
  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private formStateService: ConferenceFormStateService,
  ) {
    // Apply form read-only effect if workflow is provided
    effect(() => {
      if (this.workflow?.isFormReadOnly()) {
        this.form?.disable({ emitEvent: false });
      } else {
        this.form?.enable({ emitEvent: false });
      }
    });

  }

  // Pagination state for breakdown tables
  researchPage: number = 1;
  researchPageSize: number = 10;
  researchPageSizeOptions: number[] = [5, 10];

  externalPage: number = 1;
  externalPageSize: number = 10;
  externalPageSizeOptions: number[] = [5, 10];

  localPage: number = 1;
  localPageSize: number = 10;
  localPageSizeOptions: number[] = [5, 10];

  regions = ['Americas', 'ASEAN', 'Asia', 'Australasia', 'Europe', 'Malaysia', 'MEA', 'Pacific'];

  /** Regions fetched from the real backend master-data list, keyed by id. */
  private regionsById = new Map<string, RegionOption>();
  private allRegionOptions: DropdownOption[] = [];
  regionOptions = signal<DropdownOption[]>([]);

  projectAccountCodeOptions = signal<DropdownOption[]>([]);
  colleagueOptions = signal<DropdownOption<string>[]>([]);
  colleaguesLoading = signal(false);

  // Build region descriptions dynamically from service metadata
  getRegionDescription(regionValue: string): string {
    const storageKey = `option-metadata-region-${regionValue}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const metadata = JSON.parse(stored);
        return metadata.description || '';
      } catch (e) {
        return '';
      }
    }
    // Fallback to default descriptions for predefined regions
    const defaultDescriptions: Record<string, string> = {
      americas:
        'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM 5,000.00, whichever is lower)',
      asean:
        'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM 5,000.00, whichever is lower)',
      asia: 'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
      australasia:
        'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
      europe: 'Europe - (A maximum of 50% & limit to a maximum of RM 5,000.00, whichever is lower)',
      malaysia:
        'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM 5,000.00, whichever is lower)',
      mea: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM 5,000.00, whichever is lower)',
      pacific:
        'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
    };
    return defaultDescriptions[regionValue.toLowerCase()] || '';
  }

  // Fallback options, used only if the real backend lists below haven't loaded yet.
  get researchBreakdownOptions(): DropdownOption[] {
    return this.breakdownOptionsService.getOptionsForType('research');
  }

  get externalBreakdownOptions(): DropdownOption[] {
    return this.breakdownOptionsService.getOptionsForType('external-research');
  }

  /** Vote numbers from the real backend master-data list (used for research/external breakdowns). */
  private voteNumbersCache: { code: string; description: string }[] = [];
  voteNumberDescriptionOptions: DropdownOption[] = [];

  /** Conference account codes from the backend; options are filtered by venue. */
  private accountCodesCache: AccountCodeOption[] = [];
  localBreakdownOptions: DropdownOption[] = [];

  regionFundingInfo: Record<string, string> = {
    Americas: '50% & limit to a maximum of RM 5,000.00',
    ASEAN: '85% & limit to a maximum of RM 5,000.00',
    Asia: '70% & limit to a maximum of RM 5,000.00',
    Australasia: '70% & limit to a maximum of RM 5,000.00',
    Europe: '50% & limit to a maximum of RM 5,000.00',
    Malaysia: '85% & limit to a maximum of RM 5,000.00',
    MEA: '60% & limit to a maximum of RM 5,000.00',
    Pacific: '70% & limit to a maximum of RM 5,000.00',
  };

  regionFullNames: Record<string, string> = {
    Americas: 'The Americas (USA, Canada, Mexico and other parts of South America)',
    ASEAN: 'ASEAN Countries',
    Asia: 'Asia (Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan)',
    Australasia: 'Australasia (Australia, New Zealand, PNG, Timor Leste)',
    Europe: 'Europe',
    Malaysia: 'Throughout Malaysia',
    MEA: 'Middle East and Africa',
    Pacific: 'Pacific Islands (Maldives etc.)',
  };

  regionDescriptions: Record<string, string> = {
    Americas:
      'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM 5,000.00, whichever is lower)',
    ASEAN:
      'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM 5,000.00, whichever is lower)',
    Asia: 'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
    Australasia:
      'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
    Europe: 'Europe - (A maximum of 50% & limit to a maximum of RM 5,000.00, whichever is lower)',
    Malaysia:
      'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM 5,000.00, whichever is lower)',
    MEA: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM 5,000.00, whichever is lower)',
    Pacific:
      'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM 5,000.00, whichever is lower)',
  };

  restrictedPublishers = ['MDPI', 'Common Ground', 'Hindawi', 'Frontiers', 'Other'];

  // DataTable column definitions for breakdown tables
  researchBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center' },
    { key: 'itemDescription', label: 'Vote Number Description', width: '220px' },
    { key: 'voteNumber', label: 'Vote Number', width: '120px' },
    { key: 'description', label: 'Description', width: '260px' },
    { key: 'cost', label: 'Cost (Foreign/MYR)', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'costInRM', label: 'Cost in RM', width: '140px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
    },
  ];

  externalBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center' },
    { key: 'itemDescription', label: 'Vote Number Description', width: '220px' },
    { key: 'accountCode', label: 'Account Code', width: '140px' },
    { key: 'voteNumber', label: 'Vote Number', width: '120px' },
    { key: 'description', label: 'Description', width: '260px' },
    { key: 'cost', label: 'Cost (Foreign/MYR)', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'costInRM', label: 'Cost in RM', width: '140px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
    },
  ];

  localBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center' },
    { key: 'itemDescription', label: 'Account Code Description', width: '220px' },
    { key: 'voteNumber', label: 'Account Code', width: '140px' },
    { key: 'description', label: 'Description', width: '260px' },
    { key: 'supportingDocument', label: 'Document', width: '180px' },
    { key: 'cost', label: 'Cost (Foreign/MYR)', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'costInRM', label: 'Cost in RM', width: '140px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
    },
  ];

  getFullRegionName(regionShort: string): string {
    return (
      this.regionsById.get(regionShort)?.region_name ||
      this.regionFullNames[regionShort] ||
      regionShort
    );
  }

  get selectedRegionName(): string {
    const selected = this.selectedRegion;
    return (
      this.form.get('regionName')?.value || this.regionsById.get(selected)?.region_name || selected
    );
  }

  getBreakdownOptionsForType(): DropdownOption[] {
    if (this.breakdownType === 'research' || this.breakdownType === 'external-research') {
      return this.voteNumberDescriptionOptions.length > 0
        ? this.voteNumberDescriptionOptions
        : this.breakdownType === 'research'
          ? this.researchBreakdownOptions
          : this.externalBreakdownOptions;
    }
    if (this.breakdownType === 'local') {
      return this.localBreakdownOptions;
    }
    return [];
  }

  // Methods to get table data as arrays with index
  getResearchBreakdownTableData(): (any & { index: number })[] {
    return this.researchBreakdowns.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  }

  getResearchBreakdownTableDataPaginated(): (any & { index: number })[] {
    const data = this.getResearchBreakdownTableData();
    const start = (this.researchPage - 1) * this.researchPageSize;
    return data.slice(start, start + this.researchPageSize);
  }

  getResearchTotalPages(): number {
    const len = this.getResearchBreakdownTableData().length;
    return Math.max(1, Math.ceil(len / this.researchPageSize));
  }

  researchPageStart(): number {
    const total = this.getResearchBreakdownTableData().length;
    if (total === 0) return 0;
    return (this.researchPage - 1) * this.researchPageSize + 1;
  }

  researchPageEnd(): number {
    return Math.min(
      this.getResearchBreakdownTableData().length,
      this.researchPage * this.researchPageSize,
    );
  }

  onResearchPageChange(page: number) {
    this.researchPage = page;
  }

  onResearchPageSizeChange(size: number) {
    this.researchPageSize = size;
    this.researchPage = 1;
  }

  getExternalBreakdownTableData(): (any & { index: number })[] {
    return this.externalBreakdowns.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  }

  getExternalBreakdownTableDataPaginated(): (any & { index: number })[] {
    const data = this.getExternalBreakdownTableData();
    const start = (this.externalPage - 1) * this.externalPageSize;
    return data.slice(start, start + this.externalPageSize);
  }

  getExternalTotalPages(): number {
    const len = this.getExternalBreakdownTableData().length;
    return Math.max(1, Math.ceil(len / this.externalPageSize));
  }

  externalPageStart(): number {
    const total = this.getExternalBreakdownTableData().length;
    if (total === 0) return 0;
    return (this.externalPage - 1) * this.externalPageSize + 1;
  }

  externalPageEnd(): number {
    return Math.min(
      this.getExternalBreakdownTableData().length,
      this.externalPage * this.externalPageSize,
    );
  }

  onExternalPageChange(page: number) {
    this.externalPage = page;
  }

  onExternalPageSizeChange(size: number) {
    this.externalPageSize = size;
    this.externalPage = 1;
  }

  getLocalBreakdownTableData(): (any & { index: number })[] {
    return this.localBreakdowns.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  }

  getLocalBreakdownTableDataPaginated(): (any & { index: number })[] {
    const data = this.getLocalBreakdownTableData();
    const start = (this.localPage - 1) * this.localPageSize;
    return data.slice(start, start + this.localPageSize);
  }

  getLocalTotalPages(): number {
    const len = this.getLocalBreakdownTableData().length;
    return Math.max(1, Math.ceil(len / this.localPageSize));
  }

  localPageStart(): number {
    const total = this.getLocalBreakdownTableData().length;
    if (total === 0) return 0;
    return (this.localPage - 1) * this.localPageSize + 1;
  }

  localPageEnd(): number {
    return Math.min(this.getLocalBreakdownTableData().length, this.localPage * this.localPageSize);
  }

  onLocalPageChange(page: number) {
    this.localPage = page;
  }

  onLocalPageSizeChange(size: number) {
    this.localPageSize = size;
    this.localPage = 1;
  }

  ngOnInit() {
    this.initializeForm();
    this.initializeBreakdownForm();
    this.initializeSDGKeywordsForm();
    this.initializeActivityForm();
    this.setupBreakdownFormWatchers();
    this.setupFormWatchers();
    this.loadFormState();
    this.syncCitedJournalPaperExplanationValidator();
    this.syncBookingDoneByOtherValidator();
    this.syncAdvanceReasonValidator();
    this.syncSelectedColleaguesValidator();
    this.syncExternalProjectAccountCodeValidator();
    this.normalizePages();
    this.loadMasterData();
  }

  /** Loads regions, vote numbers and local account codes from the real backend. */
  private loadMasterData(): void {
    this.masterData.getRegions().subscribe((res) => {
      const regions = res.data ?? [];
      this.regionsById = new Map(regions.map((r) => [r.id.toString(), r]));
      this.allRegionOptions = regions.map((r) => ({
        value: r.id.toString(),
        label: r.region_name,
      }));
      this.syncRegionOptionsForVenue();
      this.syncSelectedRegionMetadata(this.selectedRegion);
    });

    this.masterData.getProjectAccountCodes('CONFERENCE').subscribe((res) => {
      this.projectAccountCodeOptions.set(
        (res.data ?? []).map((c) => ({
          value: c.code,
          label: c.description ? `${c.code} - ${c.description}` : c.code,
        })),
      );
    });

    this.masterData.getVoteNumbers('CONFERENCE').subscribe((res) => {
      this.voteNumbersCache = res.data ?? [];
      this.voteNumberDescriptionOptions = this.voteNumbersCache.map((c) => ({
        value: c.description,
        label: c.description,
      }));
    });

    this.masterData.getAccountCodes('CONFERENCE').subscribe((res) => {
      this.accountCodesCache = res.data ?? [];
      this.syncLocalBreakdownOptionsForVenue();
    });

    this.loadColleagueOptions();
  }

  ngOnDestroy() {
    // Save form state before component is destroyed
    this.saveFormState();
  }

  setupBreakdownFormWatchers() {
    this.breakdownForm.get('cost')?.valueChanges.subscribe(() => this.updateCostInRM());
    this.breakdownForm.get('exchangeRate')?.valueChanges.subscribe(() => this.updateCostInRM());
    this.breakdownForm.get('itemDescription')?.valueChanges.subscribe((value) => {
      if (this.breakdownType === 'local') {
        this.breakdownForm
          .get('voteNumber')
          ?.setValue(
            this.isKlangValleyNonResearch()
              ? this.klangValleyAccountCode
              : this.getConfiguredLocalAccountCode(value),
            { emitEvent: false },
          );
      } else if (this.breakdownType === 'research' || this.breakdownType === 'external-research') {
        this.breakdownForm
          .get('voteNumber')
          ?.setValue(this.getConfiguredVoteNumber(value), { emitEvent: false });
      }
    });
  }

  /**
   * Validator: Conference Start Date must be at least 3 weeks from today.
   */
  private minDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const selectedDate = this.parseLocalDate(control.value);
    const minimumStartDate = this.getMinimumConferenceStartDateValue();

    if (!selectedDate || selectedDate < minimumStartDate) {
      return { minDate: { value: control.value } };
    }
    return null;
  }

  getMinimumConferenceStartDate(): string {
    return this.formatLocalDate(this.getMinimumConferenceStartDateValue());
  }

  private getMinimumConferenceStartDateValue(): Date {
    const minimumStartDate = new Date();
    minimumStartDate.setHours(0, 0, 0, 0);
    minimumStartDate.setDate(minimumStartDate.getDate() + 21);
    return minimumStartDate;
  }

  private parseLocalDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validator: Conference End Date cannot be earlier than Conference Start Date
   */
  private endDateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !this.form) {
      return null;
    }
    const endDate = new Date(control.value);
    const startDate = new Date(this.form.get('conferenceStartDate')?.value);

    if (isNaN(startDate.getTime())) {
      return null;
    }

    if (endDate < startDate) {
      return { endDateBeforeStart: { value: control.value } };
    }
    return null;
  };

  /**
   * Setup watchers for main form fields
   */
  setupFormWatchers() {
    this.form.get('localOrOverseas')?.valueChanges.subscribe(() => {
      this.syncRegionOptionsForVenue();
      this.syncLocalBreakdownOptionsForVenue();
    });

    // Watch for region changes and auto-set percentage, limit, and description
    this.form.get('selectedRegion')?.valueChanges.subscribe((region) => {
      this.syncSelectedRegionMetadata(region);
    });

    // Watch for conference start date changes and re-validate end date
    this.form.get('conferenceStartDate')?.valueChanges.subscribe(() => {
      this.form.get('conferenceEndDate')?.updateValueAndValidity({ emitEvent: false });
      this.validateActivityDates();
    });

    this.form.get('conferenceEndDate')?.valueChanges.subscribe(() => {
      this.validateActivityDates();
    });

    this.form.get('citedJournalPaper')?.valueChanges.subscribe((answer) => {
      this.syncCitedJournalPaperExplanationValidator(answer);
    });

    this.form.get('bookingDoneBy')?.valueChanges.subscribe((answer) => {
      this.syncBookingDoneByOtherValidator(answer);
    });

    this.form.get('hasAdvance')?.valueChanges.subscribe((answer) => {
      this.syncAdvanceReasonValidator(answer);
    });

    this.form.get('hasColleagues')?.valueChanges.subscribe((answer) => {
      this.syncSelectedColleaguesValidator(answer);
    });

    this.form.get('researchType')?.valueChanges.subscribe((researchType) => {
      this.syncExternalProjectAccountCodeValidator(researchType);
    });

    // Keep the external breakdown Account Code in sync with the selected project.
    this.form.get('externalProjectAccountCode')?.valueChanges.subscribe((value) => {
      if (this.researchType === 'external-research') {
        this.externalBreakdowns.forEach((breakdown) => {
          breakdown.accountCode = value || '';
        });
        this.breakdownForm.get('accountCode')?.setValue(value || '', { emitEvent: false });
      }
    });
  }

  private syncRegionOptionsForVenue(): void {
    const venue = this.selectedLocalOrOverseas;
    const selectedRegion = this.selectedRegion;
    const filteredOptions = this.allRegionOptions.filter((option) => {
      const isMalaysia = this.isMalaysiaRegion(option);
      if (venue === 'overseas') {
        return !isMalaysia;
      }
      if (venue === 'klang-valley' || venue === 'local-except-kl') {
        return isMalaysia;
      }
      return true;
    });

    this.regionOptions.set(filteredOptions);

    if (selectedRegion && !filteredOptions.some((option) => option.value === selectedRegion)) {
      this.clearRegionFields();
    }
  }

  private syncLocalBreakdownOptionsForVenue(): void {
    const options = this.accountCodesForSelectedVenue().map((c) => ({
      value: c.description,
      label: c.description,
    }));
    this.localBreakdownOptions = options;

    if (this.breakdownType !== 'local') {
      return;
    }

    const selectedDescription = this.breakdownForm.get('itemDescription')?.value;
    if (selectedDescription && !options.some((option) => option.value === selectedDescription)) {
      this.breakdownForm.patchValue(
        {
          itemDescription: '',
          voteNumber: '',
        },
        { emitEvent: false },
      );
    }
  }

  private accountCodesForSelectedVenue(): AccountCodeOption[] {
    const locationType = this.accountCodeLocationTypeForVenue();
    if (!locationType) {
      return [];
    }
    return this.accountCodesCache.filter(
      (c) => String(c.location_type || '').toUpperCase() === locationType,
    );
  }

  private accountCodeLocationTypeForVenue(): AccountCodeOption['location_type'] | null {
    const venue = this.selectedLocalOrOverseas;
    if (venue === 'overseas') {
      return 'FOREIGN';
    }
    if (venue === 'klang-valley' || venue === 'local-except-kl') {
      return 'LOCAL';
    }
    return null;
  }

  private syncSelectedRegionMetadata(region: string | null | undefined): void {
    if (!region) {
      this.clearRegionMetadata();
      return;
    }

    const backendRegion = this.regionsById.get(region);
    const percentage = backendRegion
      ? Number(backendRegion.percentage)
      : this.getRegionPercentage(region);
    const limit = backendRegion ? Number(backendRegion.limit_amount) : 5000;
    const description = backendRegion
      ? backendRegion.description
      : this.getRegionDescription(region);
    this.form
      .get('regionName')
      ?.patchValue(backendRegion?.region_name ?? region, { emitEvent: false });
    this.form.get('percentage')?.patchValue(percentage, { emitEvent: false });
    this.form.get('limit')?.patchValue(limit, { emitEvent: false });
    this.form.get('regionDescription')?.patchValue(description, { emitEvent: false });
  }

  private clearRegionFields(): void {
    this.form.get('selectedRegion')?.patchValue('');
    this.clearRegionMetadata();
  }

  private clearRegionMetadata(): void {
    this.form.get('regionName')?.patchValue('', { emitEvent: false });
    this.form.get('percentage')?.patchValue('', { emitEvent: false });
    this.form.get('limit')?.patchValue('', { emitEvent: false });
    this.form.get('regionDescription')?.patchValue('', { emitEvent: false });
  }

  private isMalaysiaRegion(option: DropdownOption): boolean {
    const regionName =
      this.regionsById.get(String(option.value))?.region_name ||
      option.label ||
      String(option.value);
    return regionName.trim().toLowerCase() === 'malaysia';
  }

  private syncCitedJournalPaperExplanationValidator(
    answer: string | null = this.form?.get('citedJournalPaper')?.value ?? null,
  ) {
    const explanationControl = this.form?.get('citedJournalPaperExplanation');
    if (!explanationControl) {
      return;
    }

    if (answer === 'no') {
      explanationControl.setValidators([Validators.required]);
    } else {
      explanationControl.clearValidators();
      explanationControl.reset('', { emitEvent: false });
    }

    explanationControl.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Get the funding percentage for a given region
   */
  getRegionPercentage(region: string): number {
    const storageKey = `option-metadata-region-${region.toLowerCase()}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const metadata = JSON.parse(stored);
        if (metadata.percentage !== undefined) {
          return metadata.percentage;
        }
      } catch (e) {
        // Fall through to defaults
      }
    }
    // Fallback to default percentages for predefined regions
    const percentageMap: Record<string, number> = {
      americas: 50,
      europe: 50,
      mea: 60,
      asia: 70,
      pacific: 70,
      australasia: 70,
      asean: 85,
      malaysia: 85,
    };
    return percentageMap[region.toLowerCase()] || 0;
  }

  updateCostInRM() {
    const cost = parseFloat(this.breakdownForm.get('cost')?.value) || 0;
    const exchangeRate = parseFloat(this.breakdownForm.get('exchangeRate')?.value) || 1;
    const costInRM = cost * exchangeRate;
    this.breakdownForm.patchValue({ costInRM: costInRM }, { emitEvent: false });
  }

  /**
   * Calculate total Cost in RM for a given breakdown type
   */
  calculateBreakdownTotal(breakdownType: 'research' | 'external-research' | 'local'): number {
    let breakdowns: any[] = [];

    switch (breakdownType) {
      case 'research':
        breakdowns = this.researchBreakdowns;
        break;
      case 'external-research':
        breakdowns = this.externalBreakdowns;
        break;
      case 'local':
        breakdowns = this.localBreakdowns;
        break;
    }

    return breakdowns.reduce((total, item) => {
      const costInRM = parseFloat(item.costInRM) || 0;
      return total + costInRM;
    }, 0);
  }

  /**
   * Load form state from the state service
   */
  private loadFormState() {
    const savedState = this.formStateService.getFormSection('conferenceDetails');
    if (savedState) {
      const stateWithoutRegion = { ...savedState };

      const supportingDocuments = this.formStateService.getFormSection('supportingDocuments');
      if (supportingDocuments) {
        if (
          stateWithoutRegion['citedJournalPaper'] === undefined &&
          supportingDocuments['citedJournalPaper'] !== undefined
        ) {
          stateWithoutRegion['citedJournalPaper'] = supportingDocuments['citedJournalPaper'];
        }
        if (
          stateWithoutRegion['citedJournalPaperExplanation'] === undefined &&
          supportingDocuments['citedJournalPaperExplanation'] !== undefined
        ) {
          stateWithoutRegion['citedJournalPaperExplanation'] =
            supportingDocuments['citedJournalPaperExplanation'];
        }
      }

      const savedActivities = stateWithoutRegion['activities'];
      delete stateWithoutRegion['activities'];
      this.form.patchValue(stateWithoutRegion, { emitEvent: false });
      this.setActivities(savedActivities);

      // Restore breakdown arrays
      if (savedState.researchBreakdown) {
        this.researchBreakdowns = [...savedState.researchBreakdown];
      }
      if (savedState.externalResearchBreakdown) {
        this.externalBreakdowns = [...savedState.externalResearchBreakdown];
      }
      if (savedState.localBreakdown) {
        this.localBreakdowns = [...savedState.localBreakdown];
      }
    }
  }

  /**
   * Save form state to the state service
   */
  private saveFormState() {
    if (this.form) {
      const formData = this.form.getRawValue();
      // Include breakdown arrays in the saved state
      const completeState = {
        ...formData,
        researchBreakdown: this.researchBreakdowns,
        externalResearchBreakdown: this.externalBreakdowns,
        localBreakdown: this.localBreakdowns,
      };
      this.formStateService.saveFormSection('conferenceDetails', completeState);
    }
  }

  /** Flushes the live form into the shared state service — called by the wizard before saving. */
  flushFormState(): void {
    this.saveFormState();
  }

  // Ensure page numbers are within valid bounds after initial load
  private normalizePages() {
    if (this.researchPage > this.getResearchTotalPages())
      this.researchPage = this.getResearchTotalPages();
    if (this.externalPage > this.getExternalTotalPages())
      this.externalPage = this.getExternalTotalPages();
    if (this.localPage > this.getLocalTotalPages()) this.localPage = this.getLocalTotalPages();
    if (this.researchPage < 1) this.researchPage = 1;
    if (this.externalPage < 1) this.externalPage = 1;
    if (this.localPage < 1) this.localPage = 1;
  }

  initializeBreakdownForm() {
    this.breakdownForm = this.fb.group({
      itemDescription: ['', [Validators.required]],
      voteNumber: ['', [Validators.required]],
      accountCode: [{ value: '', disabled: true }],
      cost: ['', [Validators.required, Validators.min(0)]],
      exchangeRate: ['1', [Validators.required, Validators.min(0.01)]],
      costInRM: [{ value: '', disabled: true }],
      description: [''],
    });
  }

  initializeSDGKeywordsForm() {
    this.sdgKeywordsForm = this.fb.group({
      keyword1: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      keyword2: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      keyword3: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
    });
  }

  initializeForm() {
    this.form = this.fb.group({
      fundingRequestType: ['', [Validators.required]],
      conferenceType: ['', [Validators.required]],
      travelRequired: ['', [Validators.required]],
      bookingDoneBy: ['', [Validators.required]],
      bookingDoneByOther: [''],
      hasAdvance: ['', [Validators.required]],
      advanceReason: [''],
      hasColleagues: ['', [Validators.required]],
      selectedColleagues: [[]],
      authorshipType: ['', [Validators.required]],
      scopusPublicationGuaranteed: ['', [Validators.required]],
      restrictedPublisher: ['', [Validators.required, this.restrictedPublisherValidator]],
      sdgKeyword1: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      sdgKeyword2: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      sdgKeyword3: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      conferenceName: ['', [Validators.required, Validators.maxLength(200)]],
      conferenceStartDate: ['', [Validators.required, this.minDateValidator.bind(this)]],
      conferenceEndDate: ['', [Validators.required, this.endDateValidator]],
      activities: this.fb.array([], [Validators.required]),
      localOrOverseas: ['', [Validators.required]],
      researchType: ['', [Validators.required]],
      citedJournalPaper: ['', [Validators.required]],
      citedJournalPaperExplanation: [''],
      conferenceLocation: ['', [Validators.required, Validators.maxLength(200)]],
      paperTitle: ['', [Validators.required, Validators.maxLength(200)]],
      selectedRegion: ['', [Validators.required]],
      regionName: [''],
      percentage: [''],
      limit: [''],
      regionDescription: [''],
      projectAccountCode: [''],
      sponsoredAmountExternal: [''],
      sponsoredBy: [''],
      costingRemarks: [''],
      externalProjectAccountCode: [''],
      externalSponsoredAmountExternal: [''],
      externalSponsoredBy: [''],
      externalCostingRemarks: [''],
      localSponsoredAmountExternal: [''],
      localSponsoredBy: [''],
      localCostingRemarks: [''],
    });
  }

  onColleagueSearch(search: string): void {
    this.loadColleagueOptions(search);
  }

  private loadColleagueOptions(search = ''): void {
    this.colleaguesLoading.set(true);
    this.masterData.searchStaff(search).subscribe({
      next: (res) => {
        const staff = res.data ?? [];
        this.colleagueOptions.set(staff.map((member) => this.toColleagueOption(member)));
        this.colleaguesLoading.set(false);
      },
      error: () => {
        this.colleagueOptions.set([]);
        this.colleaguesLoading.set(false);
      },
    });
  }

  private toColleagueOption(member: StaffOption): DropdownOption<string> {
    return {
      value: member.username || member.id.toString(),
      label: member.fullname || member.username,
      description: [member.email, member.department].filter(Boolean).join(' • '),
    };
  }

  private syncExternalProjectAccountCodeValidator(
    researchType = this.form.get('researchType')?.value,
  ): void {
    const control = this.form.get('externalProjectAccountCode');
    if (!control) return;

    if (researchType === 'external-research') {
      control.setValidators([Validators.required]);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private syncBookingDoneByOtherValidator(answer = this.form.get('bookingDoneBy')?.value): void {
    const control = this.form.get('bookingDoneByOther');
    if (!control) return;

    if (answer === 'other') {
      control.setValidators([Validators.required, Validators.maxLength(300)]);
    } else {
      control.clearValidators();
      control.patchValue('', { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }
  private syncAdvanceReasonValidator(answer = this.form.get('hasAdvance')?.value): void {
    const control = this.form.get('advanceReason');
    if (!control) return;

    if (answer === 'yes') {
      control.setValidators([Validators.required, Validators.maxLength(500)]);
    } else {
      control.clearValidators();
      control.patchValue('', { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private syncSelectedColleaguesValidator(answer = this.form.get('hasColleagues')?.value): void {
    const control = this.form.get('selectedColleagues');
    if (!control) return;

    if (answer === 'yes') {
      control.setValidators([Validators.required, this.maxSelectedColleaguesValidator]);
    } else {
      control.clearValidators();
      control.patchValue([], { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private maxSelectedColleaguesValidator(control: AbstractControl): ValidationErrors | null {
    const selected = Array.isArray(control.value) ? control.value : [];
    return selected.length > 10 ? { maxColleagues: true } : null;
  }

  private restrictedPublisherValidator(control: AbstractControl): ValidationErrors | null {
    return control.value === 'yes' ? { restrictedPublisherNotAllowed: true } : null;
  }

  showRestrictedPublisherWarning(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.form.get('restrictedPublisher')?.markAsTouched();
    this.isRestrictedPublisherWarningOpen = true;
  }

  closeRestrictedPublisherWarning(): void {
    this.isRestrictedPublisherWarningOpen = false;
  }

  get activities(): FormArray {
    return this.form.get('activities') as FormArray;
  }

  createActivityGroup(activity?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    /** Legacy value used by drafts created before activity time ranges were introduced. */
    time?: string;
    description?: string;
  }): FormGroup {
    return this.fb.group(
      {
        date: [activity?.date || '', [Validators.required, this.activityDateValidator.bind(this)]],
        startTime: [activity?.startTime || activity?.time || '', [Validators.required]],
        endTime: [activity?.endTime || '', [Validators.required]],
        description: [
          activity?.description || '',
          [Validators.required, Validators.maxLength(255)],
        ],
      },
      { validators: this.activityTimeRangeValidator },
    );
  }

  initializeActivityForm(): void {
    this.activityForm = this.createActivityGroup();
  }

  canAddActivity(): boolean {
    return this.hasActivityDateRange() && this.activities.length < this.activityRecordLimit;
  }

  private hasActivityDateRange(): boolean {
    return (
      !!this.form.get('conferenceStartDate')?.value && !!this.form.get('conferenceEndDate')?.value
    );
  }

  getMinimumActivityDate(): string | null {
    const startDate = this.parseLocalDate(this.form.get('conferenceStartDate')?.value);
    if (!startDate) return null;
    startDate.setDate(startDate.getDate() - 1);
    return this.formatLocalDate(startDate);
  }

  getMaximumActivityDate(): string | null {
    const endDate = this.parseLocalDate(this.form.get('conferenceEndDate')?.value);
    if (!endDate) return null;
    endDate.setDate(endDate.getDate() + 1);
    return this.formatLocalDate(endDate);
  }

  openActivityModal(index: number | null = null): void {
    if (!this.hasActivityDateRange()) return;
    if (index === null && this.activities.length >= this.activityRecordLimit) return;

    this.activityEditingIndex = index;
    const current = index !== null ? this.activities.at(index)?.value : null;
    this.activityForm = this.createActivityGroup(current || undefined);
    this.isActivityModalOpen = true;
  }

  closeActivityModal(): void {
    this.isActivityModalOpen = false;
    this.activityEditingIndex = null;
    this.activityForm.reset();
  }

  submitActivityModal(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    const value = this.activityForm.getRawValue();
    if (this.activityEditingIndex !== null) {
      this.activities.setControl(this.activityEditingIndex, this.createActivityGroup(value));
    } else {
      if (this.activities.length >= this.activityRecordLimit) return;
      this.activities.push(this.createActivityGroup(value));
    }
    this.closeActivityModal();
  }

  removeActivityRow(index: number): void {
    this.activities.removeAt(index);
  }

  formatActivityTime(value: string | null | undefined): string {
    if (!value) return '-';
    const [hourText, minuteText = '00'] = value.split(':');
    const hour = Number(hourText);
    if (Number.isNaN(hour)) return value;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minuteText.padStart(2, '0')} ${period}`;
  }
  getActivityGroup(index: number): FormGroup {
    return this.activities.at(index) as FormGroup;
  }

  private setActivities(activities: any[]): void {
    this.activities.clear();
    const rows = Array.isArray(activities) ? activities : [];
    rows.forEach((activity) => this.activities.push(this.createActivityGroup(activity)));
  }
  private activityDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value || !this.form) {
      return null;
    }

    const start = this.form.get('conferenceStartDate')?.value;
    const end = this.form.get('conferenceEndDate')?.value;
    if (!start || !end) {
      return null;
    }

    const activityDate = this.parseLocalDate(control.value);
    const startDate = this.parseLocalDate(start);
    const endDate = this.parseLocalDate(end);
    if (!activityDate || !startDate || !endDate) {
      return { activityDateOutOfRange: true };
    }

    startDate.setDate(startDate.getDate() - 1);
    endDate.setDate(endDate.getDate() + 1);
    if (activityDate < startDate || activityDate > endDate) {
      return { activityDateOutOfRange: true };
    }

    return null;
  }

  private activityTimeRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('startTime')?.value;
    const endTime = control.get('endTime')?.value;
    if (!startTime || !endTime) return null;

    return endTime > startTime ? null : { activityTimeRange: true };
  }

  private validateActivityDates(): void {
    this.activities.controls.forEach((activity) => {
      activity.get('date')?.updateValueAndValidity({ emitEvent: false });
    });
    this.activityForm?.get('date')?.updateValueAndValidity({ emitEvent: false });
  }

  getCharacterCount(fieldName: string): number {
    const value = this.form.get(fieldName)?.value || '';
    return value.length;
  }

  get selectedRegion(): string {
    return this.form.get('selectedRegion')?.value || '';
  }

  get selectedLocalOrOverseas(): string {
    return this.form.get('localOrOverseas')?.value || '';
  }

  get researchType(): string {
    return this.form.get('researchType')?.value || '';
  }

  isKlangValleyNonResearch(): boolean {
    return this.selectedLocalOrOverseas === 'klang-valley' && this.researchType === 'non-research';
  }

  get percentage(): string | number {
    return this.form.get('percentage')?.value || '';
  }

  /**
   * Get Sponsorship Amount by APU for Research project
   * Formula: A = min((T × P / 100), T - E)
   */
  get sponsorshipAmountByAPU(): number {
    return this.calculateSponsorshipAmountByAPU('sponsoredAmountExternal');
  }

  /**
   * Get Sponsorship Amount by APU for External Research project
   * Formula: A = T - E
   */
  get externalSponsorshipAmountByAPU(): number {
    return this.calculateSponsorshipAmountByAPU('externalSponsoredAmountExternal');
  }

  /**
   * Get Sponsorship Amount by APU for Local Conference
   * Formula for non-research: A = (T - E) × P / 100
   */
  get localSponsorshipAmountByAPU(): number {
    return this.calculateSponsorshipAmountByAPU('localSponsoredAmountExternal');
  }

  /**
   * Non-research sponsorship is now percentage based, without the previous RM 5,000 cap.
   */
  isAPUSponsorshipExceededLimit(_sponsorshipAmount: number): boolean {
    return false;
  }

  /**
   * Kept for existing template bindings; the current rule does not cap APU sponsorship.
   */
  getCappedSponsorshipAmount(sponsorshipAmount: number): number {
    return sponsorshipAmount;
  }

  /**
   * Kept for existing template bindings; no cap tooltip is needed under current rules.
   */
  getCapLimitTooltip(_sponsorshipAmount: number): string | null {
    return null;
  }

  /**
   * Get tooltip for reduction message - shows when calculated amount is more than displayed amount
   */
  getReductionTooltip(_sponsorshipAmount: number, _cappedAmount: number): string | null {
    return null;
  }

  /**
   * Check if cap limit tooltip should be displayed
   */
  isCapLimitTooltip(sponsorshipAmount: number): boolean {
    return this.isAPUSponsorshipExceededLimit(sponsorshipAmount);
  }

  /**
   * Check if reduction tooltip should be displayed
   */
  isReductionTooltip(sponsorshipAmount: number, cappedAmount: number): boolean {
    return sponsorshipAmount > cappedAmount;
  }

  /**
   * Get Cost to be borne by Applicant for Research project
   * Formula: Total - Sponsored Amount by External - Sponsored Amount by APU
   */
  get costBorneByApplicant(): number {
    return this.calculateCostBorneByApplicant('sponsoredAmountExternal', 'research');
  }

  /**
   * Get Cost to be borne by Applicant for External Research project
   * When External Research is selected: Cost = 0 (Total is always fully sponsored)
   * Otherwise: Formula: Total - Sponsored Amount by External - Sponsored Amount by APU
   */
  get externalCostBorneByApplicant(): number {
    if (this.isExternalResearchProject) {
      return 0; // External research project covers all costs
    }
    return this.calculateCostBorneByApplicant(
      'externalSponsoredAmountExternal',
      'external-research',
    );
  }

  /**
   * Get Cost to be borne by Applicant for Local Conference
   * Formula: Total - Sponsored Amount by External - Sponsored Amount by APU
   */
  get localCostBorneByApplicant(): number {
    return this.calculateCostBorneByApplicant('localSponsoredAmountExternal', 'local');
  }

  /**
   * Check if External Research Project is selected
   */
  get isExternalResearchProject(): boolean {
    return this.form.get('researchType')?.value === 'external-research';
  }

  /**
   * Get the sum of External Research Project costs
   */
  get externalResearchTotalCost(): number {
    return this.calculateBreakdownTotal('external-research');
  }

  get externalResearchPercentage(): number {
    if (!this.isExternalResearchProject) {
      return parseFloat(this.percentage.toString()) || 0;
    }

    return this.calculateEffectiveSponsorshipPercentage(
      this.externalResearchTotalCost,
      this.externalResearchSponsorshipByAPU,
    );
  }

  get externalResearchSponsorshipByAPU(): number {
    return this.externalSponsorshipAmountByAPU;
  }

  /**
   * Calculate Sponsorship Amount by APU using the formula:
   * A = T - E for external research.
   * A = min(T × P / 100, T - E) for non-research local costing.
   * A = min((T × P / 100), T - E) for other paths.
   * where T = Total Amount, P = Percentage, E = Sponsored Amount by External
   */
  calculateSponsorshipAmountByAPU(sponsorshipFieldName: string): number {
    const percentage = parseFloat(this.percentage.toString()) || 0;
    const sponsoredAmountExternal = this.getNonNegativeFormAmount(sponsorshipFieldName);

    // Get the corresponding breakdown type to calculate total
    let breakdownType: 'research' | 'external-research' | 'local' = 'research';
    if (sponsorshipFieldName === 'externalSponsoredAmountExternal') {
      breakdownType = 'external-research';
    } else if (sponsorshipFieldName === 'localSponsoredAmountExternal') {
      breakdownType = 'local';
    }

    const totalAmount = this.calculateBreakdownTotal(breakdownType);
    const remainingAmount = Math.max(totalAmount - sponsoredAmountExternal, 0);

    if (breakdownType === 'external-research') {
      if (!this.hasFormAmountInput(sponsorshipFieldName)) {
        return 0;
      }

      return remainingAmount;
    }

    if (this.isNonResearchCostingBreakdown(breakdownType)) {
      const regionSponsorshipAmount = (totalAmount * percentage) / 100;
      return Math.max(0, Math.min(regionSponsorshipAmount, remainingAmount));
    }

    // Formula: A = min((T × P / 100), T - E), with minimum value of 0
    const percentageAmount = (totalAmount * percentage) / 100;
    return Math.max(0, Math.min(percentageAmount, remainingAmount));
  }

  /**
   * Calculate Cost to be borne by Applicant using the formula:
   * Cost = Total - Sponsored Amount by External - Sponsored Amount by APU
   * where Total = Sum of breakdown costs
   */
  calculateCostBorneByApplicant(
    sponsorshipFieldName: string,
    breakdownType: 'research' | 'external-research' | 'local',
  ): number {
    const totalAmount = this.calculateBreakdownTotal(breakdownType);
    const sponsoredAmountExternal = this.getNonNegativeFormAmount(sponsorshipFieldName);
    const sponsorshipAmountByAPU = this.calculateSponsorshipAmountByAPU(sponsorshipFieldName);
    const cappedSponsorshipAmount = this.getCappedSponsorshipAmount(sponsorshipAmountByAPU);

    // Formula: Cost = Total BEFORE SUBSIDY - Sponsored Amount by External - Sponsorship Amount by APU (capped), with minimum value of 0
    const costBorneByApplicant = totalAmount - sponsoredAmountExternal - cappedSponsorshipAmount;

    return Math.max(0, costBorneByApplicant);
  }

  private isNonResearchCostingBreakdown(
    breakdownType: 'research' | 'external-research' | 'local',
  ): boolean {
    return this.researchType === 'non-research' && breakdownType === 'local';
  }

  private calculateEffectiveSponsorshipPercentage(
    totalAmount: number,
    sponsorshipAmount: number,
  ): number {
    if (totalAmount <= 0) {
      return 0;
    }

    return Math.round((sponsorshipAmount / totalAmount) * 10000) / 100;
  }

  private getNonNegativeFormAmount(controlName: string): number {
    const amount = parseFloat(this.form.get(controlName)?.value) || 0;
    return Math.max(amount, 0);
  }

  private hasFormAmountInput(controlName: string): boolean {
    const value = this.form.get(controlName)?.value;
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  openBreakdownModal(type: 'research' | 'external-research' | 'local', index?: number) {
    if (index === undefined && !this.canCreateBreakdownEntry(type)) return;

    this.breakdownType = type;
    this.isBreakdownModalOpen = true;
    const useFixedKlangValleyAccount = type === 'local' && this.isKlangValleyNonResearch();

    if (index !== undefined) {
      // Editing existing entry
      this.breakdownEditingIndex = index;
      const array = this.getBreakdownArray(type);
      const data = array[index];
      this.breakdownForm.patchValue(
        {
          itemDescription: useFixedKlangValleyAccount
            ? this.klangValleyAccountCodeDescription
            : data.itemDescription,
          voteNumber: useFixedKlangValleyAccount
            ? this.klangValleyAccountCode
            : data.voteNumber || this.getConfiguredVoteNumber(data.itemDescription),
          accountCode:
            type === 'external-research'
              ? data.accountCode ||
                data.voteNumber ||
                this.form.get('externalProjectAccountCode')?.value ||
                ''
              : '',
          cost: data.cost,
          exchangeRate: data.exchangeRate,
          costInRM: data.costInRM,
          description: data.description,
        },
        { emitEvent: false },
      );
      this.selectedFileName = data.supportingDocument || null;
    } else {
      // Adding new entry
      this.breakdownEditingIndex = null;
      this.breakdownForm.reset(
        {
          exchangeRate: 1,
          itemDescription: useFixedKlangValleyAccount ? this.klangValleyAccountCodeDescription : '',
          voteNumber: useFixedKlangValleyAccount
            ? this.klangValleyAccountCode
            : type === 'external-research' || type === 'local'
              ? ''
              : 'V29000',
          accountCode:
            type === 'external-research'
              ? this.form.get('externalProjectAccountCode')?.value || ''
              : '',
        },
        { emitEvent: false },
      );
      this.selectedFileName = null;
      this.selectedFile = null;
    }

    // Disable form if user can't add entries
    if (!this.canAddBreakdownEntries()) {
      this.breakdownForm.disable({ emitEvent: false });
    } else {
      this.breakdownForm.enable({ emitEvent: false });
    }

    if (type === 'external-research') {
      this.breakdownForm.get('accountCode')?.disable({ emitEvent: false });
      this.breakdownForm.get('voteNumber')?.disable({ emitEvent: false });
    } else if (type === 'local') {
      this.breakdownForm.get('accountCode')?.disable({ emitEvent: false });
      if (useFixedKlangValleyAccount) {
        this.breakdownForm.get('itemDescription')?.disable({ emitEvent: false });
      }
      this.breakdownForm.get('voteNumber')?.disable({ emitEvent: false });
    } else {
      this.breakdownForm.get('accountCode')?.disable({ emitEvent: false });
      this.breakdownForm.get('voteNumber')?.disable({ emitEvent: false });
    }
  }

  private getConfiguredVoteNumber(optionValue: string | null): string {
    if (!optionValue) return '';
    return this.voteNumbersCache.find((v) => v.description === optionValue)?.code || '';
  }

  private getConfiguredLocalAccountCode(optionValue: string | null): string {
    if (!optionValue) {
      return '';
    }

    return this.accountCodesForSelectedVenue().find((c) => c.description === optionValue)?.code || '';
  }

  closeBreakdownModal() {
    this.isBreakdownModalOpen = false;
    this.breakdownType = null;
    this.breakdownEditingIndex = null;
    this.breakdownForm.reset();
    this.selectedFileName = null;
    this.selectedFile = null;
  }

  submitBreakdownModal() {
    if (this.breakdownForm.invalid) {
      this.breakdownForm.markAllAsTouched();
      return;
    }

    const formData = this.breakdownForm.getRawValue(); // Use getRawValue to include disabled controls
    if (this.breakdownType === 'local' && this.isKlangValleyNonResearch()) {
      formData.itemDescription = this.klangValleyAccountCodeDescription;
      formData.voteNumber = this.klangValleyAccountCode;
    }
    // Calculate Cost in RM (Cost * Exchange Rate)
    const costInRM = (parseFloat(formData.cost) || 0) * (parseFloat(formData.exchangeRate) || 1);
    const array = this.getBreakdownArray(this.breakdownType!);
    const existingDocument =
      this.breakdownEditingIndex !== null
        ? array[this.breakdownEditingIndex]?.supportingDocument || null
        : null;

    const existingFileKey =
      this.breakdownEditingIndex !== null
        ? array[this.breakdownEditingIndex]?.pendingFileKey || null
        : null;
    const pendingFileKey = this.selectedFile
      ? `breakdown.${this.breakdownType}.${Date.now()}.${Math.random().toString(36).slice(2)}`
      : existingFileKey;
    if (this.selectedFile && pendingFileKey) {
      this.formStateService.setPendingFile(pendingFileKey, this.selectedFile);
    }

    const entry = {
      ...formData,
      costInRM: parseFloat(costInRM.toFixed(2)),
      supportingDocument: this.selectedFileName || existingDocument,
      pendingFileKey,
    };

    if (this.breakdownEditingIndex !== null) {
      // Update existing entry
      array[this.breakdownEditingIndex] = entry;
    } else {
      // Add new entry
      if (array.length >= this.tableRecordLimit) return;
      array.push(entry);
    }

    // Ensure pagination stays valid and show new entry when added
    if (this.breakdownEditingIndex === null) {
      // new entry added -> jump to last page for that type
      if (this.breakdownType === 'research') this.researchPage = this.getResearchTotalPages();
      if (this.breakdownType === 'external-research')
        this.externalPage = this.getExternalTotalPages();
      if (this.breakdownType === 'local') this.localPage = this.getLocalTotalPages();
    } else {
      // updated entry -> ensure current page still valid
      if (this.breakdownType === 'research' && this.researchPage > this.getResearchTotalPages())
        this.researchPage = this.getResearchTotalPages();
      if (
        this.breakdownType === 'external-research' &&
        this.externalPage > this.getExternalTotalPages()
      )
        this.externalPage = this.getExternalTotalPages();
      if (this.breakdownType === 'local' && this.localPage > this.getLocalTotalPages())
        this.localPage = this.getLocalTotalPages();
    }

    this.closeBreakdownModal();
  }

  deleteBreakdown(type: 'research' | 'external-research' | 'local', index: number) {
    const array = this.getBreakdownArray(type);
    array.splice(index, 1);
    // Ensure page bounds after deletion
    if (type === 'research' && this.researchPage > this.getResearchTotalPages())
      this.researchPage = this.getResearchTotalPages();
    if (type === 'external-research' && this.externalPage > this.getExternalTotalPages())
      this.externalPage = this.getExternalTotalPages();
    if (type === 'local' && this.localPage > this.getLocalTotalPages())
      this.localPage = this.getLocalTotalPages();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (file) {
      // Keep the raw file below the effective API Gateway/Lambda payload ceiling.
      const maxSize = 4 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size exceeds 4MB limit');
        return;
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }

      this.selectedFileName = file.name;
      this.selectedFile = file;
    }
  }

  removeFile() {
    this.selectedFileName = null;
    this.selectedFile = null;
    // Reset file input
    const fileInput = document.getElementById('supportingDoc') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private getBreakdownArray(type: 'research' | 'external-research' | 'local'): any[] {
    switch (type) {
      case 'research':
        return this.researchBreakdowns;
      case 'external-research':
        return this.externalBreakdowns;
      case 'local':
        return this.localBreakdowns;
      default:
        return [];
    }
  }

  getBreakdownModalTitle(): string {
    if (!this.breakdownType) return '';
    const isEditing = this.breakdownEditingIndex !== null ? 'Edit' : 'Add';
    const titles = {
      research: `${isEditing} Research Breakdown Entry`,
      'external-research': `${isEditing} External Research Project Breakdown Entry`,
      local: `${isEditing} Local Breakdown Entry`,
    };
    return titles[this.breakdownType];
  }

  canCreateBreakdownEntry(type: 'research' | 'external-research' | 'local'): boolean {
    return (
      this.canAddBreakdownEntries() &&
      this.getBreakdownArray(type).length < this.tableRecordLimit
    );
  }

  canAddBreakdownEntries(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'draft',
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission',
      'pending_applicant_resubmission_hos',
      'pending_applicant_resubmission_rmc',
    ];
    return allowedStatuses.includes(status);
  }

  autoExpandTextarea(event: any) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  /**
   * Open SDG Keywords Modal
   */
  openSDGKeywordsModal() {
    // Populate the modal form with current values from the main form
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';

    this.sdgKeywordsForm.patchValue(
      {
        keyword1,
        keyword2,
        keyword3,
      },
      { emitEvent: false },
    );

    this.isSDGKeywordsModalOpen = true;
  }

  /**
   * Close SDG Keywords Modal
   */
  closeSDGKeywordsModal() {
    this.isSDGKeywordsModalOpen = false;
  }

  /**
   * Confirm and Save SDG Keywords
   */
  confirmSDGKeywords() {
    if (this.sdgKeywordsForm.invalid) {
      this.sdgKeywordsForm.markAllAsTouched();
      return;
    }

    const { keyword1, keyword2, keyword3 } = this.sdgKeywordsForm.value;

    // Update the main form with the keywords
    this.form.patchValue(
      {
        sdgKeyword1: keyword1,
        sdgKeyword2: keyword2,
        sdgKeyword3: keyword3,
      },
      { emitEvent: false },
    );

    this.closeSDGKeywordsModal();
  }

  /**
   * Get displayed keywords as array
   */
  getDisplayedKeywordsArray(): string[] {
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';

    return [keyword1, keyword2, keyword3].filter((k) => k);
  }

  /**
   * Remove a keyword by setting its control to empty
   */
  removeKeyword(keyword: string) {
    const controls = ['sdgKeyword1', 'sdgKeyword2', 'sdgKeyword3'];
    for (const controlName of controls) {
      if (this.form.get(controlName)?.value === keyword) {
        this.form.get(controlName)?.patchValue('', { emitEvent: false });
        break;
      }
    }
  }
}
