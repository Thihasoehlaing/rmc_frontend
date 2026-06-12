import { Component, OnInit, OnDestroy, Input, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { DataTableComponent, DataTableColumn } from '../../../../shared/components/data-table/data-table.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { DropdownOption } from '../../../../interfaces/components.interface';
import { ConferenceWorkflowService } from '../../../services/conference-workflow.service';
import { ConferenceFormStateService } from '../../../services/conference-form-state.service';
import { DropdownsStoreService, StoredDropdownOption } from '../../../../settings/dropdowns/dropdowns-store.service';

@Component({
  selector: 'app-author-details-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent, ActionButtonComponent, DataTableComponent, CustomHeaderComponent, CustomSubheaderComponent, DialogComponent],
  templateUrl: './author-details-form.component.html',
  styleUrl: './author-details-form.component.scss'
})
export class AuthorDetailsFormComponent implements OnInit, OnDestroy {
  @Input() workflow?: ConferenceWorkflowService;
  @Input() isFormReadOnly: boolean = false;

  form!: FormGroup;
  editForm!: FormGroup;
  private readonly dropdownStore = inject(DropdownsStoreService);

  // Modal state
  isModalOpen = false;
  editingIndex: number | null = null;

  private readonly defaultStaffOptions: DropdownOption[] = [
    { value: 'Vivian Banshee', label: 'Vivian Banshee' },
    { value: 'John Smith', label: 'John Smith' },
    { value: 'Sarah Johnson', label: 'Sarah Johnson' },
    { value: 'Michael Brown', label: 'Michael Brown' },
    { value: 'Emily Davis', label: 'Emily Davis' },
    { value: 'Robert Wilson', label: 'Robert Wilson' },
    { value: 'Jessica Taylor', label: 'Jessica Taylor' },
    { value: 'James Anderson', label: 'James Anderson' }
  ];

  private readonly defaultOrganisationTypeOptions: DropdownOption[] = [
    { value: 'University', label: 'University' },
    { value: 'Research Institute', label: 'Research Institute' },
    { value: 'Company', label: 'Company' },
    { value: 'Government Agency', label: 'Government Agency' },
    { value: 'Non-Profit Organization', label: 'Non-Profit Organization' },
    { value: 'Other', label: 'Other' }
  ];

  constructor(private fb: FormBuilder, private formStateService: ConferenceFormStateService) {
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

  get staffOptions(): DropdownOption[] {
    return this.getConferenceDropdownOptions('Staff Name', this.defaultStaffOptions);
  }

  get organisationTypeOptions(): DropdownOption[] {
    return this.getConferenceDropdownOptions('Type of Organisation', this.defaultOrganisationTypeOptions);
  }

  // DataTable column definitions
  apuStaffColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'staffName', label: 'Please select Staff Name' },
    { key: 'schoolDepartment', label: 'School/Department' },
    { key: 'affiliation', label: 'Second Affiliation (if any)' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' }
  ];

  studentCoAuthorColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'tpNumber', label: 'TP Number' },
    { key: 'fullName', label: 'Full Name (as per IC/Passport)' },
    { key: 'schoolDepartment', label: 'School/Department' },
    { key: 'affiliation', label: 'Affiliation' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' }
  ];

  nonApuCoAuthorColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'fullName', label: 'Full Name (as per IC/Passport)' },
    { key: 'country', label: 'Country' },
    { key: 'email', label: 'Email' },
    { key: 'organisationType', label: 'Type of Organisation' },
    { key: 'schoolDepartment', label: 'School/Department' },
    { key: 'institutionName', label: 'Institution/Company Name' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.loadFormState();
  }

  ngOnDestroy() {
    // Save form state before component is destroyed
    this.saveFormState();
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
      nonApuCoAuthors: this.fb.array([])
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
        testSubsections: (data: any) => this.fb.group({
          staffName: [data?.staffName || '', [Validators.required]],
          schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
          affiliation: [data?.affiliation || '', [Validators.required]]
        }),
        studentCoAuthors: (data: any) => this.fb.group({
          tpNumber: [data?.tpNumber || '', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
          fullName: [data?.fullName || '', [Validators.required]],
          schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
          affiliation: [data?.affiliation || '', [Validators.required]]
        }),
        nonApuCoAuthors: (data: any) => this.fb.group({
          fullName: [data?.fullName || '', [Validators.required]],
          country: [data?.country || '', [Validators.required]],
          email: [data?.email || '', [Validators.required, Validators.email]],
          organisationType: [data?.organisationType || '', [Validators.required]],
          schoolDepartment: [data?.schoolDepartment || '', [Validators.required]],
          institutionName: [data?.institutionName || '', [Validators.required]]
        })
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

  createTestSubsection(): FormGroup {
    return this.fb.group({
      staffName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: ['', [Validators.required]]
    });
  }

  createStudentCoAuthor(): FormGroup {
    return this.fb.group({
      tpNumber: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      fullName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: ['', [Validators.required]]
    });
  }

  createNonApuCoAuthor(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required]],
      country: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      organisationType: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      institutionName: ['', [Validators.required]]
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
      index: index + 1
    }));
  }

  getStudentCoAuthorTableData(): (any & { index: number })[] {
    return this.studentCoAuthors.controls.map((control, index) => ({
      ...control.value,
      index: index + 1
    }));
  }

  getNonApuCoAuthorTableData(): (any & { index: number })[] {
    return this.nonApuCoAuthors.controls.map((control, index) => ({
      ...control.value,
      index: index + 1
    }));
  }

  private getConferenceDropdownOptions(category: string, defaults: DropdownOption[]): DropdownOption[] {
    const options = this.dropdownStore.getOptions('Conference Application', category)
      .filter((option: StoredDropdownOption) => option.status === 'Active')
      .map((option: StoredDropdownOption) => ({ value: option.value, label: option.value }));

    return options.length > 0 ? options : defaults;
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
          affiliation: [data.affiliation, [Validators.required]]
        });
      } else if (type === 'student') {
        data = this.studentCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          tpNumber: [data.tpNumber, [Validators.required, Validators.pattern('^[0-9]{6}$')]],
          fullName: [data.fullName, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          affiliation: [data.affiliation, [Validators.required]]
        });
      } else if (type === 'non-apu') {
        data = this.nonApuCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          fullName: [data.fullName, [Validators.required]],
          country: [data.country, [Validators.required]],
          email: [data.email, [Validators.required, Validators.email]],
          organisationType: [data.organisationType, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          institutionName: [data.institutionName, [Validators.required]]
        });
      }
    } else {
      // Adding new entry
      this.editingIndex = null;
      if (type === 'apu-staff') {
        this.editForm = this.fb.group({
          staffName: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          affiliation: ['', [Validators.required]]
        });
      } else if (type === 'student') {
        this.editForm = this.fb.group({
          tpNumber: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
          fullName: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          affiliation: ['', [Validators.required]]
        });
      } else if (type === 'non-apu') {
        this.editForm = this.fb.group({
          fullName: ['', [Validators.required]],
          country: ['', [Validators.required]],
          email: ['', [Validators.required, Validators.email]],
          organisationType: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          institutionName: ['', [Validators.required]]
        });
      }
    }

    // Disable form if user can't add co-authors
    if (!this.canAddCoAuthors()) {
      this.editForm.disable({ emitEvent: false });
    } else {
      this.editForm.enable({ emitEvent: false });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingIndex = null;
    this.modalType = null;
    this.editForm.reset();
  }

  submitModal() {
    if (this.editForm.invalid) {
      return;
    }

    const formData = this.editForm.value;

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
      'student': `${isEditing} Asia Pacific University of Technology & Innovation Student Co-Author`,
      'non-apu': `${isEditing} Co-Author Outside Asia Pacific University of Technology & Innovation`
    };
    return titles[this.modalType];
  }

  canAddCoAuthors(): boolean {
    if (!this.workflow) return true;
    const status = this.workflow.status();
    const allowedStatuses = [
      'normal_application',
      'hos_application',
      'hos_request_resubmission',
      'rmc_request_resubmission'
    ];
    return allowedStatuses.includes(status);
  }

  filterTpNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    this.editForm.get('tpNumber')?.setValue(input.value, { emitEvent: false });
  }
}
