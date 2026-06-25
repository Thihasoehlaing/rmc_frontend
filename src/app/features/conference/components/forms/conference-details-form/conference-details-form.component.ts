import { Component, OnInit, OnDestroy, Input, effect, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
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
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { CustomSubheaderComponent } from '../../../../../shared/components/custom-subheader/custom-subheader.component';
import { CustomHeaderComponent } from '../../../../../shared/components/custom-header/custom-header.component';
import { DropdownOption } from '../../../../../core/interfaces/components.interface';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';
import { BreakdownOptionsService } from '../../../services/breakdown-options.service';
import { DropdownsStoreService } from '../../../../admin-settings/dropdowns/dropdowns-store.service';
import {
  SDG_KEYWORD_EXAMPLE,
  SDG_KEYWORD_NOTE,
  sdgKeywordValidator,
} from '../../../../../shared/validators/sdg-keyword.validator';

import { TableActionIconComponent } from '../../../../../shared/components/table-action-icon/table-action-icon.component';

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
    PaginationComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
  ],
  templateUrl: './conference-details-form.component.html',
  styleUrl: './conference-details-form.component.scss',
})
export class ConferenceDetailsFormComponent implements OnInit, OnDestroy {
  readonly klangValleyAccountCodeDescription = 'TRAINING PRESENTATION PUBLICATION';
  readonly klangValleyAccountCode = '6203/100';
  @Input() workflow?: ConferenceWorkflowService;
  @Input() isFormReadOnly: boolean = false;

  private breakdownOptionsService = inject(BreakdownOptionsService);
  private readonly dropdownStore = inject(DropdownsStoreService);
  form!: FormGroup;
  breakdownForm!: FormGroup;
  sdgKeywordsForm!: FormGroup;
  readonly sdgKeywordPlaceholder = SDG_KEYWORD_EXAMPLE;
  readonly sdgKeywordNote = SDG_KEYWORD_NOTE;
  isBreakdownModalOpen = false;
  isSDGKeywordsModalOpen = false;
  breakdownType: 'research' | 'external-research' | 'local' | null = null;
  breakdownEditingIndex: number | null = null;

  // Breakdown arrays
  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  localBreakdowns: any[] = [];
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
  researchPageSize: number = 15;
  researchPageSizeOptions: number[] = [5, 15, 30, 50];

  externalPage: number = 1;
  externalPageSize: number = 15;
  externalPageSizeOptions: number[] = [5, 15, 30, 50];

  localPage: number = 1;
  localPageSize: number = 15;
  localPageSizeOptions: number[] = [5, 15, 30, 50];

  regions = ['Americas', 'ASEAN', 'Asia', 'Australasia', 'Europe', 'Malaysia', 'MEA', 'Pacific'];

  regionOptions = computed(() => {
    return this.breakdownOptionsService.regionOptions();
  });

  projectAccountCodeOptions = computed<DropdownOption[]>(() =>
    this.dropdownStore
      .entries()
      .filter(
        (option) =>
          option.formName === 'Conference Application' &&
          option.category === 'Project Account Code' &&
          option.status === 'Active',
      )
      .map((option) => ({
        value: option.value,
        label: option.value,
      })),
  );

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
        'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
      asean:
        'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
      asia: 'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
      australasia:
        'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
      europe: 'Europe - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
      malaysia:
        'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
      mea: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
      pacific:
        'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    };
    return defaultDescriptions[regionValue.toLowerCase()] || '';
  }

  // Get breakdown options from service (reactive)
  get researchBreakdownOptions(): DropdownOption[] {
    return this.breakdownOptionsService.getOptionsForType('research');
  }

  get localBreakdownOptions(): DropdownOption[] {
    return this.breakdownOptionsService.getOptionsForType('local');
  }

  get externalBreakdownOptions(): DropdownOption[] {
    return this.breakdownOptionsService.getOptionsForType('external-research');
  }

  get voteNumberDescriptionOptions(): DropdownOption[] {
    return this.dropdownStore
      .entries()
      .filter(
        (option) =>
          option.formName === 'Conference Application' &&
          option.category === 'Vote Number Description' &&
          option.status === 'Active',
      )
      .map((option) => ({ value: option.value, label: option.value }));
  }

  regionFundingInfo: Record<string, string> = {
    Americas: '50% & limit to a maximum of RM5,000',
    ASEAN: '85% & limit to a maximum of RM5,000',
    Asia: '70% & limit to a maximum of RM5,000',
    Australasia: '70% & limit to a maximum of RM5,000',
    Europe: '50% & limit to a maximum of RM5,000',
    Malaysia: '85% & limit to a maximum of RM5,000',
    MEA: '60% & limit to a maximum of RM5,000',
    Pacific: '70% & limit to a maximum of RM5,000',
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
      'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    ASEAN:
      'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    Asia: 'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    Australasia:
      'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    Europe: 'Europe - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    Malaysia:
      'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    MEA: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
    Pacific:
      'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
  };

  restrictedPublishers = ['MDPI', 'Common Ground', 'Hindawi', 'Frontiers', 'Other'];

  // DataTable column definitions for breakdown tables
  researchBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'itemDescription', label: 'Vote Number Description' },
    { key: 'voteNumber', label: 'Vote Number' },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  externalBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'itemDescription', label: 'Vote Number Description' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'voteNumber', label: 'Vote Number' },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  localBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'itemDescription', label: 'Account Code Description' },
    { key: 'voteNumber', label: 'Account Code' },
    { key: 'description', label: 'Description' },
    { key: 'supportingDocument', label: 'Document' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  getFullRegionName(regionShort: string): string {
    return this.regionFullNames[regionShort] || regionShort;
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
    this.setupBreakdownFormWatchers();
    this.setupFormWatchers();
    this.loadFormState();
    this.syncCitedJournalPaperExplanationValidator();
    this.normalizePages();
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
    const selectedDate = new Date(control.value);
    const minimumStartDate = this.getMinimumConferenceStartDateValue();

    if (selectedDate < minimumStartDate) {
      return { minDate: { value: control.value } };
    }
    return null;
  }

  getMinimumConferenceStartDate(): string {
    return this.getMinimumConferenceStartDateValue().toISOString().split('T')[0];
  }

  private getMinimumConferenceStartDateValue(): Date {
    const minimumStartDate = new Date();
    minimumStartDate.setHours(0, 0, 0, 0);
    minimumStartDate.setDate(minimumStartDate.getDate() + 21);
    return minimumStartDate;
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
    // Watch for region changes and auto-set percentage, limit, and description
    this.form.get('selectedRegion')?.valueChanges.subscribe((region) => {
      if (region) {
        const percentage = this.getRegionPercentage(region);
        const description = this.getRegionDescription(region);
        this.form.get('percentage')?.patchValue(percentage, { emitEvent: false });
        this.form.get('limit')?.patchValue(5000, { emitEvent: false });
        this.form.get('regionDescription')?.patchValue(description, { emitEvent: false });
      }
    });

    // Watch for conference start date changes and re-validate end date
    this.form.get('conferenceStartDate')?.valueChanges.subscribe(() => {
      this.form.get('conferenceEndDate')?.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('citedJournalPaper')?.valueChanges.subscribe((answer) => {
      this.syncCitedJournalPaperExplanationValidator(answer);
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
      // Create a copy of saved state without selectedRegion and percentage to keep them empty
      const stateWithoutRegion = { ...savedState };
      delete stateWithoutRegion['selectedRegion'];
      delete stateWithoutRegion['percentage'];

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

      this.form.patchValue(stateWithoutRegion, { emitEvent: false });

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
      keyword1: ['', [Validators.required, sdgKeywordValidator]],
      keyword2: ['', [Validators.required, sdgKeywordValidator]],
      keyword3: ['', [Validators.required, sdgKeywordValidator]],
    });
  }

  initializeForm() {
    this.form = this.fb.group({
      fundingRequestType: ['', [Validators.required]],
      conferenceType: ['', [Validators.required]],
      travelRequired: ['', [Validators.required]],
      authorshipType: ['', [Validators.required]],
      scopusPublicationGuaranteed: ['', [Validators.required]],
      restrictedPublisher: ['', [Validators.required]],
      sdgKeyword1: ['', [Validators.required, sdgKeywordValidator]],
      sdgKeyword2: ['', [Validators.required, sdgKeywordValidator]],
      sdgKeyword3: ['', [Validators.required, sdgKeywordValidator]],
      conferenceName: ['', [Validators.required, Validators.maxLength(200)]],
      conferenceStartDate: ['', [Validators.required, this.minDateValidator.bind(this)]],
      conferenceEndDate: ['', [Validators.required, this.endDateValidator]],
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
   * Formula: A = min((T × P / 100), T - E)
   */
  get externalSponsorshipAmountByAPU(): number {
    return this.calculateSponsorshipAmountByAPU('externalSponsoredAmountExternal');
  }

  /**
   * Get Sponsorship Amount by APU for Local Conference
   * Formula: A = min((T × P / 100), T - E)
   */
  get localSponsorshipAmountByAPU(): number {
    return this.calculateSponsorshipAmountByAPU('localSponsoredAmountExternal');
  }

  /**
   * Check if sponsorship amount exceeds RM 5,000 limit for Non-Research projects
   */
  isAPUSponsorshipExceededLimit(sponsorshipAmount: number): boolean {
    const researchTypeValue = this.researchType;
    if (researchTypeValue === 'non-research') {
      return sponsorshipAmount > 5000;
    }
    return false;
  }

  /**
   * Get capped sponsorship amount (max RM 5,000 for internal/non-research projects)
   */
  getCappedSponsorshipAmount(sponsorshipAmount: number): number {
    if (this.isAPUSponsorshipExceededLimit(sponsorshipAmount)) {
      return 5000;
    }
    return sponsorshipAmount;
  }

  /**
   * Get tooltip for capping message - shows when amount is capped at RM 5,000
   */
  getCapLimitTooltip(sponsorshipAmount: number): string | null {
    if (this.isAPUSponsorshipExceededLimit(sponsorshipAmount)) {
      return "APU's sponsorship will only cover up to RM 5,000";
    }
    return null;
  }

  /**
   * Get tooltip for reduction message - shows when calculated amount is more than displayed amount
   */
  getReductionTooltip(sponsorshipAmount: number, cappedAmount: number): string | null {
    if (sponsorshipAmount > cappedAmount) {
      return "External Sponsorship covers more than APU's offer. Displayed amount is after reduction.";
    }
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

  /**
   * Get percentage for External Research - always 0
   */
  get externalResearchPercentage(): number {
    return this.isExternalResearchProject ? 0 : parseFloat(this.percentage.toString()) || 0;
  }

  /**
   * Get sponsorship amount by APU for External Research - always 0
   */
  get externalResearchSponsorshipByAPU(): number {
    return this.isExternalResearchProject ? 0 : this.externalSponsorshipAmountByAPU;
  }

  /**
   * Get sponsored by value for External Research - always "Government Sector"
   */
  get externalSponsoredByValue(): string {
    return this.isExternalResearchProject
      ? 'Government Sector'
      : this.form.get('externalSponsoredBy')?.value || '';
  }

  /**
   * Calculate Sponsorship Amount by APU using the formula:
   * A = min((T × P / 100), T - E)
   * where T = Total Amount, P = Percentage, E = Sponsored Amount by External
   */
  calculateSponsorshipAmountByAPU(sponsorshipFieldName: string): number {
    const percentage = parseFloat(this.percentage.toString()) || 0;
    const sponsoredAmountExternal = parseFloat(this.form.get(sponsorshipFieldName)?.value) || 0;

    // Get the corresponding breakdown type to calculate total
    let breakdownType: 'research' | 'external-research' | 'local' = 'research';
    if (sponsorshipFieldName === 'externalSponsoredAmountExternal') {
      breakdownType = 'external-research';
    } else if (sponsorshipFieldName === 'localSponsoredAmountExternal') {
      breakdownType = 'local';
    }

    const totalAmount = this.calculateBreakdownTotal(breakdownType);

    // Formula: A = min((T × P / 100), T - E), with minimum value of 0
    const percentageAmount = (totalAmount * percentage) / 100;
    const remainingAmount = totalAmount - sponsoredAmountExternal;

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
    const sponsoredAmountExternal = parseFloat(this.form.get(sponsorshipFieldName)?.value) || 0;
    const sponsorshipAmountByAPU = this.calculateSponsorshipAmountByAPU(sponsorshipFieldName);
    const cappedSponsorshipAmount = this.getCappedSponsorshipAmount(sponsorshipAmountByAPU);

    // Formula: Cost = Total BEFORE SUBSIDY - Sponsored Amount by External - Sponsorship Amount by APU (capped), with minimum value of 0
    const costBorneByApplicant = totalAmount - sponsoredAmountExternal - cappedSponsorshipAmount;

    return Math.max(0, costBorneByApplicant);
  }

  openBreakdownModal(type: 'research' | 'external-research' | 'local', index?: number) {
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
    return this.dropdownStore.getConfiguredNumber(
      'Conference Application',
      'Vote Number Description',
      optionValue,
    );
  }

  private getConfiguredLocalAccountCode(optionValue: string | null): string {
    if (!optionValue) {
      return '';
    }

    try {
      const stored = localStorage.getItem(`option-metadata-local-${optionValue}`);
      const metadata = stored ? JSON.parse(stored) : null;
      return metadata?.accountCode || '';
    } catch {
      return '';
    }
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

    const entry = {
      ...formData,
      costInRM: parseFloat(costInRM.toFixed(2)),
      supportingDocument: this.selectedFileName || existingDocument,
    };

    if (this.breakdownEditingIndex !== null) {
      // Update existing entry
      array[this.breakdownEditingIndex] = entry;
    } else {
      // Add new entry
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
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit');
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

  canAddBreakdownEntries(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'draft',
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission',
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
