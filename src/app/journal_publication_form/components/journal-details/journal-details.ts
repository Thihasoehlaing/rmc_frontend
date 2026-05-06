import { Component, OnInit, OnDestroy, inject, effect, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
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
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { JournalOptionType, JournalOptionsService } from '../../services/journal-options.service';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent, SearchableDropdownComponent, DialogComponent, CharacterCounterComponent, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, ActionButtonComponent, DataTableComponent],
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

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  voteNumberDescriptionOptions: { value: string; label: string }[] = [];
  voteNumberOptions: { value: string; label: string }[] = [];
  accountCodeDescriptionOptions: { value: string; label: string }[] = [];
  accountCodeOptions: { value: string; label: string }[] = [];

  readonly breakdownColumns: DataTableColumn[] = [
    { key: 'itemDescription', label: 'Vote Number Description' },
    { key: 'voteNumber', label: 'Vote Number', width: '140px' },
    { key: 'accountCodeDescription', label: 'Account Code Description' },
    { key: 'accountCode', label: 'Account Code', width: '140px' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  @Output() formValidityChange = new EventEmitter<boolean>();

  private onJournalDropdownsUpdated = (): void => {
    // Refresh options from the management-table-backed service when settings change
    this.refreshDropdownOptions();
    this.cdr.detectChanges();
  };

  constructor(private fb: FormBuilder) {
    effect(() => {
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.form?.disable({ emitEvent: false });
          this.breakdownForm?.disable({ emitEvent: false });
        } else {
          this.form?.enable({ emitEvent: false });
          this.breakdownForm?.enable({ emitEvent: false });
        }
      }, 0);
    });

    effect(() => {
      // Keep dropdown arrays synchronized with table-backed option signals.
      this.journalOptionsService.voteNumberDescriptionOptions();
      this.journalOptionsService.voteNumberOptions();
      this.journalOptionsService.accountCodeDescriptionOptions();
      this.journalOptionsService.accountCodeOptions();
      this.refreshDropdownOptions();
    });
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

    this.form.get('researchType')?.valueChanges.subscribe((type) => {
      // Manage validation properly based on the new conditions
      this.form.get('projectAccountCode')?.setValidators([Validators.required]);
      this.form.get('projectAccountCode')?.updateValueAndValidity();
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
      voteNumber: ['', Validators.required],
      accountCodeDescription: ['', Validators.required],
      accountCode: ['', Validators.required]
    });

    this.sdgKeywordsForm = this.fb.group({
      keyword1: ['', Validators.required],
      keyword2: ['', Validators.required],
      keyword3: ['', Validators.required]
    });

    this.refreshDropdownOptions();

    // Listen for dropdown updates from admin settings
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

    // Defer modal opening to next tick to avoid any form interaction or change detection overlaps
    setTimeout(() => {
      if (index !== undefined) {
        this.breakdownEditingIndex = index;
        const entry = this.getBreakdownArray(type)[index];
        this.breakdownForm.patchValue(entry, { emitEvent: false });
      } else {
        this.breakdownEditingIndex = null;
        this.breakdownForm.reset();
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
    this.cdr.detectChanges();
  }

  saveBreakdownEntry() {
    if (this.breakdownForm.invalid) {
      this.breakdownForm.markAllAsTouched();
      return;
    }

    const entry = this.breakdownForm.getRawValue();
    const type = this.breakdownType as string;
    const array = this.getBreakdownArray(type);

    if (this.breakdownEditingIndex !== null) {
      array[this.breakdownEditingIndex] = entry;
    } else {
      array.push(entry);
    }

    this.closeBreakdownModal();
  }

  deleteBreakdown(type: string, index: number) {
    const array = this.getBreakdownArray(type);
    array.splice(index, 1);
  }

calculateBreakdownTotal(type: string): number {
    return 0;
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
      this.form.get('sponsoredBy')?.enable({ emitEvent: false });
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

      this.form.get('sponsoredBy')?.setValue('External', { emitEvent: false });
      this.form.get('sponsoredBy')?.disable({ emitEvent: false });
    } else if (pType === 'internal-research' || pType === 'non-research') {
      // 1 & 2 & 6. Sponsored By / External Amount validaton (Same bounds as external flow)
      this.form.get('sponsoredBy')?.enable({ emitEvent: false });

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

    // Evaluate if Breakdown table is required for external
    const isBreakdownValid = pType === 'external-research' ? breakdownArray.length > 0 : true;
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
    return this.journalOptionsService.getOptionsForType(type)
      .map(opt => ({ value: opt.value, label: opt.label }));
  }

  getDropdownLabel(type: JournalOptionType, value: string): string {
    const option = this.getDropdownOptions(type).find(opt => opt.value === value);
    return option?.label || value || '-';
  }
}



