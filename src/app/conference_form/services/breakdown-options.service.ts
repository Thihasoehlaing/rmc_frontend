import { Injectable, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';

@Injectable({
  providedIn: 'root'
})
export class BreakdownOptionsService {
  private storageKey = 'rmc_breakdown_options';

  // Default options
  private defaultResearchOptions: DropdownOption[] = [
    { value: 'airfare', label: 'Airfare' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'registration', label: 'Registration Fee' },
    { value: 'other', label: 'Other' }
  ];

  private defaultLocalOptions: DropdownOption[] = [
    { value: 'venue-transport', label: 'Venue & Transport' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'registration', label: 'Registration Fee' },
    { value: 'meals', label: 'Meals & Allowance' },
    { value: 'other', label: 'Other' }
  ];

  private defaultOverseasOptions: DropdownOption[] = [
    { value: 'airfare', label: 'Airfare' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'registration', label: 'Registration Fee' },
    { value: 'visa', label: 'Visa & Travel Insurance' },
    { value: 'other', label: 'Other' }
  ];

  // Signals for reactive updates
  researchOptions = signal<DropdownOption[]>([]);
  localOptions = signal<DropdownOption[]>([]);
  overseasOptions = signal<DropdownOption[]>([]);

  constructor() {
    this.loadOptionsFromStorage();
  }

  /**
   * Load options from localStorage, or use defaults if not found
   */
  private loadOptionsFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.researchOptions.set(data.researchOptions || this.defaultResearchOptions);
        this.localOptions.set(data.localOptions || this.defaultLocalOptions);
        this.overseasOptions.set(data.overseasOptions || this.defaultOverseasOptions);
      } catch (e) {
        console.error('Failed to parse stored breakdown options', e);
        this.loadDefaults();
      }
    } else {
      this.loadDefaults();
    }
  }

  /**
   * Load and set default options
   */
  private loadDefaults(): void {
    this.researchOptions.set([...this.defaultResearchOptions]);
    this.localOptions.set([...this.defaultLocalOptions]);
    this.overseasOptions.set([...this.defaultOverseasOptions]);
  }

  /**
   * Save current options to localStorage
   */
  private saveToStorage(): void {
    const data = {
      researchOptions: this.researchOptions(),
      localOptions: this.localOptions(),
      overseasOptions: this.overseasOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Get options for a specific breakdown type
   */
  getOptionsForType(type: 'research' | 'local' | 'overseas'): DropdownOption[] {
    switch (type) {
      case 'research':
        return this.researchOptions();
      case 'local':
        return this.localOptions();
      case 'overseas':
        return this.overseasOptions();
      default:
        return [];
    }
  }

  /**
   * Add a new option to a breakdown type
   */
  addOption(type: 'research' | 'local' | 'overseas', option: DropdownOption): void {
    const options = this.getOptionsForType(type);

    // Check if value already exists
    if (options.some(opt => opt.value === option.value)) {
      throw new Error(`Option with value "${option.value}" already exists`);
    }

    const updatedOptions = [...options, option];
    this.updateTypeOptions(type, updatedOptions);
  }

  /**
   * Update an existing option
   */
  updateOption(type: 'research' | 'local' | 'overseas', value: string, newOption: DropdownOption): void {
    const options = this.getOptionsForType(type);
    const index = options.findIndex(opt => opt.value === value);

    if (index === -1) {
      throw new Error(`Option with value "${value}" not found`);
    }

    // Check if new value conflicts with other options (if value changed)
    if (newOption.value !== value && options.some(opt => opt.value === newOption.value)) {
      throw new Error(`Option with value "${newOption.value}" already exists`);
    }

    const updatedOptions = [...options];
    updatedOptions[index] = newOption;
    this.updateTypeOptions(type, updatedOptions);
  }

  /**
   * Delete an option from a breakdown type
   */
  deleteOption(type: 'research' | 'local' | 'overseas', value: string): void {
    const options = this.getOptionsForType(type);
    const updatedOptions = options.filter(opt => opt.value !== value);

    if (updatedOptions.length === options.length) {
      throw new Error(`Option with value "${value}" not found`);
    }

    this.updateTypeOptions(type, updatedOptions);
  }

  /**
   * Update all options for a specific type
   */
  private updateTypeOptions(type: 'research' | 'local' | 'overseas', options: DropdownOption[]): void {
    if (type === 'research') {
      this.researchOptions.set(options);
    } else if (type === 'local') {
      this.localOptions.set(options);
    } else if (type === 'overseas') {
      this.overseasOptions.set(options);
    }
    this.saveToStorage();
  }

  /**
   * Reset all options to defaults
   */
  resetToDefaults(): void {
    this.loadDefaults();
    this.saveToStorage();
  }
}
