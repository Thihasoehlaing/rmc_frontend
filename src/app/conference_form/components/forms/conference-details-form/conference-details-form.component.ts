import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoteComponent } from '../../../../shared/components/note/note.component';

@Component({
  selector: 'app-conference-details-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent],
  templateUrl: './conference-details-form.component.html',
  styleUrl: './conference-details-form.component.scss'
})
export class ConferenceDetailsFormComponent implements OnInit {
  form!: FormGroup;
  breakdownForm!: FormGroup;
  isBreakdownModalOpen = false;
  breakdownType: 'research' | 'external-research' | 'local' | 'overseas' | null = null;
  breakdownEditingIndex: number | null = null;

  // Breakdown arrays
  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  localBreakdowns: any[] = [];
  overseasBreakdowns: any[] = [];
  selectedFileName: string | null = null;
  selectedFile: File | null = null;

  regions = [
    'Americas',
    'ASEAN',
    'Australia',
    'Europe',
    'Malaysia',
    'MEA (Middle East & Africa)',
    'Pacific Islands'
  ];

  restrictedPublishers = [
    'MDPI',
    'Common Ground',
    'Hindawi',
    'Frontiers',
    'Other'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
    this.initializeBreakdownForm();
    this.setupBreakdownFormWatchers();
  }

  setupBreakdownFormWatchers() {
    // Watch for changes to cost and exchangeRate to update costInRM
    this.breakdownForm.get('cost')?.valueChanges.subscribe(() => this.updateCostInRM());
    this.breakdownForm.get('exchangeRate')?.valueChanges.subscribe(() => this.updateCostInRM());
  }

  updateCostInRM() {
    const cost = parseFloat(this.breakdownForm.get('cost')?.value) || 0;
    const exchangeRate = parseFloat(this.breakdownForm.get('exchangeRate')?.value) || 1;
    const costInRM = cost * exchangeRate;
    this.breakdownForm.patchValue({ costInRM: costInRM }, { emitEvent: false });
  }

  initializeBreakdownForm() {
    this.breakdownForm = this.fb.group({
      itemDescription: ['', [Validators.required]],
      voteNumber: ['', [Validators.required]],
      cost: ['', [Validators.required, Validators.min(0)]],
      exchangeRate: ['1', [Validators.required, Validators.min(0.01)]],
      costInRM: [{ value: '', disabled: true }],
      description: ['']
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
      sdgKeyword1: ['', [Validators.required]],
      sdgKeyword2: ['', [Validators.required]],
      sdgKeyword3: ['', [Validators.required]],
      conferenceName: ['', [Validators.required, Validators.maxLength(200)]],
      conferenceStartDate: ['', [Validators.required]],
      conferenceEndDate: ['', [Validators.required]],
      localOrOverseas: ['', [Validators.required]],
      researchType: ['', [Validators.required]],
      conferenceLocation: ['', [Validators.required, Validators.maxLength(200)]],
      paperTitle: ['', [Validators.required, Validators.maxLength(200)]],
      selectedRegion: ['', [Validators.required]],
      regionName: [''],
      percentage: [''],
      limit: [''],
      regionDescription: [''],
      projectAccountCode: [''],
      totalRM: [''],
      sponsoredAmountExternal: [''],
      sponsoredBy: [''],
      sponsorshipPercentage: [''],
      sponsorshipAmountAPU: [''],
      costByApplicant: [''],
      costingRemarks: [''],
      externalProjectAccountCode: [''],
      externalTotalRM: [''],
      externalSponsoredAmountExternal: [''],
      externalSponsoredBy: [''],
      externalSponsorshipPercentage: [''],
      externalSponsorshipAmountAPU: [''],
      externalCostByApplicant: [''],
      externalCostingRemarks: [''],
      localProjectAccountCode: [''],
      localTotalRM: [''],
      localSponsoredAmountExternal: [''],
      localSponsoredBy: [''],
      localSponsorshipPercentage: [''],
      localSponsorshipAmountAPU: [''],
      localCostByApplicant: [''],
      localCostingRemarks: [''],
      overseasProjectAccountCode: [''],
      overseasTotalRM: [''],
      overseasSponsoredAmountExternal: [''],
      overseasSponsoredBy: [''],
      overseasSponsorshipPercentage: [''],
      overseasSponsorshipAmountAPU: [''],
      overseasCostByApplicant: [''],
      overseasCostingRemarks: ['']
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

  openBreakdownModal(type: 'research' | 'external-research' | 'local' | 'overseas', index?: number) {
    this.breakdownType = type;
    this.isBreakdownModalOpen = true;

    if (index !== undefined) {
      // Editing existing entry
      this.breakdownEditingIndex = index;
      const array = this.getBreakdownArray(type);
      const data = array[index];
      this.breakdownForm.patchValue({
        itemDescription: data.itemDescription,
        voteNumber: data.voteNumber,
        cost: data.cost,
        exchangeRate: data.exchangeRate,
        costInRM: data.costInRM,
        description: data.description
      });
    } else {
      // Adding new entry
      this.breakdownEditingIndex = null;
      this.breakdownForm.reset({
        exchangeRate: 1,
        voteNumber: 'V29000'
      });
    }
  }

  closeBreakdownModal() {
    this.isBreakdownModalOpen = false;
    this.breakdownType = null;
    this.breakdownEditingIndex = null;
    this.breakdownForm.reset();
  }

  submitBreakdownModal() {
    if (this.breakdownForm.invalid) {
      return;
    }

    const formData = this.breakdownForm.value;
    // Calculate Cost in RM (Cost * Exchange Rate)
    const costInRM = (parseFloat(formData.cost) || 0) * (parseFloat(formData.exchangeRate) || 1);
    const entry = {
      ...formData,
      costInRM: parseFloat(costInRM.toFixed(2))
    };

    const array = this.getBreakdownArray(this.breakdownType!);

    if (this.breakdownEditingIndex !== null) {
      // Update existing entry
      array[this.breakdownEditingIndex] = entry;
    } else {
      // Add new entry
      array.push(entry);
    }

    this.closeBreakdownModal();
  }

  deleteBreakdown(type: 'research' | 'external-research' | 'local' | 'overseas', index: number) {
    const array = this.getBreakdownArray(type);
    array.splice(index, 1);
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

  private getBreakdownArray(type: 'research' | 'external-research' | 'local' | 'overseas'): any[] {
    switch (type) {
      case 'research':
        return this.researchBreakdowns;
      case 'external-research':
        return this.externalBreakdowns;
      case 'local':
        return this.localBreakdowns;
      case 'overseas':
        return this.overseasBreakdowns;
      default:
        return [];
    }
  }

  getBreakdownModalTitle(): string {
    if (!this.breakdownType) return '';
    const isEditing = this.breakdownEditingIndex !== null ? 'Edit' : 'Add';
    const titles = {
      'research': `${isEditing} Research Breakdown Entry`,
      'external-research': `${isEditing} External Research Project Breakdown Entry`,
      'local': `${isEditing} Local Breakdown Entry`,
      'overseas': `${isEditing} Overseas Breakdown Entry`
    };
    return titles[this.breakdownType];
  }
}

