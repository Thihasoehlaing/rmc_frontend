import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';

@Component({
  selector: 'app-journal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent, SearchableDropdownComponent, DialogComponent, FileUploadComponent, CharacterCounterComponent],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss'
})
export class JournalDetails implements OnInit {
  form!: FormGroup;
  breakdownForm!: FormGroup;
  isBreakdownModalOpen = false;
  breakdownType: 'Internal Research Project' | 'External Research Project' | 'Non-Research Project' | string | null = null;
  breakdownEditingIndex: number | null = null;
  selectedResearchnonResearch: boolean = true;

  // Breakdown arrays
  researchBreakdowns: any[] = [];
  externalBreakdowns: any[] = [];
  NonResearchBreakdowns: any[] = [];
  
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  
  breakdownOptions: any[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      authorshipType: [''],
      scopusQuartile: [''],
      researchType: [''],
      restrictedPublisher: [''],
      journalName: [''],
      paperTitle: [''],
      sdgKeyword1: [''],
      sdgKeyword2: [''],
      sdgKeyword3: [''],
      projectAccountCode: [''],
      externalProjectAccountCode: [''],
      totalRM: [''],
      sponsoredAmountExternal: [''],
      sponsoredBy: [''],
      sponsorshipPercentage: [''],
      sponsorshipAmountAPU: [''],
      costByApplicant: [''],
      costingRemarks: ['']
    });

    this.breakdownForm = this.fb.group({
      itemDescription: [''],
      voteNumber: [''],
      cost: [''],
      exchangeRate: [''],
      description: ['']
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
    this.breakdownType = type;
    if (index !== undefined) {
      this.breakdownEditingIndex = index;
    } else {
      this.breakdownEditingIndex = null;
    }
    this.isBreakdownModalOpen = true;
  }

  closeBreakdownModal() {
    this.isBreakdownModalOpen = false;
    this.breakdownType = null;
    this.breakdownEditingIndex = null;
  }

  getBreakdownModalTitle(): string {
    if (this.breakdownType === 'internal-research') return 'Internal Research Breakdown';
    if (this.breakdownType === 'external-research') return 'External Research Breakdown';
    if (this.breakdownType === 'non-research') return 'Non-Research Breakdown';
    return 'Breakdown';
  }

  getBreakdownOptionsForType(): any[] {
    return this.breakdownOptions;
  }

  onFileSelected(file: File) {
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.selectedFileName = null;
  }

  submitBreakdownModal() {
    this.closeBreakdownModal();
  }

  deleteBreakdown(type: string, index: number) {
    this.getBreakdownArray(type).splice(index, 1);
  }

  getCharacterCount(controlName: string): number {
    return this.form.get(controlName)?.value?.length || 0;
  }
}
