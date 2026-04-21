import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PartnershipOptionsService, PartnershipDropdownOption } from '../../services/partnership-options.service';

import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';

@Component({
  selector: 'app-partnership-settings',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    ActionButtonComponent,
    ValidationMessageComponent,
    DataTableComponent,
    DialogComponent
  ],
  templateUrl: './partnership-settings.component.html',
  styleUrls: ['./partnership-settings.component.scss']
})
export class PartnershipSettingsComponent implements OnInit {
  private optionsService = inject(PartnershipOptionsService);
  private fb = inject(FormBuilder);

  breakdownTypeOptions = [
    { value: 'category', label: 'APU Partnership Category' }
  ];
  selectedBreakdownType = signal<string | null>('category');

  isModalOpen = signal<boolean>(false);
  editingOptionIndex = signal<number | null>(null);
  selectedOptionValue = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  optionForm: FormGroup;

  searchQuery = signal<string>('');
  filterStatus = signal<string>('All');
  sortBy = signal<string>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  selectedCheckboxes = signal<Set<string>>(new Set<string>());

  tableColumns = [
    { key: 'select', label: '' },
    { key: 'label', label: 'Option Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdDate', label: 'Created Date', sortable: true },
    { key: 'actions', label: 'Actions' }
  ];

  constructor() {
    this.optionForm = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      status: ['Active']
    });
  }

  ngOnInit() {
  }

  onBreakdownTypeChange(event: Event) {
    const type = (event.target as HTMLSelectElement).value;
    this.selectedBreakdownType.set(type);
    this.clearSelection();
    this.searchQuery.set('');
    this.filterStatus.set('All');
    this.errorMessage.set(null);
  }

  openAddModal() {
    this.editingOptionIndex.set(null);
    this.selectedOptionValue.set(null);
    this.optionForm.reset({ status: 'Active' });
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  editOption(option: PartnershipDropdownOption, index: number) {
    this.editingOptionIndex.set(index);
    this.selectedOptionValue.set(option.value);

    this.optionForm.patchValue({
      label: option.label,
      status: option.status || 'Active'
    });

    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingOptionIndex.set(null);
    this.selectedOptionValue.set(null);
    this.optionForm.reset();
    this.errorMessage.set(null);
  }

  saveOption() {
    if (this.optionForm.invalid || !this.selectedBreakdownType()) return;

    try {
      const formValue = this.optionForm.value;
      const newOption: PartnershipDropdownOption = {
        value: this.editingOptionIndex() === null ? this.generateOptionValue(formValue.label) : this.selectedOptionValue() as string,
        label: formValue.label,
        status: formValue.status || 'Active',
        createdDate: this.editingOptionIndex() === null
          ? this.getTodayDate()
          : this.optionsService.getOptions()[this.editingOptionIndex()!].createdDate || this.getTodayDate()
      };

      if (this.editingOptionIndex() === null) {
        this.optionsService.addOption(newOption);
      } else {
        const originalValue = this.selectedOptionValue();
        if (originalValue) {
          this.optionsService.updateOption(originalValue, newOption);
        }
      }
      this.closeModal();
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        this.errorMessage.set('An option with this name already exists.');
      } else {
        this.errorMessage.set('An error occurred while saving the option.');
      }
    }
  }

  private generateOptionValue(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  toggleCheckbox(value: string, isChecked: boolean) {
    const current = new Set(this.selectedCheckboxes());
    if (isChecked) {
      current.add(value);
    } else {
      current.delete(value);
    }
    this.selectedCheckboxes.set(current);
  }

  toggleAllCheckboxes(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      const allValues = this.getFilteredAndSortedOptions().map(opt => opt.value);
      this.selectedCheckboxes.set(new Set(allValues));
    } else {
      this.clearSelection();
    }
  }

  isOptionSelected(value: string): boolean {
    return this.selectedCheckboxes().has(value);
  }

  hasSelectedOptions(): boolean {
    return this.selectedCheckboxes().size > 0;
  }

  clearSelection() {
    this.selectedCheckboxes.set(new Set());
  }

  deleteSelectedOptions() {
    if (!this.selectedBreakdownType()) return;
    if (confirm('Are you sure you want to delete the selected options?')) {     
      const selected = Array.from(this.selectedCheckboxes());
      selected.forEach(value => {
        try {
          this.optionsService.deleteOption(value);
        } catch (e) {
          console.error(`Failed to delete ${value}`, e);
        }
      });
      this.clearSelection();
    }
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterStatus.set(select.value);
  }

  onHeaderClick(column: string) {
    if (!this.isSortableColumn(column)) return;

    if (this.sortBy() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');  
    } else {
      this.sortBy.set(column);
      this.sortDirection.set(column === 'date' || column === 'createdDate' ? 'desc' : 'asc');
    }
  }

  isSortableColumn(column: string): boolean {
    return ['label', 'status', 'createdDate'].includes(column);
  }

  getFilteredAndSortedOptions(): PartnershipDropdownOption[] {
    if (!this.selectedBreakdownType()) return [];

    let options = this.optionsService.getOptions() || [];

    const status = this.filterStatus();
    if (status !== 'All') {
      options = options.filter(opt =>
        (opt.status || 'Active') === status
      );
    }

    const sortBy = this.sortBy();
    const sortDir = this.sortDirection() === 'asc' ? 1 : -1;

    return options.sort((a, b) => {
      let valA: string, valB: string;

      switch (sortBy) {
        case 'name':
        case 'label':
          valA = a.label.toLowerCase();
          valB = b.label.toLowerCase();
          break;
        case 'status':
          valA = (a.status || 'Active').toLowerCase();
          valB = (b.status || 'Active').toLowerCase();
          break;
        case 'date':
        case 'createdDate':
        default:
          valA = a.createdDate || '';
          valB = b.createdDate || '';
          break;
      }

      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });
  }

  // Support for RDIG style quick status toggle from table
  toggleStatus(option: PartnershipDropdownOption) {
    const newStatus = (option.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
    const newOption = { ...option, status: newStatus };
    this.optionsService.updateOption(option.value, newOption);
  }

  getTodayDate(): string {
    const today = new Date();
    const ds = String(today.getDate()).padStart(2, '0');
    const ms = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${ds}/${ms}/${y}`;
  }
}
