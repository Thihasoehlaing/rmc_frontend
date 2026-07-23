import { Component, OnInit, OnDestroy, Input, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SearchableDropdownComponent } from '../../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ActionButtonComponent } from '../../../../../shared/components/action-button/action-button.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../../shared/components/data-table/data-table.component';
import { CustomSubheaderComponent } from '../../../../../shared/components/custom-subheader/custom-subheader.component';
import { CustomHeaderComponent } from '../../../../../shared/components/custom-header/custom-header.component';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { DropdownOption } from '../../../../../core/interfaces/components.interface';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';
import {
  AcademicStaffOption,
  MasterDataService,
} from '../../../../../core/services/master-data.service';

import { TableActionIconComponent } from '../../../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-author-details-form',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    ActionButtonComponent,
    DataTableComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    DialogComponent,
  ],
  templateUrl: './author-details-form.component.html',
  styleUrl: './author-details-form.component.scss',
})
export class AuthorDetailsFormComponent implements OnInit, OnDestroy {
  readonly apuAffiliation = 'Asia Pacific University';
  @Input() workflow?: ConferenceWorkflowService;
  @Input() isFormReadOnly: boolean = false;

  form!: FormGroup;
  editForm!: FormGroup;
  private readonly masterData = inject(MasterDataService);

  // Modal state
  isModalOpen = false;
  editingIndex: number | null = null;

  staffOptions: DropdownOption[] = [];
  departmentOptions: DropdownOption<string>[] = [];
  organisationTypeOptions: DropdownOption[] = [];
  private academicStaffByName = new Map<string, AcademicStaffOption>();
  private staffSelectionSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private formStateService: ConferenceFormStateService,
  ) {
    // Apply form read-only effect if workflow is provided
    effect(() => {
      if (this.workflow?.isFormReadOnly()) {
        this.form?.disable({ emitEvent: false });
      } else {
        this.form?.enable({ emitEvent: false });
      }
    });
  }
  modalType: 'apu-staff' | 'student' | 'non-apu' | null = null;

  // DataTable column definitions
  apuStaffColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'staffName', label: 'Please select Staff Name', width: '28%' },
    { key: 'schoolDepartment', label: 'School/Department', width: '32%' },
    { key: 'affiliation', label: 'Second Affiliation (If any)', width: '25%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  studentCoAuthorColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'tpNumber', label: 'TP Number', width: '12%' },
    { key: 'fullName', label: 'Full Name (as per IC/Passport)', width: '25%' },
    { key: 'schoolDepartment', label: 'School/Department', width: '26%' },
    { key: 'affiliation', label: 'Second Affiliation', width: '22%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  nonApuCoAuthorColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'fullName', label: 'Full Name (as per IC/Passport)', width: '16%' },
    { key: 'country', label: 'Country', width: '10%' },
    { key: 'email', label: 'Email', width: '15%' },
    { key: 'organisationType', label: 'Type of Organisation', width: '13%' },
    { key: 'schoolDepartment', label: 'School/Department', width: '16%' },
    { key: 'institutionName', label: 'Institution/Company Name', width: '15%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' },
  ];

  ngOnInit() {
    this.initializeForm();
    this.loadFormState();

    this.loadAcademicStaffOptions();
    this.loadDepartmentOptions();
    this.masterData.getDropdownOptions('TYPE_OF_ORGANISATION').subscribe((res) => {
      this.organisationTypeOptions = (res.data ?? [])
        .filter((o) => o.status === 'ACTIVE')
        .map((o) => ({ value: o.option_name, label: o.option_name }));
    });
  }

  ngOnDestroy() {
    // Save form state before component is destroyed
    this.saveFormState();
    this.staffSelectionSubscription?.unsubscribe();
  }

  initializeForm() {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      employeeId: ['', [Validators.required]],
      designation: ['', [Validators.required]],
      department: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      coAuthors: [''],
      isPresenter: [true],
      testSubsections: this.fb.array([]),
      studentCoAuthors: this.fb.array([]),
      nonApuCoAuthors: this.fb.array([]),
    });
  }

  /**
   * Load form state from the state service
   */
  private loadFormState() {
    const savedState = this.formStateService.getFormSection('authorDetails');
    if (savedState) {
      // Define array field creators for FormArray restoration
      const arrayFields = {
        testSubsections: (data: any) =>
          this.fb.group({
            backendId: [data?.backendId ?? null],
            staffName: [data?.staffName || '', [Validators.required]],
            schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
            affiliation: [data?.affiliation || ''],
          }),
        studentCoAuthors: (data: any) =>
          this.fb.group({
            backendId: [data?.backendId ?? null],
            tpNumber: [
              data?.tpNumber || '',
              [Validators.required],
            ],
            fullName: [data?.fullName || '', [Validators.required]],
            schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
            affiliation: [this.apuAffiliation],
          }),
        nonApuCoAuthors: (data: any) =>
          this.fb.group({
            backendId: [data?.backendId ?? null],
            fullName: [data?.fullName || '', [Validators.required]],
            country: [data?.country || '', [Validators.required]],
            email: [data?.email || '', [Validators.required, Validators.email]],
            organisationType: [data?.organisationType || '', [Validators.required]],
            schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
            institutionName: [data?.institutionName || '', [Validators.required]],
          }),
      };

      // Use the enhanced restore method that handles FormArrays
      this.formStateService.restoreFormState(this.form, savedState, arrayFields);
    }
  }

  private saveFormState() {
    if (this.form) {
      this.formStateService.saveFormSection('authorDetails', this.form.getRawValue());
    }
  }

  /** Flushes the live form into the shared state service — called by the wizard before saving. */
  flushFormState(): void {
    this.saveFormState();
  }

  createTestSubsection(): FormGroup {
    return this.fb.group({
      staffName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: [''],
    });
  }

  createStudentCoAuthor(): FormGroup {
    return this.fb.group({
      tpNumber: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: [this.apuAffiliation],
    });
  }

  createNonApuCoAuthor(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required]],
      country: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      organisationType: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      institutionName: ['', [Validators.required]],
    });
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

  // Methods to get table data as arrays with index
  getApuStaffTableData(): (any & { index: number })[] {
    return this.testSubsections.controls.map((control, index) => ({
      ...control.value,
      index: index + 1,
    }));
  }

  getStudentCoAuthorTableData(): (any & { index: number })[] {
    return this.studentCoAuthors.controls.map((control, index) => ({
      ...control.value,
      index: index + 1,
    }));
  }

  getNonApuCoAuthorTableData(): (any & { index: number })[] {
    return this.nonApuCoAuthors.controls.map((control, index) => ({
      ...control.value,
      index: index + 1,
    }));
  }

  deleteTestSubsection(index: number) {
    this.testSubsections.removeAt(index);
  }

  deleteStudentCoAuthor(index: number) {
    this.studentCoAuthors.removeAt(index);
  }

  deleteNonApuCoAuthor(index: number) {
    this.nonApuCoAuthors.removeAt(index);
  }

  // Modal Methods
  openEditModal(type: 'apu-staff' | 'student' | 'non-apu', index?: number) {
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
          affiliation: [data.affiliation || ''],
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
          country: [data.country, [Validators.required]],
          email: [data.email, [Validators.required, Validators.email]],
          organisationType: [data.organisationType, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
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
          affiliation: [''],
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
          country: ['', [Validators.required]],
          email: ['', [Validators.required, Validators.email]],
          organisationType: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          institutionName: ['', [Validators.required]],
        });
      }
    }

    // Disable form if user can't add co-authors
    if (!this.canAddCoAuthors()) {
      this.editForm.disable({ emitEvent: false });
    } else {
      this.editForm.enable({ emitEvent: false });
      this.applyModalControlLocks();
    }
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
      return;
    }

    const formData = {
      ...this.editForm.getRawValue(),
      ...(this.modalType === 'apu-staff' || this.modalType === 'student'
        ? { affiliation: this.apuAffiliation }
        : {}),
    };

    if (this.modalType === 'student' && formData.tpNumber) {
      formData.tpNumber = this.formatTPNumber(formData.tpNumber);
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

  canAddCoAuthors(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'draft',
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission',
      'pending_applicant_resubmission_hos',
      'pending_applicant_resubmission_rmc',
    ];
    return allowedStatuses.includes(status);
  }

  filterTpNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    this.editForm.get('tpNumber')?.setValue(input.value, { emitEvent: false });
  }

  loadAcademicStaffOptions(search = ''): void {
    const selectedStaffName = this.editForm?.get('staffName')?.value;
    this.masterData.searchAcademicStaff(search).subscribe((res) => {
      const staff = res.data ?? [];
      this.academicStaffByName.clear();
      const options = staff.map((item) => this.toAcademicStaffDropdownOption(item));
      const selectedValue = String(selectedStaffName ?? '').trim();

      if (selectedValue && !options.some((option) => option.value === selectedValue)) {
        options.unshift({ value: selectedValue, label: selectedValue, displayLabel: selectedValue });
      }

      this.staffOptions = options;
    });
  }

  private loadDepartmentOptions(): void {
    this.masterData.getDepartments().subscribe((res) => {
      const seen = new Set<string>();
      this.departmentOptions = (res.data ?? [])
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
    });
  }

  private isStudentSchoolDepartment(departmentName: string | null | undefined): boolean {
    const name = String(departmentName ?? '').trim().toLowerCase();
    return name.startsWith('graduate school') || name.startsWith('school of');
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

  private setupStaffSelection(selectedStaffName = ''): void {
    this.staffSelectionSubscription?.unsubscribe();
    const selectedValue = selectedStaffName.trim();
    if (selectedValue && !this.staffOptions.some((option) => option.value === selectedValue)) {
      this.staffOptions = [
        { value: selectedValue, label: selectedValue, displayLabel: selectedValue },
        ...this.staffOptions,
      ];
    }

    this.patchDepartmentFromSelectedStaff(selectedValue);
    this.staffSelectionSubscription = this.editForm.get('staffName')?.valueChanges.subscribe((staffName) => {
      this.patchDepartmentFromSelectedStaff(String(staffName ?? ''));
    });
  }

  private patchDepartmentFromSelectedStaff(staffName: string): void {
    const staff = this.academicStaffByName.get(staffName);
    if (!staff) return;

    this.editForm.patchValue(
      {
        schoolDepartment: staff.department || '',
        affiliation: this.apuAffiliation,
      },
      { emitEvent: false },
    );
  }

  private applyModalControlLocks(): void {
    if (this.modalType === 'apu-staff') {
      this.editForm.get('schoolDepartment')?.disable({ emitEvent: false });
    }
  }

  private formatTPNumber(raw: string): string {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `TP${digits}` : '';
  }

  private parseTPNumber(stored: string): string {
    return String(stored || '').replace(/^TP/i, '');
  }
}
