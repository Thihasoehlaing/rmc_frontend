import { Component, OnInit, inject, effect, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { JournalOptionsService } from '../../services/journal-options.service';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, CharacterCounterComponent, CustomHeaderComponent, DataTableComponent, NoteComponent, SearchableDropdownComponent, DialogComponent, ValidationMessageComponent],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss'
})
export class JournalDetails implements OnInit {
  auth = inject(AuthService);
  workflow = inject(JournalWorkflowService);
  private journalOptionsService = inject(JournalOptionsService);
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

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  breakdownOptions: any[] = [];
  currentBreakdownOptions: any[] = [];

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

  readonly nonResearchBreakdownColumns: DataTableColumn[] = [
    { key: 'accountCodeDescription', label: 'Account Code Description' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'description', label: 'Description' },
    { key: 'fileName', label: 'Supporting Doc' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  @Output() formValidityChange = new EventEmitter<boolean>();

  constructor(private fb: FormBuilder) {
    effect(() => {
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.form?.disable({ emitEvent: false });
          // breakdownForm is a transient modal form — do not disable it via the
          // workflow effect, as doing so causes Angular's NumberValueAccessor to
          // reformat number inputs (cost, exchangeRate) and corrupt user-entered values.
        } else {
          this.form?.enable({ emitEvent: false });
          // Same reason: do not re-enable breakdownForm here.
        }
      }, 0);
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
      projectAccountCode: [''], // Only conditionally required for non-external 
      externalProjectAccountCode: [''], // For external research
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

    this.form.get('scopusQuartile')?.valueChanges.subscribe(() => this.calculateTotals());
    this.form.get('researchType')?.valueChanges.subscribe((type) => {
      // Manage validation properly based on the new conditions
      this.form.get('projectAccountCode')?.setValidators([Validators.required]);
      this.form.get('projectAccountCode')?.updateValueAndValidity();
      
      this.calculateTotals();
    });
    this.form.get('sponsoredAmountExternal')?.valueChanges.subscribe(() => this.calculateTotals());

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
      // voteNumber is only required for research types; non-research uses accountCode instead
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

    this.breakdownForm.get('itemDescription')?.valueChanges.subscribe((value) => {
      if (this.breakdownType !== 'non-research') return;
      const selected = this.findNonResearchOption(value);
      // Auto-fill Account Code and its description from the selected option's metadata
      this.breakdownForm.patchValue({
        accountCode: selected?.accountCode || '',
        accountCodeDescription: selected?.label || ''
      }, { emitEvent: false });
    });
    // NOTE: costInRM is recalculated via recalcCostInRM() called from (input) events
    // in the template — NOT via valueChanges — to avoid feedback loops that corrupt
    // the exchange rate value while the user is still typing.
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

    // Defer modal opening to next tick to avoid change detection overlaps
    setTimeout(() => {
      // 1. Resolve dropdown options for this type
      if (type === 'non-research') {
        const localOpts = this.journalOptionsService.getOptionsForType('local');
        this.currentBreakdownOptions = localOpts.filter(opt => {
          const meta = this.getOptionMetadata('local', opt.value);
          return !meta || meta.status !== 'Inactive';
        }).map(opt => ({
          value: opt.value,
          label: opt.label,
          accountCode: this.getOptionMetadata('local', opt.value)?.accountCode || ''
        }));
      } else {
        const researchOpts = this.journalOptionsService.getOptionsForType('research');
        this.currentBreakdownOptions = researchOpts.filter(opt => {
          const meta = this.getOptionMetadata('research', opt.value);
          return !meta || meta.status !== 'Inactive';
        }).map(opt => ({
          value: opt.label,
          label: opt.label
        }));
      }

      // 2. Reset form first so we start from a clean slate
      this.breakdownForm.reset({}, { emitEvent: false });
      // Also reset the file picker so a previous entry's file doesn't bleed in
      this.selectedFile = null;
      this.selectedFileName = null;

      // 3. Configure validators and enable/disable fields AFTER reset
      //    (reset() re-applies initial disabled state, so enable must come after)
      const voteNumberCtrl = this.breakdownForm.get('voteNumber');
      const accountCodeCtrl = this.breakdownForm.get('accountCode');

      if (type === 'non-research') {
        // Non-research: Account Code is auto-filled; Vote Number is not used
        voteNumberCtrl?.clearValidators();
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        accountCodeCtrl?.enable({ emitEvent: false });
      } else {
        // Research types: Vote Number is required; Account Code is not used
        voteNumberCtrl?.setValidators([Validators.required]);
        voteNumberCtrl?.updateValueAndValidity({ emitEvent: false });
        accountCodeCtrl?.disable({ emitEvent: false });
      }

      // 4. Populate form values
      if (index !== undefined) {
        // Editing an existing entry
        this.breakdownEditingIndex = index;
        const entry = this.getBreakdownArray(type)[index];
        // Restore the saved file name so the user can see what was previously uploaded
        this.selectedFileName = entry.fileName || null;
        this.selectedFile = null; // actual File object is not re-stored; only the name is shown
        if (type === 'non-research') {
          // Re-resolve the option so accountCode is always fresh from the options list
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
        // New entry — form already reset above; set defaults for research types
        this.breakdownEditingIndex = null;
        if (type === 'internal-research' || type === 'external-research') {
          this.breakdownForm.patchValue({ voteNumber: 'V29000' }, { emitEvent: false });
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
    // Reset validators to a clean state
    this.breakdownForm.get('voteNumber')?.clearValidators();
    this.breakdownForm.get('voteNumber')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
  }

  private findNonResearchOption(value: string): { value: string; label: string; accountCode?: string } | undefined {
    if (!value) return undefined;
    return this.currentBreakdownOptions.find(opt => opt.value === value)
      || this.currentBreakdownOptions.find(opt => opt.label === value);
  }

  saveBreakdownEntry() {
    if (this.breakdownForm.invalid) {
      this.breakdownForm.markAllAsTouched();
      return;
    }

    const entry = this.breakdownForm.getRawValue();
    const cost = parseFloat(entry.cost);
    const rate = parseFloat(entry.exchangeRate);

    // Compute costInRM precisely; preserve the user's exact cost and exchangeRate values
    let costInRM = '';
    if (Number.isFinite(cost) && Number.isFinite(rate) && rate > 0) {
      costInRM = (Math.round(cost * rate * 100) / 100).toFixed(2);
    } else if (Number.isFinite(cost)) {
      costInRM = cost.toFixed(2);
    }

    // For non-research: always resolve accountCode from the options list to guarantee it's populated
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
      // Persist the uploaded file name so it shows in the table
      fileName: this.selectedFileName || entry.fileName || ''
    };

    const type = this.breakdownType as string;
    const array = this.getBreakdownArray(type);

    if (this.breakdownEditingIndex !== null) {
      array[this.breakdownEditingIndex] = entryToSave;
    } else {
      array.push(entryToSave);
    }

    this.calculateTotals();
    this.closeBreakdownModal();
  }

  deleteBreakdown(type: string, index: number) {
    const array = this.getBreakdownArray(type);
    array.splice(index, 1);
    this.calculateTotals();
  }

calculateBreakdownTotal(type: string): number {
    const array = this.getBreakdownArray(type);
    let total = 0;
    for (const item of array) {
      total += parseFloat(item.costInRM) || 0;
    }
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

    breakdownArray.forEach(item => {
      totalRM += parseFloat(item.costInRM) || 0;
    });

    const q = this.form.get('scopusQuartile')?.value || '';
    let manualExternal = parseFloat(this.form.get('sponsoredAmountExternal')?.value) || 0;

    let spPercent = 0;
    let spAPU = 0;
    let applicantCost = 0;

    if (pType === 'external-research') {
      // 5 & 6. Sponsored By validation
      if (manualExternal > 0) {
        this.form.get('sponsoredBy')?.setValidators([Validators.required]);
      } else {
        this.form.get('sponsoredBy')?.clearValidators();
      }
      this.form.get('sponsoredBy')?.updateValueAndValidity({ emitEvent: false });

      // Validate Sponsorship Amount by External cannot exceed Total in RM
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

      const remainingBalance = Math.max(totalRM - manualExternal, 0);

      // Sponsorship Percentage Requested (%)
      if (q === 'Q1' || q === 'Q2' || q === 'Q3') {
        spPercent = 100;
      } else {
        spPercent = 0;
      }

      // APU Sponsorship Amount
      spAPU = remainingBalance;

      // Cost to be Borne by Applicant (RM)
      applicantCost = 0;

    } else if (pType === 'internal-research' || pType === 'non-research') {
      // 1 & 2 & 6. Sponsored By / External Amount validaton (Same bounds as external flow)
      // Removed .enable() to fix constant resetting lockup while typing.

      if (q === 'Q1' || q === 'Q2') spPercent = 100;
      else if (q === 'Q3') spPercent = 50;

      const remainingBalance = Math.max(totalRM - manualExternal, 0);

      if (q === 'Q1' || q === 'Q2') {
        // Sponsorship Percentage Requested (%)
        spPercent = 100;

        // APU Sponsorship Amount
        spAPU = remainingBalance;

        // Cost to be Borne by Applicant (RM)
        applicantCost = 0;
      } else if (q === 'Q3') {
        // Sponsorship Percentage Requested (%)
        spPercent = 50;

        // APU Sponsorship Amount
        spAPU = remainingBalance * 0.5;

        // Cost to be Borne by Applicant (RM)
        applicantCost = remainingBalance * 0.5;
      } else {
        spPercent = 0;
        spAPU = 0;
        applicantCost = remainingBalance;
      }
    }

    // Do NOT patch sponsoredAmountExternal to avoid overwriting or forcing auto-format on the user's manual input
    this.form.patchValue({
      totalRM: totalRM ? totalRM.toFixed(2) : '0.00',
      sponsorshipPercentage: spPercent ? spPercent.toString() : '0',
      sponsorshipAmountAPU: spAPU ? spAPU.toFixed(2) : '0.00',
      costByApplicant: applicantCost ? applicantCost.toFixed(2) : '0.00'
    }, { emitEvent: false });
    
    // Breakdown table is required for external-research and non-research
    const isBreakdownValid = (pType === 'external-research' || pType === 'non-research')
      ? breakdownArray.length > 0
      : true;
    this.formValidityChange.emit(this.form.valid && isBreakdownValid);
  }
  getBreakdownModalTitle(): string {
    if (this.breakdownType === 'internal-research') return 'Detailed Breakdown for Internal Research Project';
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



  private getOptionMetadata(type: 'research' | 'local', value: string): any {
    const storageKey = `journal-option-metadata-${type}-${value}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== 'undefined') {
        return JSON.parse(stored);
      }
    } catch {
      // Silently discard malformed metadata — do not log storage key names
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

  /**
   * Recalculate Cost in RM from the current cost and exchange rate values.
   * Called from (input) events on the cost and exchangeRate fields so the
   * calculation only runs on genuine user input — never as a side-effect of
   * patchValue() calls — which prevents the exchange rate from being mutated.
   * Both cost and exchangeRate are stored as strings (type="text") to prevent
   * Angular's NumberValueAccessor from reformatting the user's entered value.
   */
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

  /**
   * Clamp a text-mode numeric input to >= 0.
   * Bound to (input) on cost and exchangeRate fields to reject negative values.
   * Works with type="text" inputs (no NumberValueAccessor interference).
   */
  clampPositive(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/,/g, '');
    const val = parseFloat(raw);
    if (Number.isFinite(val) && val < 0) {
      input.value = '0';
      // Sync back into the reactive form control by id
      const ctrl = this.breakdownForm.get(input.id);
      if (ctrl) {
        ctrl.setValue('0', { emitEvent: false });
      }
    }
  }

  /**
   * Clamp a numeric input in the main form to >= 0.
   */
  clampPositiveMain(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (Number.isFinite(val) && val < 0) {
      input.value = '0';
      this.form.get(controlName)?.setValue(0, { emitEvent: true });
    }
  }

  /**
   * Strip any digit characters from a name text input.
   * Bound to (input) on name fields to prevent numeric entry.
   */
  stripDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      // Sync back to the reactive form control by id
      const ctrl = this.breakdownForm.get(input.id) || this.form.get(input.id);
      if (ctrl) {
        ctrl.setValue(cleaned, { emitEvent: true });
      }
    }
  }

  /**
   * Enforce integer-only input on the Exchange Rate field.
   * Strips any non-digit characters (including decimal points) on input.
   */
  enforceInteger(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.breakdownForm.get('exchangeRate')?.setValue(cleaned, { emitEvent: false });
    }
    this.recalcCostInRM();
  }

  /**
   * Open SDG Keywords Modal
   */
  openSDGKeywordsModal() {
    // Populate the modal form with current values from the main form
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';

    this.sdgKeywordsForm.patchValue({
      keyword1,
      keyword2,
      keyword3
    }, { emitEvent: false });

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
    this.form.patchValue({
      sdgKeyword1: keyword1,
      sdgKeyword2: keyword2,
      sdgKeyword3: keyword3
    }, { emitEvent: false });

    this.closeSDGKeywordsModal();
  }

  /**
   * Get displayed keywords as array
   */
  getDisplayedKeywordsArray(): string[] {
    const keyword1 = this.form.get('sdgKeyword1')?.value || '';
    const keyword2 = this.form.get('sdgKeyword2')?.value || '';
    const keyword3 = this.form.get('sdgKeyword3')?.value || '';

    return [keyword1, keyword2, keyword3].filter(k => k);
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



