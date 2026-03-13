import { Component, Input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
  selector: 'app-team-details',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    CharacterCounterComponent,
    ValidationMessageComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    FileUploadComponent,
    DialogComponent,
    ReviewBlockComponent,
  ],
  templateUrl: './team-details.component.html',
  styleUrl: './team-details.component.scss'
})
export class TeamDetailsComponent {
  @Input({ required: true }) parentForm!: FormGroup;
  @Input() showHosComments = false;
  @Input() showRmcComments = false;
  @Input() showR1Comments = false;
  @Input() showR2Comments = false;
  @Input() showRdigChairComments = false;
  @Input() showVcComments = false;
  @Input() showCeoComments = false;

  get showAnyComments(): boolean {
    return this.showHosComments || this.showRmcComments ||
           this.showR1Comments || this.showR2Comments ||
           this.showRdigChairComments || this.showVcComments || this.showCeoComments;
  }
  @Input() workflow!: RdigWorkflowService;

  // ── Section accessors ──────────────────────────────────────────
  get teamDetails() { return this.parentForm.get('teamDetails') as FormGroup; }
  get internalResearchers() { return this.teamDetails.get('internalResearchers') as FormArray; }
  get externalResearchers() { return this.teamDetails.get('externalResearchers') as FormArray; }

  // ── Review form controls ───────────────────────────────────────
  get reviewTeam() { return this.parentForm.get('reviewTeam') as FormGroup; }
  fc(name: string): FormControl { return this.reviewTeam.get(name) as FormControl; }

  // ── Modal open/edit state ──────────────────────────────────────
  showInternalModal = signal(false);
  showExternalModal = signal(false);
  editingInternalIdx = signal<number | null>(null);
  editingExternalIdx = signal<number | null>(null);

  // ── Temp modal forms ───────────────────────────────────────────
  internalForm: FormGroup;
  externalForm: FormGroup;

  // ── Reference data (API-driven in production) ─────────────────
  clusters = [
    { label: 'Socio-Economic Impact', value: 'sei' },
    { label: 'Technology & Innovation', value: 'ti' },
    { label: 'Environmental Sustainability', value: 'es' },
    { label: 'Health & Biomedical Sciences', value: 'hbs' },
    { label: 'Digital Transformation', value: 'dt' }
  ];

  titles = [
    { label: 'Prof.', value: 'Prof.' },
    { label: 'Assoc. Prof.', value: 'Assoc. Prof.' },
    { label: 'Dr.', value: 'Dr.' },
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Ms.', value: 'Ms.' },
    { label: 'Ts.', value: 'Ts.' },
    { label: 'Ir.', value: 'Ir.' },
    { label: 'Dato\'', value: 'Dato\'' }
  ];

  orgTypes = [
    { label: 'University / Higher Education', value: 'university' },
    { label: 'Research Institute', value: 'research' },
    { label: 'Private Company', value: 'private' },
    { label: 'Government Agency', value: 'government' },
    { label: 'NGO / Non-Profit', value: 'ngo' }
  ];

  constructor(private fb: FormBuilder) {
    this.internalForm = this.fb.group({
      staffName: ['', Validators.required],
      department: [{ value: '', disabled: true }],
      expertise: ['', [Validators.required, Validators.maxLength(200)]],
      roles: ['', [Validators.required, Validators.maxLength(600)]]
    });

    this.externalForm = this.fb.group({
      title: ['', Validators.required],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      institution: ['', Validators.required],
      orgType: ['', Validators.required],
      position: ['', Validators.required],
      department: ['', Validators.required],
      country: ['', Validators.required],
      funding: ['', [Validators.required, Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')]],
      roles: ['', [Validators.required, Validators.maxLength(600)]],
      supportLetter: [null, Validators.required]
    });
  }

  // ── Internal researchers ────────────────────────────────────────

  openInternalModal(): void {
    if (this.internalResearchers.length >= 2) return;
    this.editingInternalIdx.set(null);
    this.internalForm.reset({ department: '' });
    this.showInternalModal.set(true);
  }

  openEditInternalModal(index: number): void {
    const row = this.internalResearchers.at(index).getRawValue();
    this.editingInternalIdx.set(index);
    this.internalForm.patchValue(row);
    this.showInternalModal.set(true);
  }

  saveInternal(): void {
    if (this.internalForm.invalid) {
      this.internalForm.markAllAsTouched();
      return;
    }
    const idx = this.editingInternalIdx();
    const data = this.internalForm.getRawValue();
    if (idx !== null) {
      this.internalResearchers.at(idx).patchValue(data);
    } else {
      this.internalResearchers.push(this.fb.group(data));
    }
    this.showInternalModal.set(false);
    this.editingInternalIdx.set(null);
  }

  removeInternal(index: number): void {
    this.internalResearchers.removeAt(index);
  }

  // ── External researchers ────────────────────────────────────────

  openExternalModal(): void {
    if (this.externalResearchers.length >= 10) return;
    this.editingExternalIdx.set(null);
    this.externalForm.reset();
    this.showExternalModal.set(true);
  }

  openEditExternalModal(index: number): void {
    const row = this.externalResearchers.at(index).getRawValue();
    this.editingExternalIdx.set(index);
    this.externalForm.patchValue(row);
    // File control keeps previous value on edit
    this.externalForm.get('supportLetter')?.clearValidators();
    this.externalForm.get('supportLetter')?.updateValueAndValidity();
    this.showExternalModal.set(true);
  }

  saveExternal(): void {
    if (this.externalForm.invalid) {
      this.externalForm.markAllAsTouched();
      return;
    }
    const idx = this.editingExternalIdx();
    const data = this.externalForm.getRawValue();
    if (idx !== null) {
      this.externalResearchers.at(idx).patchValue(data);
    } else {
      this.externalResearchers.push(this.fb.group(data));
    }
    this.showExternalModal.set(false);
    this.editingExternalIdx.set(null);
  }

  removeExternal(index: number): void {
    this.externalResearchers.removeAt(index);
  }

  // ── File upload helper ─────────────────────────────────────────
  /** Called by <app-file-upload> after type+size validation passes. */
  onFileSelected(file: File): void {
    this.externalForm.get('supportLetter')?.setValue(file);
  }
}
