import { Component, OnInit, inject, effect, Output, EventEmitter } from '@angular/core';
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
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent, SearchableDropdownComponent, DialogComponent, FileUploadComponent, CharacterCounterComponent, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss'
})
export class JournalDetails implements OnInit {
  auth = inject(AuthService);
  workflow = inject(JournalWorkflowService);
  form!: FormGroup;
  breakdownForm!: FormGroup;
  sdgKeywordsForm!: FormGroup;
  isBreakdownModalOpen = false;
  isSDGKeywordsModalOpen = false;
  breakdownType: 'internal-research' | 'external-research' | 'non-research' | null = null;
  breakdownEditingIndex: number | null = null;
  selectedResearchnonResearch: boolean = true;

  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  NonResearchBreakdowns: any[] = [];

  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  breakdownOptions: any[] = [];

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
      journalName: ['', Validators.required],
      paperTitle: ['', Validators.required],
      sdgKeyword1: ['', Validators.required],
      sdgKeyword2: [''],
      sdgKeyword3: [''],
      projectAccountCode: ['', Validators.required],
      totalRM: [{ value: 0, disabled: true }],
      sponsoredAmountExternal: [{ value: 0, disabled: true }],
      sponsoredBy: [''],
      sponsorshipPercentage: [{ value: 0, disabled: true }],
      sponsorshipAmountAPU: [{ value: 0, disabled: true }],
      costByApplicant: [{ value: 0, disabled: true }],
      costingRemarks: ['']
    });

    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });

    this.form.get('scopusQuartile')?.valueChanges.subscribe(() => this.calculateTotals());
    this.form.get('researchType')?.valueChanges.subscribe(() => this.calculateTotals());
    this.form.get('sponsoredBy')?.valueChanges.subscribe(() => this.calculateTotals());

    this.breakdownForm = this.fb.group({
      itemDescription: [''],
      voteNumber: [''],
      accountCodeDescription: [''],
      accountCode: [''],
      cost: [''],
      costForeign: [''],
      exchangeRate: [''],
      description: [''],
      costInRM: [{ value: '', disabled: true }]
    });

    this.sdgKeywordsForm = this.fb.group({
      keyword1: ['', Validators.required],
      keyword2: ['', Validators.required],
      keyword3: ['', Validators.required]
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
    if (index !== undefined) {
      this.breakdownEditingIndex = index;
      const entry = this.getBreakdownArray(type)[index];
      this.breakdownForm.patchValue(entry, { emitEvent: false });
    } else {
      this.breakdownEditingIndex = null;
      this.breakdownForm.reset();
    }
    this.isBreakdownModalOpen = true;
  }

  closeBreakdownModal() {
    this.isBreakdownModalOpen = false;
    this.breakdownType = null;
    this.breakdownEditingIndex = null;
    this.breakdownForm.reset();
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

  calculateTotals() {
    const pType = this.researchType;
    let breakdownArray = this.getBreakdownArray(pType || '');
    let totalRM = 0;

    breakdownArray.forEach(item => {
      totalRM += parseFloat(item.costInRM) || 0;
    });

    const q = this.form.get('scopusQuartile')?.value;

    let spPercent = 0;
    let spExternal = 0;
    let spAPU = 0;
    let applicantCost = 0;

    if (pType === 'external-research') {
      spPercent = 100;
      spExternal = totalRM;
      spAPU = 0;
      applicantCost = 0;

      this.form.get('sponsoredBy')?.setValue('External', { emitEvent: false });
      this.form.get('sponsoredBy')?.disable({ emitEvent: false });
    } else if (pType === 'internal-research' || pType === 'non-research') {
      this.form.get('sponsoredBy')?.enable({ emitEvent: false });

      if (q === 'Q1' || q === 'Q2') spPercent = 100;
      else if (q === 'Q3') spPercent = 50;

      const sponsoredAmount = totalRM * (spPercent / 100);
      applicantCost = totalRM - sponsoredAmount;

      const sponsoredBy = this.form.get('sponsoredBy')?.value;

      if (sponsoredBy === 'External') spExternal = sponsoredAmount;
      else if (sponsoredBy === 'APU') spAPU = sponsoredAmount;
    }

    this.form.patchValue({
      totalRM: totalRM ? totalRM.toFixed(2) : '0.00',
      sponsorshipPercentage: spPercent ? spPercent.toString() : '0',
      sponsoredAmountExternal: spExternal ? spExternal.toFixed(2) : '0.00',
      sponsorshipAmountAPU: spAPU ? spAPU.toFixed(2) : '0.00',
      costByApplicant: applicantCost ? applicantCost.toFixed(2) : '0.00'
    }, { emitEvent: false });
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

  getBreakdownOptionsForType(): any[] {
    return this.breakdownOptions;
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
}


