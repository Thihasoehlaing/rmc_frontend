import { Component, inject, Input, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-risk-assessment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    DataTableComponent,
    ValidationMessageComponent,
    ActionButtonComponent,
    FileUploadComponent
  ],
  templateUrl: './risk-assessment.html',
  styleUrls: ['./risk-assessment.scss']
})
export class RiskAssessment implements OnChanges, OnInit {
  private fb = inject(FormBuilder);

  @Input() isDisabled = false;

  readonly apuLeadMembersColumns: DataTableColumn[] = [
    { key: 'index', label: 'No', width: '50px', align: 'center', headerAlign: 'center' },
    { key: 'name', label: 'Name' },
    { key: 'functionalUnit', label: 'Functional Unit' },
    { key: 'email', label: 'Email' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  readonly milestonesColumns: DataTableColumn[] = [
    { key: 'index', label: 'No', width: '50px', align: 'center', headerAlign: 'center' },
    { key: 'action', label: 'Action/Milestone' },
    { key: 'startDate', label: 'Start Date', width: '150px' },
    { key: 'endDate', label: 'End Date', width: '150px' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  readonly outcomesColumns: DataTableColumn[] = [
    { key: 'index', label: 'No', width: '50px', align: 'center', headerAlign: 'center' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'startDate', label: 'Start Date', width: '150px' },
    { key: 'endDate', label: 'End Date', width: '150px' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  readonly supportingDocsColumns: DataTableColumn[] = [
    { key: 'index', label: 'No', width: '50px', align: 'center', headerAlign: 'center' },
    { key: 'documentType', label: 'Document Type' },
    { key: 'file', label: 'File' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' }
  ];

  isModalOpen = false;
  modalType: 'leadMember' | 'milestone' | 'outcome' | 'suppDoc' | null = null;
  editingIndex: number | null = null;

  leadMemberForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    functionalUnit: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  milestoneForm: FormGroup = this.fb.group({
    action: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required]
  });

  outcomeForm: FormGroup = this.fb.group({
    outcome: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required]
  });

  supportingDocForm: FormGroup = this.fb.group({
    documentType: ['', Validators.required],
    fileName: ['', Validators.required],
    description: ['']
  });

  riskForm: FormGroup = this.fb.group({
    affordability: ['', [Validators.required, Validators.maxLength(2000)]],     
    sustainability: ['', [Validators.required, Validators.maxLength(2000)]],    
    strategic: ['', [Validators.required, Validators.maxLength(2000)]],
    studentFocus: ['', [Validators.required, Validators.maxLength(2000)]],      
    outcome: ['', [Validators.required, Validators.maxLength(500)]],
    successFactor: ['', [Validators.maxLength(500)]],
    apuLeadMembers: this.fb.array([]),
    milestones: this.fb.array([]),
    outcomes: this.fb.array([]),
    supportingDocs: this.fb.array([])
  });

  get apuLeadMembers(): FormArray {
    return this.riskForm.get('apuLeadMembers') as FormArray;
  }

  get milestones(): FormArray {
    return this.riskForm.get('milestones') as FormArray;
  }

  get outcomes(): FormArray {
    return this.riskForm.get('outcomes') as FormArray;
  }

  get supportingDocs(): FormArray {
    return this.riskForm.get('supportingDocs') as FormArray;
  }

  ngOnInit(): void {
    this.updateFormState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isDisabled'] && !changes['isDisabled'].firstChange) {
      this.updateFormState();
    }
  }

  openModal(type: 'leadMember' | 'milestone' | 'outcome' | 'suppDoc', index?: number): void {
    if (this.isDisabled) return;

    this.modalType = type;
    this.editingIndex = index !== undefined ? index : null;

    if (type === 'leadMember') {
      if (this.editingIndex !== null) {
        this.leadMemberForm.patchValue(this.apuLeadMembers.at(this.editingIndex).value);
      } else {
        this.leadMemberForm.reset();
      }
    } else if (type === 'milestone') {
      if (this.editingIndex !== null) {
        this.milestoneForm.patchValue(this.milestones.at(this.editingIndex).value);
      } else {
        this.milestoneForm.reset();
      }
    } else if (type === 'outcome') {
      if (this.editingIndex !== null) {
        this.outcomeForm.patchValue(this.outcomes.at(this.editingIndex).value); 
      } else {
        this.outcomeForm.reset();
      }
    } else if (type === 'suppDoc') {
      if (this.editingIndex !== null) {
        this.supportingDocForm.patchValue(this.supportingDocs.at(this.editingIndex).value);
      } else {
        this.supportingDocForm.reset();
      }
    }

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    this.editingIndex = null;
    this.leadMemberForm.reset();
    this.milestoneForm.reset();
    this.outcomeForm.reset();
    this.supportingDocForm.reset();
  }

  get currentForm(): FormGroup {
    if (this.modalType === 'milestone') return this.milestoneForm;
    if (this.modalType === 'outcome') return this.outcomeForm;
    if (this.modalType === 'suppDoc') return this.supportingDocForm;
    return this.leadMemberForm;
  }

  onFileSelected(eventOrFile: any): void {
    const file = eventOrFile?.target?.files?.[0] || eventOrFile;
    if (file && file.name) {
      this.supportingDocForm.patchValue({ fileName: file.name });
    } else {
      this.supportingDocForm.patchValue({ fileName: '' });
    }
  }

  submitModal(): void {
    const form = this.currentForm;

    if (form.invalid) {
      Object.keys(form.controls).forEach(key => {
        const control = form.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      return;
    }

    if (this.modalType === 'leadMember') {
      if (this.editingIndex !== null) {
        this.apuLeadMembers.at(this.editingIndex).patchValue(form.value);       
      } else {
        this.apuLeadMembers.push(this.fb.group({
          name: [form.value.name, Validators.required],
          functionalUnit: [form.value.functionalUnit, Validators.required],     
          email: [form.value.email, [Validators.required, Validators.email]]    
        }));
      }
    } else if (this.modalType === 'milestone') {
      if (this.editingIndex !== null) {
        this.milestones.at(this.editingIndex).patchValue(form.value);
      } else {
        this.milestones.push(this.fb.group({
          action: [form.value.action, Validators.required],
          startDate: [form.value.startDate, Validators.required],
          endDate: [form.value.endDate, Validators.required]
        }));
      }
    } else if (this.modalType === 'outcome') {
      if (this.editingIndex !== null) {
        this.outcomes.at(this.editingIndex).patchValue(form.value);
      } else {
        this.outcomes.push(this.fb.group({
          outcome: [form.value.outcome, Validators.required],
          startDate: [form.value.startDate, Validators.required],
          endDate: [form.value.endDate, Validators.required]
        }));
      }
    } else if (this.modalType === 'suppDoc') {
      if (this.editingIndex !== null) {
        this.supportingDocs.at(this.editingIndex).patchValue(form.value);       
      } else {
        this.supportingDocs.push(this.fb.group({
          documentType: [form.value.documentType, Validators.required],
          fileName: [form.value.fileName, Validators.required],
          description: [form.value.description]
        }));
      }
    }

    this.closeModal();
  }

  removeLeadMember(index: number): void {
    this.apuLeadMembers.removeAt(index);
  }

  removeMilestone(index: number): void {
    this.milestones.removeAt(index);
  }

  removeOutcome(index: number): void {
    this.outcomes.removeAt(index);
  }

  removeSupportingDoc(index: number): void {
    this.supportingDocs.removeAt(index);
  }

  getModalTitle(): string {
    if (this.modalType === 'milestone') {
      return this.editingIndex !== null ? 'Edit Milestone' : 'Add Milestone';   
    } else if (this.modalType === 'outcome') {
      return this.editingIndex !== null ? 'Edit Outcome' : 'Add Outcome';
    } else if (this.modalType === 'suppDoc') {
      return this.editingIndex !== null ? 'Edit Document' : 'Add Document';     
    }
    return this.editingIndex !== null ? 'Edit APU Lead Member' : 'Add APU Lead Member';
  }

  private updateFormState(): void {
    if (this.isDisabled) {
      this.riskForm.disable({ emitEvent: false });
    } else {
      this.riskForm.enable({ emitEvent: false });
    }
  }
}

