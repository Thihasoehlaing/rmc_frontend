import { Component, OnInit, OnDestroy, inject, effect, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { JournalOptionType, JournalOptionsService } from '../../services/journal-options.service';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CharacterCounterComponent,
    CustomHeaderComponent,
    DataTableComponent,
    DialogComponent,
    FileUploadComponent,
    NoteComponent,
    SearchableDropdownComponent,
    ValidationMessageComponent
  ],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss'
})
export class JournalDetails implements OnInit, OnDestroy {
  auth = inject(AuthService);
  workflow = inject(JournalWorkflowService);
  private journalOptionsService = inject(JournalOptionsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  form!: FormGroup;
  breakdownForm!: FormGroup;
  sdgKeywordsForm!: FormGroup;
  isBreakdownModalOpen = false;
  isSDGKeywordsModalOpen = false;
  breakdownType: 'internal-research' | 'external-research' | 'non-research' | null = null;
  breakdownEditingIndex: number | null = null;

  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  NonResearchBreakdowns: any[] = [];
  currentBreakdownOptions: { value: string; label: string; accountCode?: string }[] = [];

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  voteNumberDescriptionOptions: { value: string; label: string }[] = [];
  voteNumberOptions: { value: string; label: string }[] = [];
  accountCodeDescriptionOptions: { value: string; label: string }[] = [];
  accountCodeOptions: { value: string; label: string }[] = [];

  readonly breakdownColumns: DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center', headerAlign: 'center' },
    { key: 'itemDescription', label: 'Item Description' },
    { key: 'voteNumber', label: 'Vote Number' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'description', label: 'Description' },
    { key: 'fileName', label: 'Supporting Doc' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  readonly externalResearchBreakdownColumns: DataTableColumn[] = [
    { key: 'itemDescription', label: 'Item Description' },
    { key: 'voteNumber', label: 'Vote Number' },
    { key: 'costInRM', label: 'Cost in RM (Approximate)' },
    { key: 'cost', label: 'Cost in Foreign Currency' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  readonly nonResearchBreakdownColumns: DataTableColumn[] = [
    { key: 'accountCodeDescription', label: 'Account Code Description' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'cost', label: 'Cost in Foreign Currency' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM (Approximate)' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

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
      sdgKeyword1: ['', Validators.required],
      sdgKeyword2: [''],
      sdgKeyword3: [''],
      citedApuPaper: ['', Validators.required],
      citedApuPaperExplanation: ['', [Validators.maxLength(255)]],
      projectAccountCode: [''],
      externalProjectAccountCode: [''],
      totalRM: [{ value: 0, disabled: true }],
      sponsoredAmountExternal: [{ value: 0, disabled: false }],
      sponsoredBy: [''],
      sponsorshipPercentage: [{ value: 0, disabled: true }],
      sponsorshipAmountAPU: [{ value: 0, disabled: true }],
      costByApplicant: [{ value: 0, disabled: true }],
      costingRemarks: ['', [Validators.maxLength(500)]]
    });

    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });

    this.form.get('researchType')?.valueChanges.subscribe((type) => {
      this.form.get('projectAccountCode')?.setValidators([Validators.required]);
      this.form.get('projectAccountCode')?.updateValueAndValidity();
      this.calculateTotals(); // Recalculate when research type changes
    });
    
    this.form.get('scopusQuartile')?.valueChanges.subscribe(() => {
      this.calculateTotals(); // Recalculate when quartile changes
    });
    
    this.form.get('sponsoredAmountExternal')?.valueChanges.subscribe(() => {
      this.calculateTotals(); // Recalculate when external sponsorship changes
    });

    this.form.get('citedApuPaper')?.valueChanges.subscribe((value) => {
      if (value === 'No') {
        this.form.get('citedApuPaperExplanation')?.setValidators([Validators.required]);
      } else {
        this.form.get('citedApuPaperExplanation')?.clearValidators();
      }
      this.form.get('citedApuPaperExplanation')?.updateValueAndValidity();
    });

    this.breakdownForm = this.fb.group({
      itemDescription: ['', Validators.required],
      voteNumber: [{ value: '', disabled: true }],
      accountCodeDescription: [''],
      accountCode: [{ value: '', disabled: true }],
      cost: ['', Validators.required],
      costForeign: [''],
      exchangeRate: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      description: [''],
      costInRM: [{ value: '', disabled: true }]
    });

    this.sdgKeywordsForm = this.fb.group({
      keyword1: ['', Validators.required],
      keyword2: ['', Validators.required],
      keyword3: ['', Validators.required]
    });

    this.refreshDropdownOptions();
    window.addEventListener('rmc-dropdowns-updated', this.onJournalDropdownsUpdated);
  }

  ngOnDestroy(): void {
    window.removeEventListener('rmc-dropdowns-updated', this.onJournalDropdownsUpdated);
  }

  get researchType() {
    return this.form?.get('researchType')?.value;
  }

  getBreakdownArray(type: string): any[] {
    if (type === 'internal-research') return this.researchBreakdowns;
    if (type === 'external-research') return this.externalBreakdowns;
    if (type === 'non-research') return this.NonResearchBreakdowns;
    return [];
  }

  openBreakdownModal(type: string, index?: number) {
    this.breakdownType = type as any;
    setTimeout(() => {
      // Resolve dropdown options
      if (type === 'non-research') {
        const localOpts = this.journalOptionsService.getOptionsForType('account_code');
        this.currentBreakdownOptions = localOpts.map(opt => ({ value: opt.value, label: opt.label, accountCode: '' }));
      } else {
        const researchOpts = this.journalOptionsService.getOptionsForType('vote_number');
        this.currentBreakdownOptions = researchOpts.map(opt => ({ value: opt.value, label: opt.label }));
      }

      this.breakdownForm.reset({}, { emitEvent: false });
      this.selectedFile = null;
      this.selectedFileName = null;

      const voteNumberCtrl = this.breakdownForm.get('voteNumber');
      const accountCodeCtrl = this.breakdownForm.get('accountCode');

      if (type === 'non-research') {
        voteNumberCtrl?.clearValidators();
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        accountCodeCtrl?.disable({ emitEvent: false }); // Make account code read-only for non-research
      } else {
        voteNumberCtrl?.setValidators([Validators.required]);
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        accountCodeCtrl?.disable({ emitEvent: false });
      }

      if (index !== undefined) {
        this.breakdownEditingIndex = index;
        const entry = this.getBreakdownArray(type)[index];
        this.selectedFileName = entry.fileName || null;
        this.selectedFile = null;
        if (type === 'non-research') {
          const selected = this.findNonResearchOption(entry.itemDescription);
          this.breakdownForm.patchValue({
            ...entry,
            itemDescription: selected?.value || entry.itemDescription,
            accountCode: selected?.accountCode || entry.accountCode || '',
            accountCodeDescription: selected?.label || entry.accountCodeDescription || ''
          }, { emitEvent: false });
        } else {
          this.breakdownForm.patchValue(entry, { emitEvent: false });
        }
      } else {
        this.breakdownEditingIndex = null;
        if (type === 'external-research') {
          // For External, auto-fill with Project Account Code
          const projectAccountCode = this.form.get('projectAccountCode')?.value || '';
          this.breakdownForm.patchValue({ voteNumber: projectAccountCode }, { emitEvent: false });
        } else if (type === 'non-research') {
          // For Non-Research, auto-fill with Project Account Code
          const projectAccountCode = this.form.get('projectAccountCode')?.value || '';
          this.breakdownForm.patchValue({ accountCode: projectAccountCode }, { emitEvent: false });
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
    this.cdr.detectChanges();
  }

  private findNonResearchOption(value: string): { value: string; label: string; accountCode?: string } | undefined {
    if (!value) return undefined;
    return this.currentBreakdownOptions.find(opt => opt.value === value) || this.currentBreakdownOptions.find(opt => opt.label === value);
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
      const selected = this.findNonResearchOption(entry.itemDescription);
      if (selected) {
        resolvedAccountCode = selected.accountCode || resolvedAccountCode;
        resolvedAccountCodeDescription = selected.label || resolvedAccountCodeDescription;
      }
    }

    const entryToSave = {
      ...entry,
      accountCode: resolvedAccountCode,
      accountCodeDescription: resolvedAccountCodeDescription,
      costInRM,
      fileName: this.selectedFileName || entry.fileName || ''
    };

    const type = this.breakdownType as string;
    const array = this.getBreakdownArray(type);

    if (this.breakdownEditingIndex !== null) {
      array[this.breakdownEditingIndex] = entryToSave;
    } else {
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
    array.forEach(item => {
      total += parseFloat(item.costInRM) || 0;
    });
    return total;
  }

  calculateSponsorshipCosting(totalCost: number, externalSponsorship: number, scopusQuartile: string) {
    let percentage = 0;
    if (scopusQuartile === 'Q1' || scopusQuartile === 'Q2') percentage = 100;
    else if (scopusQuartile === 'Q3') percentage = 50;

    let hiddenPercentageBridge = percentage / 100;

    let apuBase = Math.min(totalCost * hiddenPercentageBridge, 5000);
    let remainingAmount = Math.max(totalCost - externalSponsorship, 0);
    let apuFinal = Math.min(apuBase, remainingAmount);

    let applicantCost = Math.max(totalCost - externalSponsorship - apuFinal, 0);

    return {
      sponsorshipPercentage: percentage,
      apuSponsorshipAmount: apuFinal,
      applicantCost: applicantCost
    };
  }

  private normalizeAmount(value: unknown): number | null {
    const amount = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
  }

  calculateTotals() {
    const pType = this.researchType;
    let breakdownArray = this.getBreakdownArray(pType || '');
    let totalRM = 0;

    // Calculate total from breakdown entries
    breakdownArray.forEach(item => {
      totalRM += parseFloat(item.costInRM) || 0;
    });

    const q = this.form.get('scopusQuartile')?.value || '';
    let manualExternal = parseFloat(this.form.get('sponsoredAmountExternal')?.value) || 0;

    // Ensure no negative values
    if (manualExternal < 0) {
      manualExternal = 0;
      this.form.patchValue({ sponsoredAmountExternal: 0 }, { emitEvent: false });
    }

    let spPercent = 0;
    let spAPU = 0;
    let applicantCost = 0;

    // ──────────────────────────────────────────────────────────────
    // A) External Research Project
    // ──────────────────────────────────────────────────────────────
    if (pType === 'external-research') {
      // Validate "Sponsored By" field
      if (manualExternal > 0) {
        this.form.get('sponsoredBy')?.setValidators([Validators.required]);
      } else {
        this.form.get('sponsoredBy')?.clearValidators();
      }
      this.form.get('sponsoredBy')?.updateValueAndValidity({ emitEvent: false });

      // Validate external amount doesn't exceed total
      const extAmountCtrl = this.form.get('sponsoredAmountExternal');
      if (extAmountCtrl) {
        if (manualExternal > totalRM && totalRM >= 0) {
          extAmountCtrl.setErrors({ ...extAmountCtrl.errors, maxExceeded: true });
        } else {
          const errors = extAmountCtrl.errors;
          if (errors) {
            delete errors['maxExceeded'];
            extAmountCtrl.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }

      // Calculate remaining balance
      const remainingBalance = Math.max(totalRM - manualExternal, 0);

      // For Q1, Q2, Q3: 100% sponsorship
      if (q === 'Q1' || q === 'Q2' || q === 'Q3') {
        spPercent = 100;
        spAPU = remainingBalance;
        applicantCost = 0;
      } else {
        // No quartile selected or invalid quartile
        spPercent = 0;
        spAPU = 0;
        applicantCost = remainingBalance;
      }
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

      // Calculate remaining balance
      const remainingBalance = Math.max(totalRM - manualExternal, 0);

      // Q1 or Q2: 100% sponsorship
      if (q === 'Q1' || q === 'Q2') {
        spPercent = 100;
        spAPU = remainingBalance;
        applicantCost = 0;
      }
      // D) Q3: 50% sponsorship
      else if (q === 'Q3') {
        spPercent = 50;
        spAPU = remainingBalance * 0.5;
        applicantCost = remainingBalance * 0.5;
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
    this.form.patchValue({
      totalRM: totalRM ? totalRM.toFixed(2) : '0.00',
      sponsorshipPercentage: spPercent ? spPercent.toString() : '0',
      sponsorshipAmountAPU: spAPU ? spAPU.toFixed(2) : '0.00',
      costByApplicant: applicantCost ? applicantCost.toFixed(2) : '0.00'
    }, { emitEvent: false });

    // Validate breakdown entries exist for certain project types
    const isBreakdownValid = (pType === 'external-research' || pType === 'non-research') ? breakdownArray.length > 0 : true;
    this.formValidityChange.emit(this.form.valid && isBreakdownValid);
  }

  getBreakdownModalTitle(): string {
    if (this.breakdownType === 'external-research') return 'Detailed Breakdown for External Research Project';
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
    const val = parseFloat(input.value);
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

  enforceInteger(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^0-9]/g, '');
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
      return;
    }
    const { keyword1, keyword2, keyword3 } = this.sdgKeywordsForm.value;
    this.form.patchValue({ sdgKeyword1: keyword1, sdgKeyword2: keyword2, sdgKeyword3: keyword3 }, { emitEvent: false });
    this.closeSDGKeywordsModal();
  }

  getDisplayedKeywordsArray(): string[] {
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';
    return [keyword1, keyword2, keyword3].filter(k => k);
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
    return this.journalOptionsService.getOptionsForType(type).map(opt => ({ value: opt.value, label: opt.label }));
  }

  getDropdownLabel(type: JournalOptionType, value: string): string {
    const option = this.getDropdownOptions(type).find(opt => opt.value === value);
    return option?.label || value || '-';
  }
}
