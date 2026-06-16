import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JournalOptionsService, JournalOptionType } from '../../services/journal-options.service';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { TableSortService, SortDirection } from '../../../../shared/services/table-sort.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

type BreakdownTypeKey = JournalOptionType;

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
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
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
  optionsPage = signal(1);
  optionsPageSize = signal(15);
  optionsPageSizeOptions = [5, 15, 30, 50];

  breakdownTypeOptions: BreakdownTypeOption[] = [
    { value: 'vote_number_description', label: 'Vote Number Description' },
    { value: 'vote_number', label: 'Vote Number' },
    { value: 'account_code_description', label: 'Account Code Description' },
    { value: 'account_code', label: 'Account Code' }
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

  optionsTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.getFilteredAndSortedOptions().length / this.optionsPageSize()));
  });

  paginatedOptions = computed(() => {
    const list = this.getFilteredAndSortedOptions();
    const currentPage = Math.min(this.optionsPage(), this.optionsTotalPages());
    const startIndex = (currentPage - 1) * this.optionsPageSize();
    return list.slice(startIndex, startIndex + this.optionsPageSize());
  });

  optionsPageStart = computed(() => {
    const total = this.getFilteredAndSortedOptions().length;
    if (total === 0) return 0;
    return ((Math.min(this.optionsPage(), this.optionsTotalPages()) - 1) * this.optionsPageSize()) + 1;
  });

  optionsPageEnd = computed(() => {
    const total = this.getFilteredAndSortedOptions().length;
    if (total === 0) return 0;
    return Math.min(this.optionsPageStart() + this.optionsPageSize() - 1, total);
  });

  ngOnInit() {
    this.initializeOptionForm();
    // Set default to first category
    this.selectedBreakdownType.set('vote_number_description');
  }

  private initializeOptionForm() {
    this.optionForm = this.fb.group({
      label: ['', [Validators.required]],
      status: ['Active'],
      accountCode: ['']
    });
  }

  /**
   * Check if current breakdown type is vote number description
   */
  isVoteNumberDescriptionType(): boolean {
    return this.selectedBreakdownType() === 'vote_number_description';
  }

  /**
   * Handle search input change
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.optionsPage.set(1);
  }

  /**
   * Handle filter status change
   */
  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterStatus.set(target.value as 'All' | 'Active' | 'Inactive');
    this.optionsPage.set(1);
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
    this.optionsPage.set(1);
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
    this.optionsPage.set(1);
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

    const baseOptions = this.JournalOptionsService.getOptionsForType(type);

    // Enhance with metadata from localStorage if available
    return baseOptions.map(opt => {
      const metadata = this.getOptionMetadata(type, opt.value);
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
  private getOptionMetadata(type: BreakdownTypeKey, value: string): { createdDate?: string; status?: 'Active' | 'Inactive'; accountCode?: string; } | null {
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
  private saveOptionMetadata(type: BreakdownTypeKey, value: string, metadata: { status?: string; accountCode?: string; }) {
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
    this.optionsPage.set(1);
  }

  onOptionsPageChange(page: number): void {
    this.optionsPage.set(page);
  }

  onOptionsPageSizeChange(pageSize: number): void {
    this.optionsPageSize.set(pageSize);
    this.optionsPage.set(1);
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
      const serviceType: BreakdownTypeKey = type;

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

      window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));

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
    const serviceType: BreakdownTypeKey = type;

    try {
      this.JournalOptionsService.deleteOption(serviceType, optionValue);
      this.selectedCheckboxes.set(new Set());
      window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));
    } catch (error) {
      console.error('Error deleting option:', error);
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
    const serviceType: BreakdownTypeKey = type;
    const selectedValues = Array.from(this.selectedCheckboxes());

    try {
      selectedValues.forEach(value => {
        this.JournalOptionsService.deleteOption(serviceType, value);
      });
      this.selectedCheckboxes.set(new Set());
      window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));
    } catch (error) {
      console.error('Error deleting options:', error);
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
    const option = this.breakdownTypeOptions.find((o: BreakdownTypeOption) => o.value === type);
    return option?.label || type;
  }

  formatRowDate(date?: string | null): string {
    if (!date) return this.getTodayDate();
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString('en-GB');
    } catch {
      return String(date);
    }
  }
}





