import { Component, OnInit, inject, effect, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
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
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { JournalOptionsService } from '../../services/journal-options.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';

import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent, SearchableDropdownComponent, DialogComponent, FileUploadComponent, CharacterCounterComponent, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, ActionButtonComponent, DataTableComponent],
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

  readonly breakdownColumns: DataTableColumn[] = [
    { key: 'itemDescription', label: 'Item Description' },
    { key: 'voteNumber', label: 'Vote Number', width: '150px' },
    { key: 'cost', label: 'Cost (Foreign/MYR)', width: '150px', align: 'right', headerAlign: 'right' },
    { key: 'exchangeRate', label: 'Exchange Rate', width: '130px', align: 'right', headerAlign: 'right' },
    { key: 'costInRM', label: 'Cost in RM', width: '120px', align: 'right', headerAlign: 'right' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  isBreakdownModalOpen = false;
  breakdownType: 'internal-research' | 'external-research' | 'non-research' | null = null;
  breakdownEditingIndex: number | null = null;

  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  NonResearchBreakdowns: any[] = [];

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  breakdownOptions: any[] = [];
  currentBreakdownOptions: any[] = [];

  @Output() formValidityChange = new EventEmitter<boolean>();

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
      costingRemarks: ['', [Validators.maxLength(255)]]
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
    this.form.get('sponsoredBy')?.valueChanges.subscribe(() => this.calculateTotals());

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
      voteNumber: [{ value: '', disabled: true }, Validators.required],
      accountCodeDescription: [''],
      accountCode: [''],
      cost: ['', Validators.required],
      costForeign: [''],
      exchangeRate: ['', Validators.required],
      description: [''],
      costInRM: [{ value: '', disabled: true }]
    });

    this.breakdownForm.get('itemDescription')?.valueChanges.subscribe(value => {
      if (!value) return;

      if (this.breakdownType === 'internal-research' || this.breakdownType === 'external-research') {
        this.breakdownForm.patchValue({ voteNumber: 'V29000' }, { emitEvent: false });
      } else if (this.breakdownType === 'non-research') {
        const localOpts = this.journalOptionsService.getOptionsForType('local');
        const matchedOpt = localOpts.find(opt => opt.label === value || opt.value === value);
        if (matchedOpt) {
          const meta = this.getOptionMetadata('local', matchedOpt.value);
          if (meta && meta.accountCode) {
            this.breakdownForm.patchValue({ voteNumber: meta.accountCode }, { emitEvent: false });
          } else {
            this.breakdownForm.patchValue({ voteNumber: '-' }, { emitEvent: false });
          }
        }
      }
    });

    this.breakdownForm.valueChanges.subscribe((val) => {
      const cost = parseFloat(val.cost);
      const rate = parseFloat(val.exchangeRate);
      
      let rm: number | null = null;
      if (!isNaN(cost) && !isNaN(rate)) {
        rm = cost * rate;
      } else if (!isNaN(cost)) {
        rm = cost;
      }

      this.breakdownForm.patchValue({ costInRM: rm !== null ? rm.toFixed(2) : '' }, { emitEvent: false });
    });
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
      // Resolve dropdown options only when modal opens
      if (type === 'non-research') {
        const localOpts = this.journalOptionsService.getOptionsForType('local');
        this.currentBreakdownOptions = localOpts.filter(opt => {
          const meta = this.getOptionMetadata('local', opt.value);
          return !meta || meta.status !== 'Inactive';
        }).map(opt => ({
          value: opt.label,
          label: opt.label
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

      if (index !== undefined) {
        this.breakdownEditingIndex = index;
        const entry = this.getBreakdownArray(type)[index];
        this.breakdownForm.patchValue(entry, { emitEvent: false });
      } else {
        this.breakdownEditingIndex = null;
        this.breakdownForm.reset();
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

  calculateTotals() {
    const pType = this.researchType;
    let breakdownArray = this.getBreakdownArray(pType || '');
    let totalRM = this.calculateBreakdownTotal(pType || '');

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

      // 7. Sponsorship Percentage Requested (%)
      spPercent = 100;

      // 8. APU Sponsorship Amount
      let remainingBalance = Math.max(totalRM - manualExternal, 0);
      spAPU = Math.min(remainingBalance, 5000);

      // 9. Cost to be Borne by Applicant (RM)
      applicantCost = Math.max(totalRM - manualExternal - spAPU, 0);

    } else if (pType === 'internal-research' || pType === 'non-research') {
      // 1 & 2 & 6. Sponsored By / External Amount validaton (Same bounds as external flow)
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

      // 3. Sponsorship Percentage Requested (%) fixed at 0
      spPercent = 0;
      
      // 4. Sponsorship Amount by APU (RM) fixed at 0
      spAPU = 0;

      // 5. Cost to be Borne by Applicant (RM) auto-calculated
      applicantCost = Math.max(totalRM - manualExternal, 0);
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



  private getOptionMetadata(type: 'research' | 'local', value: string): any {
    const storageKey = `journal-option-metadata-${type}-${value}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== 'undefined') {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`Failed to parse metadata for ${storageKey}`, error);    }
    return null;  }

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
}



