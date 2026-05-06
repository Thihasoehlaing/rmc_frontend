import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JournalOptionsService } from '../../../journal_publication_form/services/journal-options.service';
import { DropdownOption } from '../../../interfaces/components.interface';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';

type BreakdownTypeKey = 'research' | 'local';

interface BreakdownTypeOption {
  value: BreakdownTypeKey;
  label: string;
}

interface ExtendedOption extends DropdownOption {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  accountCode?: string;
}

@Component({
  selector: 'app-journal-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './journal-settings.component.html',
  styleUrl: './journal-settings.component.scss',
  providers: [TableSortService]
})
export class JournalSettingsComponent implements OnInit {
  private JournalOptionsService = inject(JournalOptionsService);
  private fb = inject(FormBuilder);
  private tableSortService = inject(TableSortService);

  selectedBreakdownType = signal<BreakdownTypeKey | null>(null);
  optionForm!: FormGroup;
  isModalOpen = signal(false);
  errorMessage = signal<string>('');
  editingOptionIndex = signal<number | null>(null);
  selectedCheckboxes = signal<Set<string>>(new Set());
  searchQuery = signal<string>('');
  filterStatus = signal<'All' | 'Active' | 'Inactive'>('All');
  sortBy = signal<'name' | 'date'>('date');
  headerSortColumn = signal<string | null>(null);
  headerSortDirection = signal<SortDirection>(null);

  breakdownTypeOptions: BreakdownTypeOption[] = [
    { value: 'research', label: 'Vote Number' },
    { value: 'local', label: 'Account Code' }
  ];

  /**
   * Check if any options are selected for bulk delete
   */
  hasSelectedOptions = computed(() => this.selectedCheckboxes().size > 0);

  /**
   * Get filtered and sorted options - now supports header click sorting
   */
  getFilteredAndSortedOptions = computed(() => {
    const options = this.getCurrentOptions();
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();

    let filtered = options.filter(opt => {
      const matchesSearch = opt.label.toLowerCase().includes(query);
      const matchesStatus = status === 'All' || opt.status === status;
      return matchesSearch && matchesStatus;
    });

    // Apply header-based sorting if active
    const headerColumn = this.headerSortColumn();
    const headerDirection = this.headerSortDirection();

    if (headerColumn && headerDirection) {
      return this.tableSortService.sort(filtered, headerColumn, headerDirection);
    }

    // Fallback to dropdown sorting
    const sortKey = this.sortBy();
    if (sortKey === 'date') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdDate || this.getTodayDate()).getTime();
        const dateB = new Date(b.createdDate || this.getTodayDate()).getTime();
        return dateB - dateA; // Newest first
      });
    } else if (sortKey === 'name') {
      filtered.sort((a, b) => a.label.localeCompare(b.label));
    }

    return filtered;
  });

  ngOnInit() {
    this.initializeOptionForm();
    // Set default to research
    this.selectedBreakdownType.set('research');
  }

  private initializeOptionForm() {
    this.optionForm = this.fb.group({
      label: ['', [Validators.required]],
      status: ['Active'],
      accountCode: ['']
    });
  }

  /**
   * Check if current breakdown type is research
   */
  isResearchType(): boolean {
    return this.selectedBreakdownType() === 'research';
  }

  /**
   * Check if current breakdown type is local
   */
  isLocalType(): boolean {
    return this.selectedBreakdownType() === 'local';
  }

  /**
   * Handle search input change
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Handle filter status change
   */
  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterStatus.set(target.value as 'All' | 'Active' | 'Inactive');
  }

  /**
   * Handle sort change
   */
  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value as 'name' | 'date');
    // Reset header sorting when using dropdown
    this.headerSortColumn.set(null);
    this.headerSortDirection.set(null);
  }

  /**
   * Handle table header click for sorting
   */
  onHeaderClick(columnName: string): void {
    const currentColumn = this.headerSortColumn();
    const currentDirection = this.headerSortDirection();

    if (currentColumn === columnName) {
      // Same column: cycle through direction
      this.headerSortDirection.set(this.tableSortService.getNextDirection(currentDirection));
    } else {
      // New column: start with ascending
      this.headerSortColumn.set(columnName);
      this.headerSortDirection.set('asc');
    }
  }

  /**
   * Get sort indicator for column header
   */
  getSortIndicator(columnName: string): string {
    if (this.headerSortColumn() === columnName) {
      const direction = this.headerSortDirection();
      return direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : '';
    }
    // Show ↕ indicator for sortable columns that aren't currently sorted
    return this.isSortableColumn(columnName) ? ' ↕' : '';
  }

  /**
   * Check if column header is sortable
   */
  isSortableColumn(columnName: string): boolean {
    return ['label', 'status', 'createdDate', 'accountCode'].includes(columnName);
  }

  /**
   * Get current options for selected breakdown type
   */
  getCurrentOptions(): ExtendedOption[] {
    const type = this.selectedBreakdownType();
    if (!type) {
      return [];
    }

    // For local breakdown type, show local options
    if (type === 'local') {
      const localOptions = this.JournalOptionsService.getOptionsForType('local');

      return localOptions.map(opt => {
        const metadata = this.getOptionMetadata('local', opt.value);
        return {
          ...opt,
          createdDate: metadata?.createdDate,
          status: metadata?.status || 'Active',
          accountCode: metadata?.accountCode
        } as ExtendedOption;
      });
    }

    const baseOptions = this.JournalOptionsService.getOptionsForType(type as 'research' | 'local');

    // Enhance with metadata from localStorage if available
    return baseOptions.map(opt => {
      const metadata = this.getOptionMetadata(type as 'research' | 'local', opt.value);
      return {
        ...opt,
        createdDate: metadata?.createdDate,
        status: metadata?.status || 'Active',
        accountCode: metadata?.accountCode
      } as ExtendedOption;
    });
  }

  /**
   * Get metadata for an option (created date, status) from storage
   */
  private getOptionMetadata(type: 'research' | 'local', value: string): { createdDate?: string; status?: 'Active' | 'Inactive'; accountCode?: string; } | null {
    const storageKey = `journal-option-metadata-${type}-${value}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Silently discard malformed metadata
    }
    return { createdDate: this.getTodayDate(), status: 'Active' };
  }

  /**
   * Save option metadata to localStorage
   */
  private saveOptionMetadata(type: 'research' | 'local', value: string, metadata: { status?: string; accountCode?: string; }) {
    const storageKey = `journal-option-metadata-${type}-${value}`;
    const existingMetadata = this.getOptionMetadata(type, value) || {};
    const updated = {
      ...existingMetadata,
      ...metadata,
      createdDate: existingMetadata.createdDate || this.getTodayDate()
    };
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  /**
   * Handle breakdown type selection
   */
  onBreakdownTypeChange(selectedValue: string) {
    this.selectedBreakdownType.set(selectedValue as BreakdownTypeKey);
    this.resetForm();
    this.selectedCheckboxes.set(new Set());
    this.searchQuery.set('');
    this.filterStatus.set('All');
    this.sortBy.set('date');
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
    this.errorMessage.set('');
    this.editingOptionIndex.set(null);
    this.optionForm.reset({ status: 'Active', accountCode: '' });
    this.isModalOpen.set(true);
  }

  /**
   * Open modal for editing existing option
   */
  editOption(option: ExtendedOption, index: number) {
    this.errorMessage.set('');
    this.editingOptionIndex.set(index);
    this.optionForm.patchValue({
      label: option.label,
      status: option.status || 'Active',
      accountCode: option.accountCode || ''
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
    const label = this.optionForm.get('label')?.value;
    const status = this.optionForm.get('status')?.value;
    const accountCode = this.optionForm.get('accountCode')?.value;

    const newOption: DropdownOption = {
      value: label.toLowerCase().replace(/\s+/g, '-'),
      label: label
    };

    try {
      this.errorMessage.set('');
      let serviceType: 'research' | 'local' = 'local';
      if (type === 'research') {
        serviceType = 'research';
      } else if (type === 'local') {
        serviceType = 'local';
      }

      if (this.editingOptionIndex() === null) {
        this.JournalOptionsService.addOption(serviceType, newOption);
      } else {
        const currentOptions = this.getCurrentOptions();
        const originalValue = currentOptions[this.editingOptionIndex()!].value; 
        this.JournalOptionsService.updateOption(serviceType, originalValue, newOption);
      }

      this.saveOptionMetadata(serviceType, newOption.value, {
        status,
        accountCode
      });

      this.closeModal();
    } catch {
      this.errorMessage.set('Failed to save option. Please try again.');
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
    let serviceType: 'research' | 'local' = 'local';
    if (type === 'research') {
      serviceType = 'research';
    } else if (type === 'local') {
      serviceType = 'local';
    }

    try {
      this.JournalOptionsService.deleteOption(serviceType, optionValue);
      this.selectedCheckboxes.set(new Set());
    } catch {
      this.errorMessage.set('Failed to delete option. Please try again.');
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
    let serviceType: 'research' | 'local' = 'local';
    if (type === 'research') {
      serviceType = 'research';
    } else if (type === 'local') {
      serviceType = 'local';
    }
    const selectedValues = Array.from(this.selectedCheckboxes());

    try {
      selectedValues.forEach(value => {
        this.JournalOptionsService.deleteOption(serviceType, value);
      });
      this.selectedCheckboxes.set(new Set());
    } catch {
      this.errorMessage.set('Failed to delete one or more options. Please try again.');
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    this.isModalOpen.set(false);
    this.errorMessage.set('');
    this.resetForm();
  }

  /**
   * Reset the form
   */
  private resetForm() {
    this.optionForm.reset({ status: 'Active', accountCode: '' });
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





