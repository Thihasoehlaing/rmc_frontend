import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { COUNTRY_LIST } from '../../../../core/constants/countries.constant';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { MasterDataService, AcademicStaffOption } from '../../../../core/services/master-data.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { FieldNoteComponent } from '../../../../shared/components/field-note/field-note.component';

import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-team-details',
  standalone: true,
  imports: [
    TableActionIconComponent,
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
    DataTableComponent,
    ActionButtonComponent,
    FieldNoteComponent,
  ],
  templateUrl: './team-details.component.html',
  styleUrl: './team-details.component.scss',
})
export class TeamDetailsComponent implements OnInit, OnDestroy {
  private readonly masterData = inject(MasterDataService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** Academic staff list loaded from the real backend — used for the internal co-researcher dropdown. */
  private academicStaffList: AcademicStaffOption[] = [];
  staffOptions: { label: string; value: string }[] = [];

  @Input({ required: true }) parentForm!: FormGroup;
  @Input() showHosComments = false;
  @Input() showRmcComments = false;
  @Input() showR1Comments = false;
  @Input() showR2Comments = false;
  @Input() showRdigChairComments = false;
  @Input() showVcComments = false;
  @Input() showCeoComments = false;

  get showAnyComments(): boolean {
    return (
      this.showHosComments ||
      this.showRmcComments ||
      this.showR1Comments ||
      this.showR2Comments ||
      this.showRdigChairComments ||
      this.showVcComments ||
      this.showCeoComments
    );
  }
  @Input() workflow!: RdigWorkflowService;

  get teamDetails() {
    return this.parentForm.get('teamDetails') as FormGroup;
  }
  get internalResearchers() {
    return this.teamDetails.get('internalResearchers') as FormArray;
  }
  get externalResearchers() {
    return this.teamDetails.get('externalResearchers') as FormArray;
  }

  get reviewTeam() {
    return this.parentForm.get('reviewTeam') as FormGroup;
  }
  fc(name: string): FormControl {
    return this.reviewTeam.get(name) as FormControl;
  }

  readonly internalColumns: DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'staff', label: 'Staff Name', width: '22%' },
    { key: 'department', label: 'Department', width: '18%' },
    { key: 'expertise', label: 'Area of Expertise', width: '28%' },
    { key: 'roles', label: 'Role in Project', width: '32%' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly externalColumns: DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'collaborator', label: 'Collaborator', width: '200px' },
    { key: 'email', label: 'Email', width: '200px' },
    { key: 'position', label: 'Position / Designation', width: '190px' },
    { key: 'institution', label: 'Institution / Company', width: '200px' },
    { key: 'orgType', label: 'Type of Organisation', width: '180px' },
    { key: 'department', label: 'School / Dept / Faculty', width: '200px' },
    { key: 'country', label: 'Country', width: '120px', align: 'center', headerAlign: 'center' },
    {
      key: 'funding',
      label: 'Matched Funding',
      width: '150px',
      align: 'right',
      headerAlign: 'right',
    },
    { key: 'roles', label: 'Roles', width: '240px' },
    {
      key: 'supportLetter',
      label: 'Support Letter',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly trackByIndex = (index: number) => index;

  showInternalModal = signal(false);
  showExternalModal = signal(false);
  editingInternalIdx = signal<number | null>(null);
  editingExternalIdx = signal<number | null>(null);

  internalForm: FormGroup;
  externalForm: FormGroup;

  clusters: { label: string; value: string }[] = [];
  orgTypes: { label: string; value: string }[] = [];
  countryOptions: { label: string; value: string }[] = [];
  countriesLoading = false;

  titles = [
    { label: 'Prof.', value: 'Prof.' },
    { label: 'Assoc. Prof.', value: 'Assoc. Prof.' },
    { label: 'Dr.', value: 'Dr.' },
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Ms.', value: 'Ms.' },
    { label: 'Ts.', value: 'Ts.' },
    { label: 'Ir.', value: 'Ir.' },
    { label: "Dato'", value: "Dato'" },
  ];

  constructor(private fb: FormBuilder) {
    this.internalForm = this.fb.group({
      staffId: ['', Validators.required],
      staffName: [''],
      department: [''],
      expertise: ['', [Validators.required, Validators.maxLength(200)]],
      roles: ['', [Validators.required, Validators.maxLength(600)]],
    });

    this.externalForm = this.fb.group({
      title: ['', Validators.required],
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      institution: ['', [Validators.required, Validators.maxLength(100)]],
      orgType: ['', Validators.required],
      position: ['', [Validators.required, Validators.maxLength(100)]],
      department: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['', Validators.required],
      funding: ['', [Validators.required, Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')]],
      roles: ['', [Validators.required, Validators.maxLength(600)]],
      supportLetter: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.masterData
      .getResearchClusters()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.clusters = (res.data ?? [])
          .filter((o) => o.is_active)
          .map((o) => ({ label: o.cluster_name, value: o.id.toString() }));
      });

    this.loadOrganisationTypes();

    // Load academic staff list from the real backend for the internal co-researcher dropdown
    this.masterData
      .searchAcademicStaff()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.academicStaffList = res.data ?? [];
        this.staffOptions = this.academicStaffList.map((s) => ({
          label: s.fullname,
          value: s.id.toString(),
        }));
      });

    // Auto-populate name + department when a researcher is selected from the dropdown
    this.internalForm
      .get('staffId')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.onResearcherSelected(id));

    this.loadCountryOptions();

    const onDropdownsUpdated = (): void => this.loadOrganisationTypes();
    window.addEventListener('rmc-dropdowns-updated', onDropdownsUpdated);
    this.destroy$.subscribe(() => {
      window.removeEventListener('rmc-dropdowns-updated', onDropdownsUpdated);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getInitials(value: string): string {
    if (!value) return '--';
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  /** Called when the user picks a researcher from the dropdown. */
  onResearcherSelected(staffId: string): void {
    const staff = this.academicStaffList.find((s) => s.id.toString() === staffId);
    if (staff) {
      this.internalForm.patchValue({
        staffName: staff.fullname,
        department: staff.department,
      });
    } else {
      this.internalForm.patchValue({ staffName: '', department: '' });
    }
  }

  private loadOrganisationTypes(): void {
    this.masterData
      .getDropdownOptions('TYPE_OF_ORGANISATION')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.orgTypes = (res.data ?? [])
          .filter((o) => o.status === 'ACTIVE')
          .map((o) => ({
            label: o.option_name,
            value: o.option_name.toLowerCase().replace(/\s+/g, '-'),
          }));
      });
  }

  private loadCountryOptions(): void {
    this.countryOptions = COUNTRY_LIST;
    this.countriesLoading = false;
  }

  openInternalModal(): void {
    if (this.internalResearchers.length >= 2) return;
    this.editingInternalIdx.set(null);
    this.internalForm.reset({ staffId: '', staffName: '', department: '' });
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

  onFileSelected(file: File): void {
    this.externalForm.get('supportLetter')?.setValue(file);
  }

  /** True when a support letter is attached (a freshly-picked File or a persisted URL/attachment). */
  hasSupportLetter(value: unknown): boolean {
    return !!this.supportLetterUrl(value) || value instanceof File;
  }

  /** Resolve a persisted support letter to an openable URL, if any. */
  private supportLetterUrl(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object') {
      const v = value as { file_url?: string; url?: string };
      return v.file_url || v.url || null;
    }
    return null;
  }

  /** Opens the support letter in a new tab — a persisted URL directly, or a freshly-picked File via a blob URL. */
  openSupportLetter(value: unknown): void {
    const url = this.supportLetterUrl(value);
    if (url) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (value instanceof File) {
      const blobUrl = URL.createObjectURL(value);
      window.open(blobUrl, '_blank', 'noopener');
      // Revoke shortly after so the new tab has time to load it.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    }
  }

  manageOrgTypes(): void {
    // RDIG dropdown options management has been removed
  }
}
