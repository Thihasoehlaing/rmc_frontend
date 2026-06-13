import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreakdownOptionsService } from '../../services/breakdown-options.service';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { TableSortService, SortDirection } from '../../../../shared/services/table-sort.service';
import { DataTableComponent, DataTableColumn } from '../../../../shared/components/data-table/data-table.component';

type BreakdownTypeKey = 'research' | 'local' | 'region';

interface BreakdownTypeOption {
  value: BreakdownTypeKey;
  label: string;
}

interface ExtendedOption extends DropdownOption {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  accountCode?: string;
  foreignLocal?: 'foreign' | 'local';
  percentage?: number;
  limit?: number;
  description?: string;
}

@Component({
  selector: 'app-conference-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './conference-settings.component.html',
  styleUrl: './conference-settings.component.scss',
  providers: [TableSortService]
})
export class ConferenceSettingsComponent implements OnInit {
  private breakdownOptionsService = inject(BreakdownOptionsService);
  private fb = inject(FormBuilder);
  private tableSortService = inject(TableSortService);

  selectedBreakdownType = signal<BreakdownTypeKey | null>(null);
  optionForm!: FormGroup;
  isModalOpen = signal(false);
  editingOptionIndex = signal<number | null>(null);
  selectedCheckboxes = signal<Set<string>>(new Set());
  searchQuery = signal<string>('');
  filterStatus = signal<'All' | 'Active' | 'Inactive'>('All');
  sortBy = signal<'name' | 'date'>('date');
  headerSortColumn = signal<string | null>(null);
  headerSortDirection = signal<SortDirection>(null);

  breakdownTypeOptions: BreakdownTypeOption[] = [
    { value: 'research', label: 'Vote Number' },
    { value: 'local', label: 'Account Code' },
    { value: 'region', label: 'Region' }
  ];
  /**
   * Get dynamic columns based on selected breakdown type
   */
  getTableColumns = computed(() => {
    const type = this.selectedBreakdownType();
    const baseColumns: DataTableColumn[] = [
      { key: 'checkbox', label: '', width: '50px', align: 'center' },
      { key: 'label', label: type === 'region' ? 'Region Name' : (type === 'local' ? 'Item Description' : 'Vote Number') }
    ];

    if (type === 'local') {
      baseColumns.push({ key: 'accountCode', label: 'Account Code' });
    } else if (type === 'region') {
      baseColumns.push({ key: 'percentage', label: 'Percentage' });
      baseColumns.push({ key: 'limit', label: 'Limit (RM)' });
    } else if (type === 'research') {
      baseColumns.push({ key: 'description', label: 'Item Description' });
    }

    if (type === 'research' || type === 'local') {
      baseColumns.push({ key: 'foreignLocal', label: 'Foreign / Local' });
    }

    baseColumns.push({ key: 'status', label: 'Status' });
    baseColumns.push({ key: 'createdDate', label: 'Created Date' });
    baseColumns.push({ key: 'actions', label: 'Actions', width: '100px', align: 'center' });

    return baseColumns;
  });


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
        const dateA = this.parseDisplayDate(a.createdDate || this.getTodayDate());
        const dateB = this.parseDisplayDate(b.createdDate || this.getTodayDate());
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
      accountCode: [''],
      foreignLocal: [''],
      percentage: [''],
      limit: [''],
      description: ['']
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
   * Check if current breakdown type is region
   */
  isRegionType(): boolean {
    return this.selectedBreakdownType() === 'region';
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
    return ['label', 'status', 'createdDate', 'accountCode', 'foreignLocal', 'percentage', 'limit'].includes(columnName);
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
      const localOptions = this.breakdownOptionsService.getOptionsForType('local');

      return localOptions.map(opt => {
        const metadata = this.getOptionMetadata('local', opt.value);
        return {
          ...opt,
          createdDate: metadata?.createdDate,
          status: metadata?.status || 'Active',
          accountCode: metadata?.accountCode,
          foreignLocal: metadata?.foreignLocal
        } as ExtendedOption;
      });
    }

    // For region breakdown type, show region options
    if (type === 'region') {
      const regionOptions = this.breakdownOptionsService.getOptionsForType('region');

      return regionOptions.map(opt => {
        const metadata = this.getOptionMetadata('region', opt.value);
        return {
          ...opt,
          createdDate: metadata?.createdDate,
          status: metadata?.status || 'Active',
          percentage: metadata?.percentage,
          limit: metadata?.limit,
          description: metadata?.description
        } as ExtendedOption;
      });
    }

    const baseOptions = this.breakdownOptionsService.getOptionsForType(type as 'research' | 'local');

    // Enhance with metadata from localStorage if available
    return baseOptions.map(opt => {
      const metadata = this.getOptionMetadata(type as 'research' | 'local', opt.value);
      return {
        ...opt,
        createdDate: metadata?.createdDate,
        status: metadata?.status || 'Active',
        accountCode: metadata?.accountCode,
        foreignLocal: metadata?.foreignLocal,
        description: metadata?.description
      } as ExtendedOption;
    });
  }

  /**
   * Get metadata for an option (created date, status, accountCode, foreignLocal, percentage, limit, description) from storage
   */
  private getOptionMetadata(type: 'research' | 'local' | 'region', value: string): { createdDate?: string; status?: 'Active' | 'Inactive'; accountCode?: string; foreignLocal?: 'foreign' | 'local'; percentage?: number; limit?: number; description?: string } | null {
    // Retrieve metadata from localStorage
    const storageKey = `option-metadata-${type}-${value}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return { createdDate: this.getTodayDate(), status: 'Active' };
  }

  /**
   * Save option metadata to localStorage
   */
  private saveOptionMetadata(type: 'research' | 'local' | 'region', value: string, metadata: { status?: string; accountCode?: string; foreignLocal?: string; percentage?: number; limit?: number; description?: string }) {
    const storageKey = `option-metadata-${type}-${value}`;
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
      status: option.status || 'Active',
      accountCode: option.accountCode || '',
      foreignLocal: option.foreignLocal || '',
      percentage: option.percentage || '',
      limit: option.limit || '',
      description: option.description || ''
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
    const accountCode = this.optionForm.get('accountCode')?.value;
    const foreignLocal = this.optionForm.get('foreignLocal')?.value;
    const status = this.optionForm.get('status')?.value;
    const percentage = this.optionForm.get('percentage')?.value;
    const limit = this.optionForm.get('limit')?.value;
    const description = this.optionForm.get('description')?.value;

    const newOption: DropdownOption = {
      value: label.toLowerCase().replace(/\s+/g, '-'),
      label: label
    };

    try {
      let serviceType: 'research' | 'local' | 'region' = 'local';
      if (type === 'research') {
        serviceType = 'research';
      } else if (type === 'local') {
        serviceType = 'local';
      } else if (type === 'region') {
        serviceType = 'region';
      }

      if (this.editingOptionIndex() === null) {
        // Add new option
        this.breakdownOptionsService.addOption(serviceType, newOption);
      } else {
        // Update existing option
        const currentOptions = this.getCurrentOptions();
        const originalValue = currentOptions[this.editingOptionIndex()!].value;
        this.breakdownOptionsService.updateOption(serviceType, originalValue, newOption);
      }

      // Store metadata in localStorage
      this.saveOptionMetadata(serviceType, newOption.value, {
        status,
        accountCode,
        foreignLocal,
        percentage,
        limit,
        description
      });

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
    let serviceType: 'research' | 'local' | 'region' = 'local';
    if (type === 'research') {
      serviceType = 'research';
    } else if (type === 'local') {
      serviceType = 'local';
    } else if (type === 'region') {
      serviceType = 'region';
    }

    try {
      this.breakdownOptionsService.deleteOption(serviceType, optionValue);
      this.selectedCheckboxes.set(new Set()); // Clear selection
    } catch (error) {
      console.error('Error deleting option:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Toggle active/inactive status for an option
   */
  toggleOptionStatus(option: ExtendedOption) {
    if (!this.selectedBreakdownType()) {
      return;
    }

    const type = this.selectedBreakdownType()!;
    let serviceType: 'research' | 'local' | 'region' = 'local';
    if (type === 'research') {
      serviceType = 'research';
    } else if (type === 'local') {
      serviceType = 'local';
    } else if (type === 'region') {
      serviceType = 'region';
    }

    const newStatus: 'Active' | 'Inactive' = option.status === 'Active' ? 'Inactive' : 'Active';

    try {
      this.saveOptionMetadata(serviceType, option.value, { status: newStatus });
    } catch (error) {
      console.error('Error toggling option status:', error);
      alert('Failed to update status.');
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
    let serviceType: 'research' | 'local' | 'region' = 'local';
    if (type === 'research') {
      serviceType = 'research';
    } else if (type === 'local') {
      serviceType = 'local';
    } else if (type === 'region') {
      serviceType = 'region';
    }
    const selectedValues = Array.from(this.selectedCheckboxes());

    try {
      selectedValues.forEach(value => {
        this.breakdownOptionsService.deleteOption(serviceType, value);
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
    return this.formatDisplayDate(new Date());
  }

  formatRowDate(dateValue?: string): string {
    return this.normalizeDisplayDate(dateValue);
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue?: string): number {
    if (!dateValue) {
      return 0;
    }

    const slashMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }

    const shortMonthMatch = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (shortMonthMatch) {
      const monthLookup: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const [, day, monthText, year] = shortMonthMatch;
      const month = monthLookup[monthText];
      if (month !== undefined) {
        return new Date(Number(year), month, Number(day)).getTime();
      }
    }

    const isoParsed = new Date(dateValue).getTime();
    if (!Number.isNaN(isoParsed)) {
      return isoParsed;
    }

    return 0;
  }

  private normalizeDisplayDate(dateValue?: string): string {
    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }

    return this.formatDisplayDate(new Date(timestamp));
  }

  /**
   * Get the label for a breakdown type
   */
  getBreakdownTypeLabel(type: BreakdownTypeKey): string {
    const option = this.breakdownTypeOptions.find(o => o.value === type);
    return option?.label || type;
  }
}




