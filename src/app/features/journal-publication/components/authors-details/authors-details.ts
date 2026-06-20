import { Component, OnInit, inject, effect, Output, EventEmitter } from '@angular/core';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { DataTableComponent, DataTableColumn } from '../../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';

@Component({
  selector: 'app-authors-details',
  templateUrl: './authors-details.html',
  styleUrls: ['./authors-details.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent, CustomHeaderComponent, ValidationMessageComponent, ActionButtonComponent, DataTableComponent, PaginationComponent, NoteComponent]
})
export class AuthorsDetails implements OnInit {
  readonly apuAffiliation = 'Asia Pacific University';
  @Output() formValidityChange = new EventEmitter<boolean>();
  form!: FormGroup;

  readonly apuStaffColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'staffName', label: 'Staff Name', width: '28%' },
    { key: 'schoolDepartment', label: 'School', width: '32%' },
    { key: 'affiliation', label: 'Second Affiliation', width: '25%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' }
  ];

  readonly studentColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'tpNumber', label: 'TP Number', width: '12%' },
    { key: 'fullName', label: 'Student Name', width: '25%' },
    { key: 'schoolDepartment', label: 'School', width: '26%' },
    { key: 'affiliation', label: 'Second Affiliation', width: '22%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' }
  ];

  readonly nonApuColumns: DataTableColumn[] = [
    { key: 'no', label: '#', width: '5%', align: 'center', headerAlign: 'center' },
    { key: 'fullName', label: 'Full Name', width: '13%' },
    { key: 'email', label: 'Email', width: '15%' },
    { key: 'country', label: 'Country', width: '10%' },
    { key: 'typeOfOrganisation', label: 'Type of Organisation', width: '13%' },
    { key: 'institutionName', label: 'Institution/Company Name', width: '16%' },
    { key: 'schoolDepartment', label: 'School/Department', width: '18%' },
    { key: 'actions', label: 'Actions', width: '10%', align: 'center', headerAlign: 'center' }
  ];

  isModalOpen: boolean = false;
  editForm!: FormGroup;
  editingIndex: number | null = null;
  modalType: 'apu-staff' | 'student' | 'non-apu' | null = null;

  // Pagination
  readonly ITEMS_PER_PAGE = 5;
  readonly ITEMS_PER_PAGE_OPTIONS = [5, 15, 30, 50];
  apuStaffCurrentPage = 1;
  studentCoAuthorsCurrentPage = 1;
  nonApuCoAuthorsCurrentPage = 1;
  apuStaffPageSize = 5;
  studentCoAuthorsPageSize = 5;
  nonApuCoAuthorsPageSize = 5;

  // Staff dropdown options
  staffOptions: DropdownOption[] = [
    { value: 'Vivian Banshee', label: 'Vivian Banshee' },
    { value: 'John Smith', label: 'John Smith' },
    { value: 'Sarah Johnson', label: 'Sarah Johnson' },
    { value: 'Michael Brown', label: 'Michael Brown' },
    { value: 'Emily Davis', label: 'Emily Davis' },
    { value: 'Robert Wilson', label: 'Robert Wilson' },
    { value: 'Jessica Taylor', label: 'Jessica Taylor' },
    { value: 'James Anderson', label: 'James Anderson' }
  ];

  // Country dropdown — searchable list used in the Non-APU co-author modal
  readonly countryOptions: DropdownOption<string>[] = [
    'Afghanistan','Albania','Algeria','Argentina','Australia','Austria',
    'Bangladesh','Belgium','Brazil','Cambodia','Canada','Chile','China',
    'Colombia','Czech Republic','Denmark','Egypt','Ethiopia','Finland',
    'France','Germany','Ghana','Greece','Hong Kong','Hungary','India',
    'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Japan','Jordan',
    'Kazakhstan','Kenya','Kuwait','Lebanon','Libya','Malaysia','Mexico',
    'Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nigeria',
    'Norway','Oman','Pakistan','Palestine','Philippines','Poland',
    'Portugal','Qatar','Romania','Russia','Saudi Arabia','Singapore',
    'South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden',
    'Switzerland','Syria','Taiwan','Thailand','Tunisia','Turkey',
    'Ukraine','United Arab Emirates','United Kingdom','United States',
    'Vietnam','Yemen','Zimbabwe'
  ].map(c => ({ value: c, label: c }));

  workflow = inject(JournalWorkflowService);

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

    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });
  }

  createTestSubsection(): FormGroup {
    return this.fb.group({
      staffName: [''],
      schoolDepartment: [''],
      affiliation: [this.apuAffiliation]
    });
  }

  createStudentCoAuthor(): FormGroup {
    return this.fb.group({
      // TP Number: required, must be non-empty digits, no all-zeros, max 6 digits
      tpNumber: ['', [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')]],
      fullName: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      affiliation: [this.apuAffiliation]
    });
  }

  createNonApuCoAuthor(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required]],
      country: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      schoolDepartment: ['', [Validators.required]],
      typeOfOrganisation: ['', [Validators.required]],
      institutionName: ['', [Validators.required]]
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
    return this.testSubsections.length === 0 ? 0 : ((Math.min(this.apuStaffCurrentPage, this.getApuStaffTotalPages()) - 1) * this.apuStaffPageSize) + 1;
  }

  getApuStaffPageEnd(): number {
    return this.testSubsections.length === 0 ? 0 : Math.min(this.getApuStaffPageStart() + this.apuStaffPageSize - 1, this.testSubsections.length);
  }

  getStudentCoAuthorsPageStart(): number {
    return this.studentCoAuthors.length === 0 ? 0 : ((Math.min(this.studentCoAuthorsCurrentPage, this.getStudentCoAuthorsTotalPages()) - 1) * this.studentCoAuthorsPageSize) + 1;
  }

  getStudentCoAuthorsPageEnd(): number {
    return this.studentCoAuthors.length === 0 ? 0 : Math.min(this.getStudentCoAuthorsPageStart() + this.studentCoAuthorsPageSize - 1, this.studentCoAuthors.length);
  }

  getNonApuCoAuthorsPageStart(): number {
    return this.nonApuCoAuthors.length === 0 ? 0 : ((Math.min(this.nonApuCoAuthorsCurrentPage, this.getNonApuCoAuthorsTotalPages()) - 1) * this.nonApuCoAuthorsPageSize) + 1;
  }

  getNonApuCoAuthorsPageEnd(): number {
    return this.nonApuCoAuthors.length === 0 ? 0 : Math.min(this.getNonApuCoAuthorsPageStart() + this.nonApuCoAuthorsPageSize - 1, this.nonApuCoAuthors.length);
  }

  getPaginatedApuStaffControls() {
    const startIndex = (Math.min(this.apuStaffCurrentPage, this.getApuStaffTotalPages()) - 1) * this.apuStaffPageSize;
    return this.testSubsections.controls.slice(startIndex, startIndex + this.apuStaffPageSize);
  }

  getPaginatedStudentCoAuthorsControls() {
    const startIndex = (Math.min(this.studentCoAuthorsCurrentPage, this.getStudentCoAuthorsTotalPages()) - 1) * this.studentCoAuthorsPageSize;
    return this.studentCoAuthors.controls.slice(startIndex, startIndex + this.studentCoAuthorsPageSize);
  }

  getPaginatedNonApuCoAuthorsControls() {
    const startIndex = (Math.min(this.nonApuCoAuthorsCurrentPage, this.getNonApuCoAuthorsTotalPages()) - 1) * this.nonApuCoAuthorsPageSize;
    return this.nonApuCoAuthors.controls.slice(startIndex, startIndex + this.nonApuCoAuthorsPageSize);
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

  addTestSubsection() {
    this.testSubsections.push(this.createTestSubsection());
  }

  deleteTestSubsection(index: number) {
    this.testSubsections.removeAt(index);
  }

  addStudentCoAuthor() {
    this.studentCoAuthors.push(this.createStudentCoAuthor());
  }

  deleteStudentCoAuthor(index: number) {
    this.studentCoAuthors.removeAt(index);
  }

  addNonApuCoAuthor() {
    this.nonApuCoAuthors.push(this.createNonApuCoAuthor());
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
          staffName: [data.staffName],
          schoolDepartment: [data.schoolDepartment],
          affiliation: [this.apuAffiliation]
        });
      } else if (type === 'student') {
        data = this.studentCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          tpNumber: [this.parseTPNumber(data.tpNumber), [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')]],
          fullName: [data.fullName, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          affiliation: [this.apuAffiliation]
        });
      } else if (type === 'non-apu') {
        data = this.nonApuCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          fullName: [data.fullName, [Validators.required]],
          country: [data.country, [Validators.required]],
          email: [data.email, [Validators.required, Validators.email]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          typeOfOrganisation: [data.typeOfOrganisation, [Validators.required]],
          institutionName: [data.institutionName, [Validators.required]]
        });
      }
    } else {
      // Adding new entry
      this.editingIndex = null;
      if (type === 'apu-staff') {
        this.editForm = this.fb.group({
          staffName: [''],
          schoolDepartment: [''],
          affiliation: [this.apuAffiliation]
        });
      } else if (type === 'student') {
        this.editForm = this.fb.group({
          tpNumber: ['', [Validators.required, Validators.pattern('^(?!0+$)[0-9]{1,6}$')]],
          fullName: ['', [Validators.required]],
          schoolDepartment: ['', [Validators.required]],
          affiliation: [this.apuAffiliation]
        });
      } else if (type === 'non-apu') {
        this.editForm = this.fb.group({
          fullName: ['', [Validators.required]],
          country: ['', [Validators.required]],
          email: ['', [Validators.required, Validators.email]],
          schoolDepartment: ['', [Validators.required]],
          typeOfOrganisation: ['', [Validators.required]],
          institutionName: ['', [Validators.required]]
        });
      }
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

    const formData = {
      ...this.editForm.value,
      ...(this.modalType === 'apu-staff' || this.modalType === 'student'
        ? { affiliation: this.apuAffiliation }
        : {})
    };

    // Prepend "TP" prefix to the student TP number before saving
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
      'student': `${isEditing} Asia Pacific University of Technology & Innovation Student Co-Author`,
      'non-apu': `${isEditing} Co-Author Outside Asia Pacific University of Technology & Innovation`
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
