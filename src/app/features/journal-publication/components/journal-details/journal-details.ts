import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  effect,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { JournalOptionType, JournalOptionsService } from '../../services/journal-options.service';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { CurrencyOption, MasterDataService } from '../../../../core/services/master-data.service';
import { COSTING_ITEM_ROW_LIMIT } from '../../../../core/constants/form-limits.constant';
import {
  SDG_KEYWORD_MAX_LENGTH,
  SDG_KEYWORD_PLACEHOLDERS,
} from '../../../../shared/validators/sdg-keyword.validator';
import {
  JournalCostingPayload,
  JournalFormData,
  JournalRequestPayload,
} from '../../services/journal-application-api.service';

import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';
import { TableScrollHintComponent } from '../../../../shared/components/table-scroll-hint/table-scroll-hint.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { DecimalAmountDirective } from '../../../../shared/directives/decimal-amount.directive';
import { MyrCurrencyPipe } from '../../../../shared/pipes/myr-currency.pipe';
import { TableRowCounterComponent } from '../../../../shared/components/table-row-counter/table-row-counter.component';
import { formatMyrCurrency } from '../../../../shared/utils/currency.util';

export interface JournalCostingSaveItem {
  payload: JournalCostingPayload;
  file?: File | null;
}

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [
    TableActionIconComponent,
    TableScrollHintComponent,
    ActionButtonComponent,
    CommonModule,
    ReactiveFormsModule,
    TableRowCounterComponent,
    CharacterCounterComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    DataTableComponent,
    DialogComponent,
    FileUploadComponent,
    NoteComponent,
    SearchableDropdownComponent,
    ValidationMessageComponent,
    DecimalAmountDirective,
    MyrCurrencyPipe,
  ],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss',
})
export class JournalDetails implements OnInit, OnDestroy {
  readonly nonResearchAccountCodeDescription = 'TRAINING PRESENTATION PUBLICATION';
  readonly nonResearchAccountCode = '6203/100';
  readonly breakdownDescriptionMaxLength = 400;
  readonly tableRecordLimit = COSTING_ITEM_ROW_LIMIT;
  readonly projectCostMax = 5;
  auth = inject(AuthService);
  workflow = inject(JournalWorkflowService);
  private journalOptionsService = inject(JournalOptionsService);
  private masterData = inject(MasterDataService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  form!: FormGroup;
  breakdownForm!: FormGroup;
  sdgKeywordsForm!: FormGroup;
  readonly sdgKeywordMaxLength = SDG_KEYWORD_MAX_LENGTH;
  readonly sdgKeywordPlaceholders = SDG_KEYWORD_PLACEHOLDERS;
  isBreakdownModalOpen = false;
  isSDGKeywordsModalOpen = false;
  breakdownType: 'internal-research' | 'external-research' | 'non-research' | null = null;
  breakdownEditingIndex: number | null = null;

  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  NonResearchBreakdowns: any[] = [];
  currentBreakdownOptions: {
    value: string;
    label: string;
    accountCode?: string;
    voteNumber?: string;
  }[] = [];

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  voteNumberDescriptionOptions: { value: string; label: string }[] = [];
  voteNumberOptions: { value: string; label: string }[] = [];
  accountCodeDescriptionOptions: { value: string; label: string }[] = [];
  accountCodeOptions: { value: string; label: string }[] = [];
  currencyOptions: DropdownOption<string>[] = [];

  readonly breakdownColumns: DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'itemDescription', label: 'Vote Number Description', width: '220px' },
    { key: 'voteNumber', label: 'Vote Number', width: '120px' },
    { key: 'currency', label: 'Currency', width: '120px' },
    { key: 'cost', label: 'Cost (Foreign/MYR)', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'costInRM', label: 'Cost in RM', width: '140px' },
    { key: 'description', label: 'Description', width: '260px' },
    { key: 'fileName', label: 'Supporting Doc', width: '200px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly externalResearchBreakdownColumns: DataTableColumn[] = [
    { key: 'itemDescription', label: 'Vote Number Description', width: '220px' },
    { key: 'accountCode', label: 'Account Code', width: '140px' },
    { key: 'voteNumber', label: 'Vote Number', width: '120px' },
    { key: 'costInRM', label: 'Cost in RM (Approximate)', width: '180px' },
    { key: 'currency', label: 'Currency', width: '120px' },
    { key: 'cost', label: 'Cost in Foreign Currency', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'description', label: 'Description', width: '260px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly nonResearchBreakdownColumns: DataTableColumn[] = [
    { key: 'accountCodeDescription', label: 'Account Code Description', width: '220px' },
    { key: 'accountCode', label: 'Account Code', width: '140px' },
    { key: 'currency', label: 'Currency', width: '120px' },
    { key: 'cost', label: 'Cost in Foreign Currency', width: '180px' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '140px' },
    { key: 'costInRM', label: 'Cost in RM (Approximate)', width: '180px' },
    { key: 'description', label: 'Description', width: '260px' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  formatDescription(description: string | null | undefined): string {
    if (!description) {
      return '—';
    }

    return description.replace(/(.{50})(?=\S)/g, '$1 ');
  }

  @Output() formValidityChange = new EventEmitter<boolean>();

  private onJournalDropdownsUpdated = (): void => {
    this.refreshDropdownOptions();
    this.cdr.detectChanges();
  };

  constructor(private fb: FormBuilder) {
    effect(() => {
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.form?.disable({ emitEvent: false });
        } else {
          this.form?.enable({ emitEvent: false });
        }
      }, 0);
    });

    effect(() => {
      this.journalOptionsService.voteNumberDescriptionOptions();
      this.journalOptionsService.voteNumberOptions();
      this.journalOptionsService.accountCodeDescriptionOptions();
      this.journalOptionsService.accountCodeOptions();
      this.journalOptionsService.projectAccountCodeOptions();
      this.refreshDropdownOptions();
    });
  }

  // Textarea auto expand
  autoExpandTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  ngOnInit() {
    this.form = this.fb.group({
      authorshipType: ['', Validators.required],
      scopusQuartile: ['', Validators.required],
      researchType: ['', Validators.required],
      restrictedPublisher: ['', Validators.required],
      journalName: ['', [Validators.required, Validators.maxLength(150)]],
      paperTitle: ['', [Validators.required, Validators.maxLength(200)]],
      sdgKeyword1: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      sdgKeyword2: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      sdgKeyword3: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      citedApuPaper: ['', Validators.required],
      citedApuPaperExplanation: ['', [Validators.maxLength(255)]],
      citedApuPaperDoi: ['', [Validators.maxLength(255)]],
      projectAccountCode: [''],
      externalProjectAccountCode: [''],
      totalRM: [{ value: 0, disabled: true }],
      sponsoredAmountExternal: [{ value: '', disabled: false }],
      sponsoredBy: [''],
      sponsorshipPercentage: [{ value: 0, disabled: true }],
      sponsorshipAmountAPU: [{ value: 0, disabled: true }],
      costByApplicant: [{ value: 0, disabled: true }],
      costingRemarks: ['', [Validators.maxLength(500)]],
    });

    this.form.statusChanges.subscribe((status) => {
      this.formValidityChange.emit(status === 'VALID');
    });

    this.form.get('researchType')?.valueChanges.subscribe((type) => {
      const projectAccountCodeCtrl = this.form.get('projectAccountCode');
      this.syncScopusQuartileForResearchType(type);
      if (type === 'non-research') {
        projectAccountCodeCtrl?.clearValidators();
        projectAccountCodeCtrl?.setValue('', { emitEvent: false });
      } else if (type === 'external-research') {
        projectAccountCodeCtrl?.setValidators([Validators.required]);
        this.syncExternalBreakdownAccountCode(projectAccountCodeCtrl?.value || '');
      } else {
        projectAccountCodeCtrl?.setValidators([Validators.required]);
      }
      projectAccountCodeCtrl?.updateValueAndValidity();
      this.calculateTotals(); // Recalculate when research type changes
    });

    this.form.get('scopusQuartile')?.valueChanges.subscribe(() => {
      this.calculateTotals(); // Recalculate when quartile changes
    });

    this.form.get('projectAccountCode')?.valueChanges.subscribe((value) => {
      if (this.researchType === 'external-research') {
        this.syncExternalBreakdownAccountCode(value || '');
      }
    });

    this.form.get('sponsoredAmountExternal')?.valueChanges.subscribe(() => {
      this.calculateTotals(); // Recalculate when external sponsorship changes
    });

    this.form.get('citedApuPaper')?.valueChanges.subscribe((value) => {
      this.updateCitationExplanationValidation(value);
      this.updateCitationDoiValidation(value);
    });

    const decimalPattern = '^[0-9]+(\\.[0-9]{1,2})?$';
    const exchangeRatePattern = '^[0-9]+(\\.[0-9]{1,6})?$';

    this.breakdownForm = this.fb.group({
      itemDescription: ['', Validators.required],
      voteNumber: { value: '', disabled: true },
      accountCodeDescription: [''],
      accountCode: { value: '', disabled: true },
      currency: ['MYR', [Validators.required]],
      cost: ['', [Validators.required, Validators.pattern(decimalPattern)]],
      costForeign: [''],
      exchangeRate: ['', [Validators.required, Validators.pattern(exchangeRatePattern)]],
      description: ['', [Validators.maxLength(this.breakdownDescriptionMaxLength)]],
      costInRM: { value: '', disabled: true },
    });

    this.breakdownForm.get('itemDescription')?.valueChanges.subscribe((value) => {
      if (this.breakdownType === 'non-research') {
        this.breakdownForm.patchValue(
          {
            accountCode: this.nonResearchAccountCode,
            accountCodeDescription: this.nonResearchAccountCodeDescription,
          },
          { emitEvent: false },
        );
        return;
      }

      const selected = this.findResearchOption(value);
      this.breakdownForm
        .get('voteNumber')
        ?.setValue(selected?.voteNumber || '', { emitEvent: false });
    });

    this.sdgKeywordsForm = this.fb.group({
      keyword1: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      keyword2: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
      keyword3: ['', [Validators.required, Validators.maxLength(SDG_KEYWORD_MAX_LENGTH)]],
    });

    this.refreshDropdownOptions();
    this.loadCurrencyOptions();
    window.addEventListener('rmc-dropdowns-updated', this.onJournalDropdownsUpdated);
  }

  private loadCurrencyOptions(): void {
    this.masterData.getCurrencies().subscribe((response) => {
      this.currencyOptions = this.toCurrencyOptions(response.data ?? []);
      this.cdr.detectChanges();
    });
  }

  private toCurrencyOptions(currencies: CurrencyOption[]): DropdownOption<string>[] {
    const unique = new Map<string, CurrencyOption>();
    for (const currency of currencies) {
      if (currency.code && !unique.has(currency.code)) {
        unique.set(currency.code, currency);
      }
    }
    return [...unique.values()].map((currency) => ({
      value: currency.code,
      label: `${currency.code} - ${currency.name}`,
      description: currency.symbol,
      searchText: `${currency.code} ${currency.name} ${currency.symbol}`,
    }));
  }

  ngOnDestroy(): void {
    window.removeEventListener('rmc-dropdowns-updated', this.onJournalDropdownsUpdated);
  }

  get researchType() {
    return this.form?.get('researchType')?.value;
  }

  get projectAccountCodeOptions(): DropdownOption[] {
    return this.journalOptionsService.projectAccountCodeOptions();
  }

  getJournalPayload(): JournalRequestPayload {
    const value = this.form.getRawValue();
    return {
      author_role: value.authorshipType || null,
      journal_name: value.journalName || null,
      scopus_quartile: value.scopusQuartile || null,
      project_type: value.researchType || null,
      project_account_code: value.projectAccountCode || null,
      is_restricted_publisher: this.toBoolean(value.restrictedPublisher),
      cited_apu_jati_ejbm: value.citedApuPaper === 'Yes',
      cited_apu_jati_ejbm_explanation: value.citedApuPaperExplanation || null,
      paper_title: value.paperTitle || null,
      sdg_keyword_1: value.sdgKeyword1 || null,
      sdg_keyword_2: value.sdgKeyword2 || null,
      sdg_keyword_3: value.sdgKeyword3 || null,
      external_sponsorship_amount: this.toMoneyString(value.sponsoredAmountExternal),
      external_sponsored_by: value.sponsoredBy || null,
      apu_sponsorship_percentage: this.toMoneyString(value.sponsorshipPercentage),
      apu_sponsorship_amount: this.toMoneyString(value.sponsorshipAmountAPU),
      cost_to_be_borne_by_applicant: this.toMoneyString(value.costByApplicant),
      remarks: value.costingRemarks || null,
    };
  }

  getCostingPayloads(): JournalCostingPayload[] {
    return this.getCostingSaveItems().map((item) => item.payload);
  }

  getCostingSaveItems(): JournalCostingSaveItem[] {
    const projectType = this.researchType || '';
    return this.getBreakdownArray(projectType)
      .map((entry) => ({
        payload: this.toCostingPayload(projectType, entry),
        file: entry.supportingDocumentFile ?? null,
      }))
      .filter((entry) => entry.payload.cost_in_rm);
  }

  hydrateFromApi(data: JournalFormData): void {
    const journal = data.journal;
    if (!journal || !this.form) {
      return;
    }

    this.form.patchValue(
      {
        authorshipType: journal.author_role || '',
        scopusQuartile: journal.scopus_quartile || '',
        researchType: journal.project_type || '',
        restrictedPublisher: journal.is_restricted_publisher ? 'yes' : 'no',
        journalName: journal.journal_name || '',
        paperTitle: journal.paper_title || '',
        sdgKeyword1: journal.sdg_keyword_1 || '',
        sdgKeyword2: journal.sdg_keyword_2 || '',
        sdgKeyword3: journal.sdg_keyword_3 || '',
        citedApuPaper: journal.cited_apu_jati_ejbm ? 'Yes' : 'No',
        citedApuPaperExplanation: journal.cited_apu_jati_ejbm_explanation || '',
        projectAccountCode: journal.project_account_code || '',
        sponsoredAmountExternal: journal.external_sponsorship_amount || '',
        sponsoredBy: journal.external_sponsored_by || '',
        sponsorshipPercentage: journal.apu_sponsorship_percentage || '0',
        sponsorshipAmountAPU: journal.apu_sponsorship_amount || '0.00',
        costByApplicant: journal.cost_to_be_borne_by_applicant || '0.00',
        costingRemarks: journal.remarks || '',
      },
      { emitEvent: false },
    );
    this.updateCitationExplanationValidation(this.form.get('citedApuPaper')?.value);
    this.updateCitationDoiValidation(this.form.get('citedApuPaper')?.value);
    this.syncScopusQuartileForResearchType(journal.project_type || '');

    this.researchBreakdowns = [];
    this.externalBreakdowns = [];
    this.NonResearchBreakdowns = [];
    const targetType = journal.project_type || '';
    const target = this.getBreakdownArray(targetType);
    const attachmentsById = new Map(
      (data.attachments || []).map((attachment) => [Number(attachment.id), attachment]),
    );
    for (const item of data.costing_items || []) {
      const attachment = attachmentsById.get(Number(item.supporting_document_attachment_id));
      target.push({
        itemDescription: item.vote_number_description_snapshot || '',
        voteNumber: item.vote_number_snapshot || '',
        accountCodeDescription: item.account_code_description_snapshot || '',
        accountCode: item.account_code_snapshot || '',
        currency: item.currency || 'MYR',
        cost: item.cost_in_foreign_currency || item.cost_in_rm || '',
        exchangeRate: this.toDecimalString(item.exchange_rate, 6),
        costInRM: item.cost_in_rm || '',
        description: item.description || '',
        fileName: attachment?.file_name || '',
        supportingDocumentAttachmentId: item.supporting_document_attachment_id ?? null,
        supportingDocumentFile: null,
      });
    }

    this.calculateTotals();
    this.cdr.detectChanges();
  }

  private updateCitationExplanationValidation(value: unknown, clearWhenNotRequired = true): void {
    const explanationControl = this.form.get('citedApuPaperExplanation');
    if (!explanationControl) return;

    if (value === 'No') {
      explanationControl.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      explanationControl.clearValidators();
      if (clearWhenNotRequired) {
        explanationControl.setValue('', { emitEvent: false });
        explanationControl.markAsUntouched();
        explanationControl.markAsPristine();
      }
    }
    explanationControl.updateValueAndValidity({ emitEvent: false });
  }

  private updateCitationDoiValidation(value: unknown): void {
    const doiControl = this.form.get('citedApuPaperDoi');
    if (!doiControl) return;

    if (value === 'Yes') {
      doiControl.setValidators([
        Validators.required,
        Validators.maxLength(255),
        this.validLinkValidator,
      ]);
    } else {
      doiControl.clearValidators();
      doiControl.setValue('', { emitEvent: false });
      doiControl.markAsUntouched();
      doiControl.markAsPristine();
    }
    doiControl.updateValueAndValidity({ emitEvent: false });
  }

  private validLinkValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (!value) return null;

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { pattern: { message: 'Please enter a valid link.' } };
      }
      return null;
    } catch {
      return { pattern: { message: 'Please enter a valid link.' } };
    }
  }

  getBreakdownArray(type: string): any[] {
    if (type === 'internal-research') return this.researchBreakdowns;
    if (type === 'external-research') return this.externalBreakdowns;
    if (type === 'non-research') return this.NonResearchBreakdowns;
    return [];
  }

  canCreateBreakdownEntry(type: string): boolean {
    return (
      !!type &&
      !this.workflow.isFormReadOnly() &&
      this.getBreakdownArray(type).length <
        (type === 'non-research' ? this.projectCostMax : this.tableRecordLimit)
    );
  }

  openBreakdownModal(type: string, index?: number) {
    if (index === undefined && !this.canCreateBreakdownEntry(type)) return;

    this.breakdownType = type as any;
    setTimeout(() => {
      // Resolve dropdown options
      if (type === 'non-research') {
        this.currentBreakdownOptions = [];
      } else {
        const researchOpts =
          this.journalOptionsService.getOptionsForType('vote_number_description');
        this.currentBreakdownOptions = researchOpts.map((opt) => ({
          value: opt.value,
          label: opt.label,
          voteNumber: this.journalOptionsService.getConfiguredVoteNumber(opt.value),
        }));
      }

      this.breakdownForm.reset({}, { emitEvent: false });
      this.breakdownForm.patchValue({ currency: 'MYR' }, { emitEvent: false });
      this.selectedFile = null;
      this.selectedFileName = null;

      const voteNumberCtrl = this.breakdownForm.get('voteNumber');
      const accountCodeCtrl = this.breakdownForm.get('accountCode');
      const itemDescriptionCtrl = this.breakdownForm.get('itemDescription');

      if (type === 'non-research') {
        voteNumberCtrl?.clearValidators();
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        accountCodeCtrl?.setValidators([Validators.required]);
        accountCodeCtrl?.disable({ emitEvent: false });
        accountCodeCtrl?.updateValueAndValidity({ emitEvent: false });
        itemDescriptionCtrl?.disable({ emitEvent: false });
      } else {
        itemDescriptionCtrl?.enable({ emitEvent: false });
        voteNumberCtrl?.setValidators([Validators.required]);
        voteNumberCtrl?.disable({ emitEvent: false });
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        if (type === 'external-research') {
          accountCodeCtrl?.setValidators([Validators.required]);
        } else {
          accountCodeCtrl?.clearValidators();
        }
        accountCodeCtrl?.disable({ emitEvent: false });
        accountCodeCtrl?.updateValueAndValidity({ emitEvent: false });
      }

      if (index !== undefined) {
        this.breakdownEditingIndex = index;
        const entry = this.getBreakdownArray(type)[index];
        this.selectedFileName = entry.fileName || null;
        this.selectedFile = null;
        if (type === 'non-research') {
          this.breakdownForm.patchValue(
            {
              ...entry,
              itemDescription: this.nonResearchAccountCodeDescription,
              accountCode: this.nonResearchAccountCode,
              accountCodeDescription: this.nonResearchAccountCodeDescription,
              exchangeRate: this.toDecimalString(entry.exchangeRate, 6),
            },
            { emitEvent: false },
          );
        } else {
          this.breakdownForm.patchValue(
            {
              ...entry,
              exchangeRate: this.toDecimalString(entry.exchangeRate, 6),
              voteNumber:
                entry.voteNumber ||
                this.journalOptionsService.getConfiguredVoteNumber(entry.itemDescription),
              accountCode:
                type === 'external-research'
                  ? entry.accountCode ||
                    entry.voteNumber ||
                    this.form.get('projectAccountCode')?.value ||
                    ''
                  : '',
            },
            { emitEvent: false },
          );
        }
      } else {
        this.breakdownEditingIndex = null;
        if (type === 'non-research') {
          this.breakdownForm.patchValue(
            {
              itemDescription: this.nonResearchAccountCodeDescription,
              accountCode: this.nonResearchAccountCode,
              accountCodeDescription: this.nonResearchAccountCodeDescription,
            },
            { emitEvent: false },
          );
        } else if (type === 'external-research') {
          // For External, auto-fill with Project Account Code
          const projectAccountCode = this.form.get('projectAccountCode')?.value || '';
          this.breakdownForm.patchValue(
            {
              voteNumber: '',
              accountCode: projectAccountCode,
            },
            { emitEvent: false },
          );
        }
      }

      this.isBreakdownModalOpen = true;
      this.cdr.detectChanges();
    }, 0);
  }

  closeBreakdownModal() {
    this.isBreakdownModalOpen = false;
    this.breakdownType = null;
    this.breakdownEditingIndex = null;
    this.breakdownForm.reset();
    this.breakdownForm.get('voteNumber')?.clearValidators();
    this.breakdownForm.get('voteNumber')?.updateValueAndValidity({ emitEvent: false });
    this.breakdownForm.get('accountCode')?.clearValidators();
    this.breakdownForm.get('accountCode')?.disable({ emitEvent: false });
    this.cdr.detectChanges();
  }

  private findNonResearchOption(
    value: string,
  ): { value: string; label: string; accountCode?: string } | undefined {
    if (!value) return undefined;
    return (
      this.currentBreakdownOptions.find((opt) => opt.value === value) ||
      this.currentBreakdownOptions.find((opt) => opt.label === value)
    );
  }

  private findResearchOption(
    value: string,
  ): { value: string; label: string; voteNumber?: string } | undefined {
    if (!value) return undefined;
    return (
      this.currentBreakdownOptions.find((opt) => opt.value === value) ||
      this.currentBreakdownOptions.find((opt) => opt.label === value)
    );
  }

  saveBreakdownEntry() {
    if (this.breakdownForm.invalid) {
      this.breakdownForm.markAllAsTouched();
      return;
    }

    const entry = this.breakdownForm.getRawValue();
    const cost = parseFloat(entry.cost);
    const rate = parseFloat(entry.exchangeRate);

    let costInRM = '';
    if (Number.isFinite(cost) && Number.isFinite(rate) && rate > 0) {
      costInRM = (Math.round(cost * rate * 100) / 100).toFixed(2);
    } else if (Number.isFinite(cost)) {
      costInRM = cost.toFixed(2);
    }

    let resolvedAccountCode = entry.accountCode || '';
    let resolvedAccountCodeDescription = entry.accountCodeDescription || '';
    if (this.breakdownType === 'non-research') {
      entry.itemDescription = this.nonResearchAccountCodeDescription;
      resolvedAccountCode = this.nonResearchAccountCode;
      resolvedAccountCodeDescription = this.nonResearchAccountCodeDescription;
    }

    if (this.breakdownType === 'external-research') {
      const projectAccountCode = this.form.get('projectAccountCode')?.value || '';
      resolvedAccountCode = projectAccountCode;
    }

    const entryToSave = {
      ...entry,
      accountCode: resolvedAccountCode,
      accountCodeDescription: resolvedAccountCodeDescription,
      costInRM,
      fileName: this.selectedFileName || entry.fileName || '',
      supportingDocumentAttachmentId: entry.supportingDocumentAttachmentId ?? null,
      supportingDocumentFile: this.selectedFile ?? entry.supportingDocumentFile ?? null,
    };

    const type = this.breakdownType as string;
    const array = this.getBreakdownArray(type);

    if (this.breakdownEditingIndex !== null) {
      array[this.breakdownEditingIndex] = entryToSave;
    } else {
      if (array.length >= this.tableRecordLimit) return;
      array.push(entryToSave);
    }

    this.closeBreakdownModal();
    this.calculateTotals(); // Recalculate totals after adding/editing breakdown entry
  }

  deleteBreakdown(type: string, index: number) {
    const array = this.getBreakdownArray(type);
    array.splice(index, 1);
    this.calculateTotals(); // Recalculate totals after deleting breakdown entry
  }

  calculateBreakdownTotal(type: string): number {
    const array = this.getBreakdownArray(type);
    let total = 0;
    array.forEach((item) => {
      total += parseFloat(item.costInRM) || 0;
    });
    return total;
  }

  calculateSponsorshipCosting(
    totalCost: number,
    externalSponsorship: number,
    scopusQuartile: string,
  ) {
    const remainingAmount = this.getRemainingAfterExternal(totalCost, externalSponsorship);
    let apuFinal = 0;

    if (scopusQuartile === 'Q1' || scopusQuartile === 'Q2') {
      apuFinal = remainingAmount;
    } else if (scopusQuartile === 'Q3') {
      apuFinal = Math.min(totalCost * 0.5, remainingAmount);
    }

    const applicantCost = Math.max(remainingAmount - apuFinal, 0);

    return {
      sponsorshipPercentage: this.calculateEffectiveApuPercentage(totalCost, apuFinal),
      apuSponsorshipAmount: apuFinal,
      applicantCost: applicantCost,
    };
  }

  private getRemainingAfterExternal(totalRM: number, externalSponsorship: number): number {
    return Math.max(totalRM - externalSponsorship, 0);
  }

  private syncScopusQuartileForResearchType(projectType: string | null): void {
    const scopusQuartileControl = this.form.get('scopusQuartile');
    if (projectType === 'non-research' && scopusQuartileControl?.value === 'Q3') {
      scopusQuartileControl.setValue('', { emitEvent: false });
      scopusQuartileControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private calculateEffectiveApuPercentage(totalRM: number, apuSponsorshipAmount: number): number {
    if (totalRM <= 0) {
      return 0;
    }

    return this.roundAmount((apuSponsorshipAmount / totalRM) * 100);
  }

  private hasExternalSponsorshipInput(): boolean {
    const value = this.form.get('sponsoredAmountExternal')?.value;
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private toBoolean(value: unknown): boolean {
    return String(value ?? '').toLowerCase() === 'yes';
  }

  private toMoneyString(value: unknown): string | null {
    const amount = this.normalizeAmount(value);
    return amount === null ? null : amount.toFixed(2);
  }

  private toCostingPayload(projectType: string, entry: any): JournalCostingPayload {
    const projectAccountCode = this.form.get('projectAccountCode')?.value || '';
    const accountCode =
      projectType === 'non-research'
        ? this.nonResearchAccountCode
        : entry.accountCode || projectAccountCode || '';

    return {
      project_account_code_id:
        projectType === 'non-research'
          ? null
          : this.journalOptionsService.getProjectAccountCodeId(projectAccountCode),
      vote_number_id:
        projectType === 'non-research'
          ? null
          : this.journalOptionsService.getVoteNumberId(entry.itemDescription),
      account_code_id:
        projectType === 'external-research' || projectType === 'non-research'
          ? null
          : this.journalOptionsService.getAccountCodeId(accountCode),
      cost_in_foreign_currency: this.toMoneyString(entry.cost),
      currency: String(entry.currency || 'MYR').toUpperCase(),
      exchange_rate: this.toDecimalString(entry.exchangeRate, 6),
      cost_in_rm: this.toMoneyString(entry.costInRM),
      description: entry.description || null,
      supporting_document_attachment_id: entry.supportingDocumentAttachmentId ?? null,
    };
  }

  private clearControlError(controlName: string, errorKey: string): void {
    const control = this.form.get(controlName);
    const errors = control?.errors;
    if (!control || !errors?.[errorKey]) {
      return;
    }

    delete errors[errorKey];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private setControlError(controlName: string, errorKey: string): void {
    const control = this.form.get(controlName);
    if (!control) {
      return;
    }

    control.setErrors({
      ...(control.errors || {}),
      [errorKey]: true,
    });
  }

  private normalizeAmount(value: unknown): number | null {
    const amount =
      typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
  }

  private toDecimalString(value: unknown, places = 2): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const amount = Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(amount)) {
      return null;
    }

    const factor = 10 ** places;
    const rounded = Math.round(amount * factor) / factor;
    return rounded
      .toFixed(places)
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');
  }

  getExternalSponsorshipLimitError(): string | null {
    const totalRM = this.calculateBreakdownTotal(this.researchType || '');
    const external = this.normalizeAmount(this.form.get('sponsoredAmountExternal')?.value) ?? 0;
    if (totalRM > 0 && external > totalRM) {
      return `External sponsorship amount cannot exceed total cost. Total cost is ${formatMyrCurrency(totalRM)}.`;
    }
    return null;
  }

  calculateTotals() {
    const pType = this.researchType;
    let breakdownArray = this.getBreakdownArray(pType || '');
    let totalRM = 0;

    // Calculate total from breakdown entries
    breakdownArray.forEach((item) => {
      totalRM += parseFloat(item.costInRM) || 0;
    });

    const q = this.form.get('scopusQuartile')?.value || '';
    let manualExternal = parseFloat(this.form.get('sponsoredAmountExternal')?.value) || 0;

    // Ensure no negative values
    if (manualExternal < 0) {
      manualExternal = 0;
      this.form.patchValue({ sponsoredAmountExternal: 0 }, { emitEvent: false });
    }

    if (totalRM > 0 && manualExternal > totalRM) {
      this.setControlError('sponsoredAmountExternal', 'maxExceeded');
    } else {
      this.clearControlError('sponsoredAmountExternal', 'maxExceeded');
    }

    let spPercent = 0;
    let spAPU = 0;
    let applicantCost = 0;

    // ──────────────────────────────────────────────────────────────
    // A) External Research Project
    // ──────────────────────────────────────────────────────────────
    if (pType === 'external-research') {
      if (manualExternal > 0) {
        this.form.get('sponsoredBy')?.setValidators([Validators.required]);
      } else {
        this.form.get('sponsoredBy')?.clearValidators();
      }
      this.form.get('sponsoredBy')?.updateValueAndValidity({ emitEvent: false });

      spAPU = this.hasExternalSponsorshipInput()
        ? this.getRemainingAfterExternal(totalRM, manualExternal)
        : 0;
      spPercent = this.calculateEffectiveApuPercentage(totalRM, spAPU);
      applicantCost = 0;
    }
    // ──────────────────────────────────────────────────────────────
    // C) Non-Research Project
    // ──────────────────────────────────────────────────────────────
    else if (pType === 'non-research') {
      // Validate "Sponsored By" field
      if (manualExternal > 0) {
        this.form.get('sponsoredBy')?.setValidators([Validators.required]);
      } else {
        this.form.get('sponsoredBy')?.clearValidators();
      }
      this.form.get('sponsoredBy')?.updateValueAndValidity({ emitEvent: false });

      const remainingBalance = this.getRemainingAfterExternal(totalRM, manualExternal);

      if (q === 'Q1' || q === 'Q2') {
        spAPU = remainingBalance;
        spPercent = this.calculateEffectiveApuPercentage(totalRM, spAPU);
        applicantCost = 0;
      } else if (q === 'Q3') {
        spAPU = Math.min(totalRM * 0.5, remainingBalance);
        spPercent = this.calculateEffectiveApuPercentage(totalRM, spAPU);
        applicantCost = Math.max(remainingBalance - spAPU, 0);
      }
      // No quartile or invalid quartile
      else {
        spPercent = 0;
        spAPU = 0;
        applicantCost = remainingBalance;
      }
    }
    // ──────────────────────────────────────────────────────────────
    // No project type selected
    // ──────────────────────────────────────────────────────────────
    else {
      spPercent = 0;
      spAPU = 0;
      applicantCost = 0;
    }

    // Update form with calculated values (read-only fields)
    this.form.patchValue(
      {
        totalRM: totalRM ? totalRM.toFixed(2) : '0.00',
        sponsorshipPercentage: spPercent ? spPercent.toString() : '0',
        sponsorshipAmountAPU: spAPU ? spAPU.toFixed(2) : '0.00',
        costByApplicant: applicantCost ? applicantCost.toFixed(2) : '0.00',
      },
      { emitEvent: false },
    );

    // Validate breakdown entries exist for certain project types
    const isBreakdownValid =
      pType === 'external-research' || pType === 'non-research' ? breakdownArray.length > 0 : true;
    this.formValidityChange.emit(this.form.valid && isBreakdownValid);
  }

  private syncExternalBreakdownAccountCode(projectAccountCode: string): void {
    this.externalBreakdowns = this.externalBreakdowns.map((entry) => ({
      ...entry,
      accountCode: projectAccountCode,
    }));

    if (this.breakdownType === 'external-research') {
      this.breakdownForm.patchValue(
        {
          accountCode: projectAccountCode,
        },
        { emitEvent: false },
      );
    }
  }

  getBreakdownModalTitle(): string {
    if (this.breakdownType === 'external-research')
      return 'Detailed Breakdown for External Research Project';
    if (this.breakdownType === 'non-research') return 'Detailed Breakdown for Non-Research Project';
    return 'Breakdown';
  }

  onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.selectedFileName = this.selectedFile.name;
    }
  }

  getCharacterCount(controlName: string): number {
    return this.form.get(controlName)?.value?.length || 0;
  }

  getBreakdownCharacterCount(controlName: string): number {
    return this.breakdownForm.get(controlName)?.value?.length || 0;
  }

  submitBreakdownModal() {
    this.saveBreakdownEntry();
  }

  private getOptionMetadata(type: JournalOptionType, value: string): any {
    const storageKey = `journal-option-metadata-${type}-${value}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== 'undefined') {
        return JSON.parse(stored);
      }
    } catch {
      // Silently discard malformed metadata
    }
    return null;
  }

  onFileSelected(event: any) {
    let file = event;
    if (event && event.target && event.target.files) {
      file = event.target.files[0];
    }
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.selectedFileName = null;
  }

  recalcCostInRM(): void {
    const raw = this.breakdownForm.getRawValue();
    const cost = parseFloat(String(raw.cost ?? '').replace(/,/g, ''));
    const rate = parseFloat(String(raw.exchangeRate ?? '').replace(/,/g, ''));

    let rm = '';
    if (Number.isFinite(cost) && Number.isFinite(rate) && rate > 0) {
      rm = (Math.round(cost * rate * 100) / 100).toFixed(2);
    } else if (Number.isFinite(cost) && cost >= 0) {
      rm = cost.toFixed(2);
    }

    this.breakdownForm.patchValue({ costInRM: rm }, { emitEvent: false });
  }

  clampPositive(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/,/g, '');
    const val = parseFloat(raw);
    if (Number.isFinite(val) && val < 0) {
      input.value = '0';
      const ctrl = this.breakdownForm.get(input.id);
      if (ctrl) {
        ctrl.setValue('0', { emitEvent: false });
      }
    }
  }

  clampPositiveMain(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value.replaceAll(',', ''));
    if (Number.isFinite(val) && val < 0) {
      input.value = '0';
      this.form.get(controlName)?.setValue(0, { emitEvent: true });
    }
  }

  stripDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      const ctrl = this.breakdownForm.get(input.id) || this.form.get(input.id);
      if (ctrl) {
        ctrl.setValue(cleaned, { emitEvent: true });
      }
    }
  }

  enforceExchangeRateDecimal(event: Event): void {
    const input = event.target as HTMLInputElement;
    let cleaned = input.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const firstDotIndex = cleaned.indexOf('.');
    if (firstDotIndex !== -1) {
      const whole = cleaned.slice(0, firstDotIndex) || '0';
      const decimals = cleaned
        .slice(firstDotIndex + 1)
        .replace(/\./g, '')
        .slice(0, 6);
      cleaned = `${whole}.${decimals}`;
    }
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.breakdownForm.get('exchangeRate')?.setValue(cleaned, { emitEvent: false });
    }
    this.recalcCostInRM();
  }

  openSDGKeywordsModal() {
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';

    this.sdgKeywordsForm.patchValue({ keyword1, keyword2, keyword3 }, { emitEvent: false });
    this.isSDGKeywordsModalOpen = true;
  }

  closeSDGKeywordsModal() {
    this.isSDGKeywordsModalOpen = false;
  }

  confirmSDGKeywords() {
    if (this.sdgKeywordsForm.invalid) {
      this.sdgKeywordsForm.markAllAsTouched();
      return;
    }
    const { keyword1, keyword2, keyword3 } = this.sdgKeywordsForm.value;
    this.form.patchValue(
      { sdgKeyword1: keyword1, sdgKeyword2: keyword2, sdgKeyword3: keyword3 },
      { emitEvent: false },
    );
    this.closeSDGKeywordsModal();
  }

  getDisplayedKeywordsArray(): string[] {
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';
    return [keyword1, keyword2, keyword3].filter((k) => k);
  }

  removeKeyword(keyword: string) {
    const controls = ['sdgKeyword1', 'sdgKeyword2', 'sdgKeyword3'];
    for (const controlName of controls) {
      if (this.form.get(controlName)?.value === keyword) {
        this.form.get(controlName)?.patchValue('', { emitEvent: false });
        break;
      }
    }
  }

  manageVoteNumbers(): void {
    this.router.navigate(['/journal/settings']);
  }

  manageAccountCodes(): void {
    this.router.navigate(['/journal/settings']);
  }

  private refreshDropdownOptions(): void {
    this.voteNumberDescriptionOptions = this.getDropdownOptions('vote_number_description');
    this.voteNumberOptions = this.getDropdownOptions('vote_number');
    this.accountCodeDescriptionOptions = this.getDropdownOptions('account_code_description');
    this.accountCodeOptions = this.getDropdownOptions('account_code');
  }

  private getDropdownOptions(type: JournalOptionType): { value: string; label: string }[] {
    return this.journalOptionsService
      .getOptionsForType(type)
      .map((opt) => ({ value: opt.value, label: opt.label }));
  }

  getDropdownLabel(type: JournalOptionType, value: string): string {
    const option = this.getDropdownOptions(type).find((opt) => opt.value === value);
    return option?.label || value || '-';
  }
}
