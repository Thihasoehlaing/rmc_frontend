import { Component, OnInit, inject, effect, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import {
  AcademicStaffOption,
  MasterDataService,
} from '../../../../core/services/master-data.service';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import {
  JournalFormData,
  JournalNonApuAuthorPayload,
  JournalStaffAuthorPayload,
  JournalStudentAuthorPayload,
} from '../../services/journal-application-api.service';

import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';
import {
  formatCountryForDisplay,
  normalizeCountryForStorage,
} from '../../../../shared/utils/country.util';

@Component({
  selector: 'app-authors-details',
  templateUrl: './authors-details.html',
  styleUrls: ['./authors-details.scss'],
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    CustomHeaderComponent,
    ValidationMessageComponent,
    CharacterCounterComponent,
    ActionButtonComponent,
    DataTableComponent,
    NoteComponent,
    DialogComponent,
  ],
})
export class AuthorsDetails implements OnInit {
  readonly apuAffiliation = 'Asia Pacific University';
  readonly authorTextMaxLength = 100;
  readonly tpNumberMaxLength = 6;
  readonly tableRecordLimit = 10;
  @Output() formValidityChange = new EventEmitter<boolean>();
  form!: FormGroup;
  projectType: string | null = null;
  showNonApuRequiredMessage = false;

  readonly formatCountry = formatCountryForDisplay;

  readonly apuStaffColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'staffName', label: 'Staff Name', width: '28%' },
    { key: 'schoolDepartment', label: 'School', width: '32%' },
    { key: 'affiliation', label: 'Second Affiliation', width: '25%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  readonly studentColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'tpNumber', label: 'TP Number', width: '12%' },
    { key: 'fullName', label: 'Student Name', width: '25%' },
    { key: 'schoolDepartment', label: 'School', width: '26%' },
    { key: 'affiliation', label: 'Second Affiliation', width: '22%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  readonly nonApuColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'fullName', label: 'Full Name', width: '13%' },
    { key: 'email', label: 'Email', width: '15%' },
    { key: 'country', label: 'Country', width: '10%' },
    { key: 'typeOfOrganisation', label: 'Type of Organisation', width: '13%' },
    { key: 'institutionName', label: 'Institution/Company Name', width: '16%' },
    { key: 'schoolDepartment', label: 'School/Department', width: '18%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  isModalOpen: boolean = false;
  editForm!: FormGroup;
  editingIndex: number | null = null;
  modalType: 'apu-staff' | 'student' | 'non-apu' | null = null;

  // Pagination
  readonly ITEMS_PER_PAGE = 5;
  readonly ITEMS_PER_PAGE_OPTIONS = [5, 10];
  apuStaffCurrentPage = 1;
  studentCoAuthorsCurrentPage = 1;
  nonApuCoAuthorsCurrentPage = 1;
  apuStaffPageSize = 5;
  studentCoAuthorsPageSize = 5;
  nonApuCoAuthorsPageSize = 5;

  staffOptions: DropdownOption<string>[] = [];
  departmentOptions: DropdownOption<string>[] = [];
  staffOptionsLoading = false;
  staffOptionsLoadFailed = false;
  organisationTypeOptions: DropdownOption<string>[] = [];
  organisationTypeOptionsLoading = false;
  organisationTypeOptionsLoadFailed = false;
  private academicStaffByName = new Map<string, AcademicStaffOption>();
  private staffSelectionSubscription?: Subscription;

  workflow = inject(JournalWorkflowService);
  private readonly masterData = inject(MasterDataService);

  constructor(private fb: FormBuilder) {
    effect(() => {
      // Small timeout to allow form to initialize first if OnInit hasn't fired yet
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.form?.disable({ emitEvent: false });
          this.editForm?.disable({ emitEvent: false });
        } else {
          this.form?.enable({ emitEvent: false });
          this.editForm?.enable({ emitEvent: false });
        }
      }, 0);
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.loadAcademicStaffOptions();
    this.loadDepartmentOptions();
    this.loadOrganisationTypeOptions();
  }

  initializeForm() {
    this.form = this.fb.group({
      isPresenter: [true],
      testSubsections: this.fb.array([]),
      studentCoAuthors: this.fb.array([]),
      nonApuCoAuthors: this.fb.array([]),
    });

    this.form.statusChanges.subscribe(() => {
      this.emitFormValidity();
    });
    this.emitFormValidity();
  }

  getStaffAuthorPayloads(): JournalStaffAuthorPayload[] {
    return this.testSubsections.controls
      .map((control, index) => {
        const value = control.value;
        return {
          staff_name: value.staffName || null,
          staff_department: value.schoolDepartment || null,
          affiliation: value.affiliation || this.apuAffiliation,
          display_order: index + 1,
        };
      })
      .filter((item) => !!item.staff_name || !!item.staff_department);
  }

  getStudentAuthorPayloads(): JournalStudentAuthorPayload[] {
    return this.studentCoAuthors.controls
      .map((control, index) => {
        const value = control.value;
        return {
          tp_number: value.tpNumber || null,
          full_name: value.fullName || null,
          school_department: value.schoolDepartment || null,
          affiliation: value.affiliation || this.apuAffiliation,
          display_order: index + 1,
        };
      })
      .filter((item) => !!item.tp_number || !!item.full_name);
  }

  getNonApuAuthorPayloads(): JournalNonApuAuthorPayload[] {
    return this.nonApuCoAuthors.controls
      .map((control, index) => {
        const value = control.value;
        return {
          full_name: value.fullName || null,
          country: normalizeCountryForStorage(value.country),
          email: value.email || null,
          organisation_type: value.typeOfOrganisation || null,
          school_department: value.schoolDepartment || null,
          institution_company_name: value.institutionName || null,
          display_order: index + 1,
        };
      })
      .filter((item) => !!item.full_name || !!item.email);
  }

  hydrateFromApi(data: JournalFormData): void {
    if (!this.form) {
      return;
    }

    this.testSubsections.clear();
    this.studentCoAuthors.clear();
    this.nonApuCoAuthors.clear();

    for (const item of data.apu_staff_co_authors || []) {
      const group = this.createTestSubsection();
      group.patchValue(
        {
          staffName: item.staff_name || '',
          schoolDepartment: item.staff_department || '',
          affiliation: item.affiliation || this.apuAffiliation,
        },
        { emitEvent: false },
      );
      this.testSubsections.push(group);
    }

    for (const item of data.apu_student_co_authors || []) {
      this.studentCoAuthors.push(
        this.fb.group({
          tpNumber: [item.tp_number || '', [Validators.required]],
          fullName: [item.full_name || '', [Validators.required]],
          schoolDepartment: [item.school_department || '', [Validators.required]],
          affiliation: [item.affiliation || this.apuAffiliation],
        }),
      );
    }

    for (const item of data.non_apu_co_authors || []) {
      const group = this.createNonApuCoAuthor();
      group.patchValue(
        {
          fullName: item.full_name || '',
          country: formatCountryForDisplay(item.country),
          email: item.email || '',
          schoolDepartment: item.school_department || '',
          typeOfOrganisation: item.organisation_type || '',
          institutionName: item.institution_company_name || '',
        },
        { emitEvent: false },
      );
      this.nonApuCoAuthors.push(group);
    }

    this.emitFormValidity();
  }

  createTestSubsection(): FormGroup {
    return this.fb.group({
      staffName: [''],
      schoolDepartment: [''],
      affiliation: [this.apuAffiliation],
    });
  }

  createStudentCoAuthor(): FormGroup {
    return this.fb.group({
      // TP Number: required, must be non-empty digits, no all-zeros, max 6 digits
      tpNumber: ['', [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')]],
      fullName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: [this.apuAffiliation],
    });
  }

  createNonApuCoAuthor(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required]],
      country: ['', [Validators.required, Validators.maxLength(this.authorTextMaxLength)]],
      email: ['', [Validators.required, Validators.email]],
      schoolDepartment: ['', [Validators.required]],
      typeOfOrganisation: ['', [Validators.required]],
      institutionName: ['', [Validators.required]],
    });
  }

  getApuStaffPageSize(): number {
    return this.apuStaffPageSize;
  }

  getStudentCoAuthorsPageSize(): number {
    return this.studentCoAuthorsPageSize;
  }

  getNonApuCoAuthorsPageSize(): number {
    return this.nonApuCoAuthorsPageSize;
  }

  getApuStaffTotalPages(): number {
    return Math.max(1, Math.ceil(this.testSubsections.length / this.apuStaffPageSize));
  }

  getStudentCoAuthorsTotalPages(): number {
    return Math.max(1, Math.ceil(this.studentCoAuthors.length / this.studentCoAuthorsPageSize));
  }

  getNonApuCoAuthorsTotalPages(): number {
    return Math.max(1, Math.ceil(this.nonApuCoAuthors.length / this.nonApuCoAuthorsPageSize));
  }

  getApuStaffPageStart(): number {
    return this.testSubsections.length === 0
      ? 0
      : (Math.min(this.apuStaffCurrentPage, this.getApuStaffTotalPages()) - 1) *
          this.apuStaffPageSize +
          1;
  }

  getApuStaffPageEnd(): number {
    return this.testSubsections.length === 0
      ? 0
      : Math.min(
          this.getApuStaffPageStart() + this.apuStaffPageSize - 1,
          this.testSubsections.length,
        );
  }

  getStudentCoAuthorsPageStart(): number {
    return this.studentCoAuthors.length === 0
      ? 0
      : (Math.min(this.studentCoAuthorsCurrentPage, this.getStudentCoAuthorsTotalPages()) - 1) *
          this.studentCoAuthorsPageSize +
          1;
  }

  getStudentCoAuthorsPageEnd(): number {
    return this.studentCoAuthors.length === 0
      ? 0
      : Math.min(
          this.getStudentCoAuthorsPageStart() + this.studentCoAuthorsPageSize - 1,
          this.studentCoAuthors.length,
        );
  }

  getNonApuCoAuthorsPageStart(): number {
    return this.nonApuCoAuthors.length === 0
      ? 0
      : (Math.min(this.nonApuCoAuthorsCurrentPage, this.getNonApuCoAuthorsTotalPages()) - 1) *
          this.nonApuCoAuthorsPageSize +
          1;
  }

  getNonApuCoAuthorsPageEnd(): number {
    return this.nonApuCoAuthors.length === 0
      ? 0
      : Math.min(
          this.getNonApuCoAuthorsPageStart() + this.nonApuCoAuthorsPageSize - 1,
          this.nonApuCoAuthors.length,
        );
  }

  getPaginatedApuStaffControls() {
    const startIndex =
      (Math.min(this.apuStaffCurrentPage, this.getApuStaffTotalPages()) - 1) *
      this.apuStaffPageSize;
    return this.testSubsections.controls.slice(startIndex, startIndex + this.apuStaffPageSize);
  }

  getPaginatedStudentCoAuthorsControls() {
    const startIndex =
      (Math.min(this.studentCoAuthorsCurrentPage, this.getStudentCoAuthorsTotalPages()) - 1) *
      this.studentCoAuthorsPageSize;
    return this.studentCoAuthors.controls.slice(
      startIndex,
      startIndex + this.studentCoAuthorsPageSize,
    );
  }

  getPaginatedNonApuCoAuthorsControls() {
    const startIndex =
      (Math.min(this.nonApuCoAuthorsCurrentPage, this.getNonApuCoAuthorsTotalPages()) - 1) *
      this.nonApuCoAuthorsPageSize;
    return this.nonApuCoAuthors.controls.slice(
      startIndex,
      startIndex + this.nonApuCoAuthorsPageSize,
    );
  }

  get testSubsections(): FormArray {
    return this.form.get('testSubsections') as FormArray;
  }

  get studentCoAuthors(): FormArray {
    return this.form.get('studentCoAuthors') as FormArray;
  }

  get nonApuCoAuthors(): FormArray {
    return this.form.get('nonApuCoAuthors') as FormArray;
  }

  setProjectType(projectType: string | null | undefined): void {
    this.projectType = projectType ?? null;
    if (!this.isNonApuRequired || this.hasRequiredNonApuCoAuthor) {
      this.showNonApuRequiredMessage = false;
    }
    this.emitFormValidity();
  }

  get isNonApuRequired(): boolean {
    return (this.projectType ?? '').trim().toLowerCase() === 'non-research';
  }

  get hasRequiredNonApuCoAuthor(): boolean {
    return !this.isNonApuRequired || this.nonApuCoAuthors.length > 0;
  }

  markRequirementTouched(): void {
    this.showNonApuRequiredMessage = this.isNonApuRequired && !this.hasRequiredNonApuCoAuthor;
    this.emitFormValidity();
  }

  addTestSubsection() {
    if (!this.canCreateCoAuthor('apu-staff')) return;
    this.testSubsections.push(this.createTestSubsection());
    this.emitFormValidity();
  }

  deleteTestSubsection(index: number) {
    this.testSubsections.removeAt(index);
    this.emitFormValidity();
  }

  addStudentCoAuthor() {
    if (!this.canCreateCoAuthor('student')) return;
    this.studentCoAuthors.push(this.createStudentCoAuthor());
    this.emitFormValidity();
  }

  deleteStudentCoAuthor(index: number) {
    this.studentCoAuthors.removeAt(index);
    this.emitFormValidity();
  }

  addNonApuCoAuthor() {
    if (!this.canCreateCoAuthor('non-apu')) return;
    this.nonApuCoAuthors.push(this.createNonApuCoAuthor());
    this.emitFormValidity();
  }

  deleteNonApuCoAuthor(index: number) {
    this.nonApuCoAuthors.removeAt(index);
    this.emitFormValidity();
  }

  canCreateCoAuthor(type: 'apu-staff' | 'student' | 'non-apu'): boolean {
    return (
      !this.workflow.isFormReadOnly() &&
      this.getCoAuthorArray(type).length < this.tableRecordLimit
    );
  }

  private getCoAuthorArray(type: 'apu-staff' | 'student' | 'non-apu'): FormArray {
    if (type === 'apu-staff') return this.testSubsections;
    if (type === 'student') return this.studentCoAuthors;
    return this.nonApuCoAuthors;
  }

  // Modal Methods
  openEditModal(type: 'apu-staff' | 'student' | 'non-apu', index?: number) {
    if (index === undefined && !this.canCreateCoAuthor(type)) return;

    this.modalType = type;
    this.isModalOpen = true;

    if (index !== undefined) {
      // Editing existing entry
      this.editingIndex = index;
      let data: any;

      if (type === 'apu-staff') {
        data = this.testSubsections.at(index).value;
        this.editForm = this.fb.group({
          staffName: [data.staffName, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          affiliation: [this.apuAffiliation],
        });
        this.setupStaffSelection(data.staffName);
      } else if (type === 'student') {
        data = this.studentCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          tpNumber: [
            this.parseTPNumber(data.tpNumber),
            [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')],
          ],
          fullName: [data.fullName, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          affiliation: [this.apuAffiliation],
        });
      } else if (type === 'non-apu') {
        data = this.nonApuCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          fullName: [data.fullName, [Validators.required]],
          country: [data.country, [Validators.required, Validators.maxLength(this.authorTextMaxLength)]],
          email: [data.email, [Validators.required, Validators.email]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          typeOfOrganisation: [data.typeOfOrganisation, [Validators.required]],
          institutionName: [data.institutionName, [Validators.required]],
        });
      }
    } else {
      // Adding new entry
      this.editingIndex = null;
      if (type === 'apu-staff') {
        this.editForm = this.fb.group({
          staffName: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          affiliation: [this.apuAffiliation],
        });
        this.setupStaffSelection();
      } else if (type === 'student') {
        this.editForm = this.fb.group({
          tpNumber: ['', [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')]],
          fullName: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          affiliation: [this.apuAffiliation],
        });
      } else if (type === 'non-apu') {
        this.editForm = this.fb.group({
          fullName: ['', [Validators.required]],
          country: ['', [Validators.required, Validators.maxLength(this.authorTextMaxLength)]],
          email: ['', [Validators.required, Validators.email]],
          schoolDepartment: ['', [Validators.required]],
          typeOfOrganisation: ['', [Validators.required]],
          institutionName: ['', [Validators.required]],
        });
      }
    }

    this.applyAuthorTextLengthLimits(type);
  }

  private applyAuthorTextLengthLimits(type: 'apu-staff' | 'student' | 'non-apu'): void {
    if (type === 'apu-staff') return;

    const fieldNames =
      type === 'student'
        ? ['fullName', 'schoolDepartment']
        : ['fullName', 'email', 'schoolDepartment', 'institutionName'];

    fieldNames.forEach((fieldName) => {
      this.editForm.get(fieldName)?.addValidators(Validators.maxLength(this.authorTextMaxLength));
    });
    this.editForm.updateValueAndValidity({ emitEvent: false });
  }

  closeModal() {
    this.staffSelectionSubscription?.unsubscribe();
    this.staffSelectionSubscription = undefined;
    this.isModalOpen = false;
    this.editingIndex = null;
    this.modalType = null;
    this.editForm.reset();
  }

  submitModal() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    if (
      this.editingIndex === null &&
      this.modalType &&
      !this.canCreateCoAuthor(this.modalType)
    ) {
      return;
    }

    const formData = {
      ...this.editForm.value,
      ...(this.modalType === 'apu-staff' || this.modalType === 'student'
        ? { affiliation: this.apuAffiliation }
        : {}),
    };

    // Prepend "TP" prefix to the student TP number before saving
    if (this.modalType === 'student' && formData.tpNumber) {
      formData.tpNumber = this.formatTPNumber(formData.tpNumber);
    }

    if (this.modalType === 'non-apu') {
      formData.country = formatCountryForDisplay(formData.country);
    }

    if (this.editingIndex !== null) {
      // Update existing entry
      if (this.modalType === 'apu-staff') {
        this.testSubsections.at(this.editingIndex).patchValue(formData);
      } else if (this.modalType === 'student') {
        this.studentCoAuthors.at(this.editingIndex).patchValue(formData);
      } else if (this.modalType === 'non-apu') {
        this.nonApuCoAuthors.at(this.editingIndex).patchValue(formData);
      }
    } else {
      // Add new entry
      if (this.modalType === 'apu-staff') {
        this.testSubsections.push(this.fb.group(formData));
      } else if (this.modalType === 'student') {
        this.studentCoAuthors.push(this.fb.group(formData));
      } else if (this.modalType === 'non-apu') {
        this.nonApuCoAuthors.push(this.fb.group(formData));
      }
    }

    this.closeModal();
    this.emitFormValidity();
  }

  loadAcademicStaffOptions(
    search = '',
    selectedStaffName = this.editForm?.get('staffName')?.value,
  ): void {
    this.staffOptionsLoading = true;
    this.staffOptionsLoadFailed = false;

    this.masterData
      .searchAcademicStaff(search)
      .pipe(finalize(() => (this.staffOptionsLoading = false)))
      .subscribe({
        next: (response) => {
          const staff = response.success ? (response.data ?? []) : [];
          this.applyAcademicStaffOptions(staff, selectedStaffName);
        },
        error: () => {
          this.staffOptions = this.createSelectedStaffFallbackOption(selectedStaffName);
          this.academicStaffByName.clear();
          this.staffOptionsLoadFailed = true;
        },
      });
  }

  private loadOrganisationTypeOptions(): void {
    this.organisationTypeOptionsLoading = true;
    this.organisationTypeOptionsLoadFailed = false;

    this.masterData
      .getDropdownOptions('TYPE_OF_ORGANISATION', 'JOURNAL')
      .pipe(finalize(() => (this.organisationTypeOptionsLoading = false)))
      .subscribe({
        next: (response) => {
          this.organisationTypeOptions = (response.success ? (response.data ?? []) : [])
            .filter((option) => option.status === 'ACTIVE')
            .map((option) => ({ value: option.option_name, label: option.option_name }));
          this.organisationTypeOptionsLoadFailed = !response.success;
        },
        error: () => {
          this.organisationTypeOptions = [];
          this.organisationTypeOptionsLoadFailed = true;
        },
      });
  }

  private loadDepartmentOptions(): void {
    this.masterData.getDepartments().subscribe({
      next: (response) => {
        const seen = new Set<string>();
        this.departmentOptions = (response.success ? (response.data ?? []) : [])
          .filter((department) => department.is_active)
          .filter((department) => this.isStudentSchoolDepartment(department.department_name))
          .filter((department) => {
            const key = department.department_name.trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((department) => ({
            value: department.department_name,
            label: department.department_name,
            description: department.department_type,
          }));
      },
      error: () => {
        this.departmentOptions = [];
      },
    });
  }

  private isStudentSchoolDepartment(departmentName: string | null | undefined): boolean {
    const name = String(departmentName ?? '').trim().toLowerCase();
    return name.startsWith('graduate school') || name.startsWith('school of');
  }

  private setupStaffSelection(selectedStaffName = ''): void {
    this.staffSelectionSubscription?.unsubscribe();
    const selectedFallback = this.createSelectedStaffFallbackOption(selectedStaffName);
    if (
      selectedFallback.length &&
      !this.staffOptions.some((option) => option.value === selectedFallback[0].value)
    ) {
      this.staffOptions = [...selectedFallback, ...this.staffOptions];
    }

    const staffNameControl = this.editForm.get('staffName');
    this.staffSelectionSubscription = staffNameControl?.valueChanges.subscribe((staffName) => {
      const staff = this.academicStaffByName.get(String(staffName ?? ''));
      if (!staff) {
        return;
      }

      this.editForm.patchValue(
        {
          schoolDepartment: staff.department || '',
          affiliation: this.apuAffiliation,
        },
        { emitEvent: false },
      );
    });
  }

  private applyAcademicStaffOptions(
    staff: AcademicStaffOption[],
    selectedStaffName?: string | null,
  ): void {
    this.academicStaffByName.clear();

    const options = staff.map((item) => this.toAcademicStaffDropdownOption(item));
    const selectedFallback = this.createSelectedStaffFallbackOption(selectedStaffName);
    const selectedValue = selectedStaffName?.trim();

    if (selectedValue && !options.some((option) => option.value === selectedValue)) {
      options.unshift(...selectedFallback);
    }

    this.staffOptions = options;
  }

  private toAcademicStaffDropdownOption(staff: AcademicStaffOption): DropdownOption<string> {
    const value = staff.fullname || staff.username || staff.email || `Staff ${staff.id}`;
    this.academicStaffByName.set(value, staff);

    return {
      value,
      label: value,
      description: [staff.email, staff.department].filter(Boolean).join(' • '),
      displayLabel: value,
      searchText: [staff.username, staff.fullname, staff.email, staff.department]
        .filter(Boolean)
        .join(' '),
    };
  }

  private createSelectedStaffFallbackOption(staffName?: string | null): DropdownOption<string>[] {
    const value = staffName?.trim();
    return value ? [{ value, label: value, displayLabel: value }] : [];
  }

  private emitFormValidity(): void {
    if (this.hasRequiredNonApuCoAuthor) {
      this.showNonApuRequiredMessage = false;
    }
    this.formValidityChange.emit(this.form.valid && this.hasRequiredNonApuCoAuthor);
  }

  getModalTitle(): string {
    if (!this.modalType) return '';
    const isEditing = this.editingIndex !== null ? 'Edit' : 'Add';
    const titles = {
      'apu-staff': `${isEditing} Asia Pacific University of Technology & Innovation Staff Co-Author`,
      student: `${isEditing} Asia Pacific University of Technology & Innovation Student Co-Author`,
      'non-apu': `${isEditing} Co-Author Outside Asia Pacific University of Technology & Innovation`,
    };
    return titles[this.modalType];
  }

  /**
   * Strip digit characters from name text inputs.
   * Bound to (input) on name fields to prevent numeric entry.
   * Uses the input's id to look up the reactive form control.
   */
  stripDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      // Try editForm first (modal), then main form
      const ctrl = this.editForm?.get(input.id) ?? this.form?.get(input.id);
      ctrl?.setValue(cleaned, { emitEvent: true });
    }
  }

  /**
   * Enforce digits-only input for TP Number.
   * Strips any non-digit character on every keystroke.
   * The "TP" prefix is visual only — the form control stores digits only.
   * On save, the full value is stored as "TP" + digits.
   */
  enforceTPNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.editForm?.get('tpNumber')?.setValue(cleaned, { emitEvent: true });
    }
  }

  /**
   * When saving a student entry, prefix the TP number with "TP" if not already present.
   * The form control stores digits only; the saved entry stores the full "TP123456" value.
   */
  private formatTPNumber(raw: string): string {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `TP${digits}` : '';
  }

  /**
   * When loading a student entry for editing, strip the "TP" prefix so only
   * the numeric part is shown in the editable input.
   */
  private parseTPNumber(stored: string): string {
    return stored.replace(/^TP/i, '');
  }

  // Pagination handlers
  onApuStaffPageChange(page: number) {
    this.apuStaffCurrentPage = page;
  }

  onApuStaffPageSizeChange(pageSize: number) {
    this.apuStaffPageSize = pageSize;
    this.apuStaffCurrentPage = 1;
  }

  onStudentCoAuthorsPageChange(page: number) {
    this.studentCoAuthorsCurrentPage = page;
  }

  onStudentCoAuthorsPageSizeChange(pageSize: number) {
    this.studentCoAuthorsPageSize = pageSize;
    this.studentCoAuthorsCurrentPage = 1;
  }

  onNonApuCoAuthorsPageChange(page: number) {
    this.nonApuCoAuthorsCurrentPage = page;
  }

  onNonApuCoAuthorsPageSizeChange(pageSize: number) {
    this.nonApuCoAuthorsPageSize = pageSize;
    this.nonApuCoAuthorsCurrentPage = 1;
  }
}
