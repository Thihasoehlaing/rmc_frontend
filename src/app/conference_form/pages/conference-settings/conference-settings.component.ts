import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreakdownOptionsService } from '../../services/breakdown-options.service';
import { DropdownOption } from '../../../interfaces/components.interface';

type BreakdownTypeKey = 'research' | 'external-research' | 'local' | 'overseas';

interface BreakdownTypeOption {
  value: BreakdownTypeKey;
  label: string;
}

interface ExtendedOption extends DropdownOption {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-conference-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './conference-settings.component.html',
  styleUrl: './conference-settings.component.scss'
})
export class ConferenceSettingsComponent implements OnInit {
  private breakdownOptionsService = inject(BreakdownOptionsService);
  private fb = inject(FormBuilder);

  selectedBreakdownType = signal<BreakdownTypeKey | null>(null);
  optionForm!: FormGroup;
  isModalOpen = signal(false);
  editingOptionIndex = signal<number | null>(null);
  selectedCheckboxes = signal<Set<string>>(new Set());

  breakdownTypeOptions: BreakdownTypeOption[] = [
    { value: 'research', label: 'Research Breakdown Entry' },
    { value: 'external-research', label: 'External Research Project Breakdown Entry' },
    { value: 'local', label: 'Local Breakdown Entry' },
    { value: 'overseas', label: 'Overseas Breakdown Entry' }
  ];

  /**
   * Check if any options are selected for bulk delete
   */
  hasSelectedOptions = computed(() => this.selectedCheckboxes().size > 0);

  ngOnInit() {
    this.initializeOptionForm();
  }

  private initializeOptionForm() {
    this.optionForm = this.fb.group({
      label: ['', [Validators.required]],
      status: ['Active']
    });
  }

  /**
   * Get current options for selected breakdown type
   */
  getCurrentOptions(): ExtendedOption[] {
    const type = this.selectedBreakdownType();
    if (!type) {
      return [];
    }

    const typeKey = type === 'external-research' ? 'research' : type;
    const baseOptions = this.breakdownOptionsService.getOptionsForType(typeKey as 'research' | 'local' | 'overseas');

    // Enhance with metadata from localStorage if available
    return baseOptions.map(opt => {
      const metadata = this.getOptionMetadata(typeKey as 'research' | 'local' | 'overseas', opt.value);
      return {
        ...opt,
        createdDate: metadata?.createdDate,
        status: metadata?.status || 'Active'
      } as ExtendedOption;
    });
  }

  /**
   * Get metadata for an option (created date, status) from service
   */
  private getOptionMetadata(type: 'research' | 'local' | 'overseas', value: string): { createdDate?: string; status?: 'Active' | 'Inactive' } | null {
    // This could be extended to store metadata in service
    return null;
  }

  /**
   * Handle breakdown type selection
   */
  onBreakdownTypeChange(selectedValue: string) {
    this.selectedBreakdownType.set(selectedValue as BreakdownTypeKey);
    this.resetForm();
    this.selectedCheckboxes.set(new Set());
  }

  /**
   * Toggle checkbox selection
   */
  toggleCheckbox(optionValue: string) {
    const newSelected = new Set(this.selectedCheckboxes());
    if (newSelected.has(optionValue)) {
      newSelected.delete(optionValue);
    } else {
      newSelected.add(optionValue);
    }
    this.selectedCheckboxes.set(newSelected);
  }

  /**
   * Check if an option is selected
   */
  isOptionSelected(optionValue: string): boolean {
    return this.selectedCheckboxes().has(optionValue);
  }

  /**
   * Open modal for adding new option
   */
  openAddModal() {
    this.editingOptionIndex.set(null);
    this.optionForm.reset({ status: 'Active' });
    this.isModalOpen.set(true);
  }

  /**
   * Open modal for editing existing option
   */
  editOption(option: ExtendedOption, index: number) {
    this.editingOptionIndex.set(index);
    this.optionForm.patchValue({
      label: option.label,
      status: option.status || 'Active'
    });
    this.isModalOpen.set(true);
  }

  /**
   * Save option (add or update)
   */
  saveOption() {
    if (this.optionForm.invalid || !this.selectedBreakdownType()) {
      return;
    }

    const type = this.selectedBreakdownType()!;
    const typeKey = type === 'external-research' ? 'research' : type;
    const label = this.optionForm.get('label')?.value;
    const newOption: DropdownOption = {
      value: label.toLowerCase().replace(/\s+/g, '-'),
      label: label
    };

    try {
      if (this.editingOptionIndex() === null) {
        // Add new option
        this.breakdownOptionsService.addOption(typeKey as 'research' | 'local' | 'overseas', newOption);
      } else {
        // Update existing option
        const currentOptions = this.getCurrentOptions();
        const originalValue = currentOptions[this.editingOptionIndex()!].value;
        this.breakdownOptionsService.updateOption(typeKey as 'research' | 'local' | 'overseas', originalValue, newOption);
      }
      this.closeModal();
    } catch (error) {
      console.error('Error saving option:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a single option
   */
  deleteOption(optionValue: string) {
    if (!confirm('Are you sure you want to delete this option?')) {
      return;
    }

    const type = this.selectedBreakdownType()!;
    const typeKey = type === 'external-research' ? 'research' : type;

    try {
      this.breakdownOptionsService.deleteOption(typeKey as 'research' | 'local' | 'overseas', optionValue);
      this.selectedCheckboxes.set(new Set()); // Clear selection
    } catch (error) {
      console.error('Error deleting option:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Delete selected options
   */
  deleteSelectedOptions() {
    const selectedCount = this.selectedCheckboxes().size;
    if (selectedCount === 0) {
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCount} option(s)?`)) {
      return;
    }

    const type = this.selectedBreakdownType()!;
    const typeKey = type === 'external-research' ? 'research' : type;
    const selectedValues = Array.from(this.selectedCheckboxes());

    try {
      selectedValues.forEach(value => {
        this.breakdownOptionsService.deleteOption(typeKey as 'research' | 'local' | 'overseas', value);
      });
      this.selectedCheckboxes.set(new Set());
    } catch (error) {
      console.error('Error deleting options:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  /**
   * Reset the form
   */
  private resetForm() {
    this.optionForm.reset({ status: 'Active' });
    this.editingOptionIndex.set(null);
  }

  /**
   * Get today's date formatted
   */
  getTodayDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  /**
   * Get the label for a breakdown type
   */
  getBreakdownTypeLabel(type: BreakdownTypeKey): string {
    const option = this.breakdownTypeOptions.find(o => o.value === type);
    return option?.label || type;
  }
}




