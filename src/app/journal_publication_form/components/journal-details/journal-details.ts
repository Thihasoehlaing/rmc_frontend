import { Component, OnInit, inject, effect } from '@angular/core';
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
  imports: [CommonModule, ReactiveFormsModule, NoteComponent, SearchableDropdownComponent, DialogComponent, FileUploadComponent, CharacterCounterComponent, CustomHeaderComponent, CustomSubheaderComponent],
  templateUrl: './journal-details.html',
  styleUrl: './journal-details.scss'
})
export class JournalDetails implements OnInit {
  auth = inject(AuthService);
  workflow = inject(JournalWorkflowService);
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
      externalProjectAccountCode: ['', Validators.required],
      totalRM: [''],
      sponsoredAmountExternal: ['', Validators.required],
      sponsoredBy: ['', Validators.required],
      sponsorshipPercentage: ['', Validators.required],
      sponsorshipAmountAPU: [''],
      costByApplicant: ['', Validators.required],
      costingRemarks: ['']
    });

    this.breakdownForm = this.fb.group({
      itemDescription: ['', Validators.required],
      voteNumber: ['', Validators.required],
      cost: ['', Validators.required],
      exchangeRate: ['', Validators.required],
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
