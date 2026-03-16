import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../interfaces/components.interface';

@Component({
  selector: 'app-author-details-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './author-details-form.component.html',
  styleUrl: './author-details-form.component.scss'
})
export class AuthorDetailsFormComponent implements OnInit {
  form!: FormGroup;
  editForm!: FormGroup;

  // Modal state
  isModalOpen = false;
  editingIndex: number | null = null;
  modalType: 'apu-staff' | 'student' | 'non-apu' | null = null;

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

  // Organisation type dropdown options
  organisationTypeOptions: DropdownOption[] = [
    { value: 'University', label: 'University' },
    { value: 'Research Institute', label: 'Research Institute' },
    { value: 'Company', label: 'Company' },
    { value: 'Government Agency', label: 'Government Agency' },
    { value: 'Non-Profit Organization', label: 'Non-Profit Organization' },
    { value: 'Other', label: 'Other' }
  ];

  constructor(private fb: FormBuilder) {}

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
      tpNumber: ['', [Validators.required]],
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
          staffName: [data.staffName, [Validators.required]],
          schoolDepartment: [data.schoolDepartment, [Validators.required]],
          affiliation: [data.affiliation, [Validators.required]]
        });
      } else if (type === 'student') {
        data = this.studentCoAuthors.at(index).value;
        this.editForm = this.fb.group({
          tpNumber: [data.tpNumber, [Validators.required]],
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
          tpNumber: ['', [Validators.required]],
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
      'apu-staff': `${isEditing} APU Staff Co-Author`,
      'student': `${isEditing} APU Student Co-Author`,
      'non-apu': `${isEditing} Non-APU Co-Author`
    };
    return titles[this.modalType];
  }
}
