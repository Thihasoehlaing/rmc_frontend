import { Injectable, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';

@Injectable({
  providedIn: 'root'
})
export class BreakdownOptionsService {
  private storageKey = 'rmc_breakdown_options';
  private versionKey = 'rmc_breakdown_options_version';
  private currentVersion = '2.0'; // Version bump to force migration

  // Default options
  private defaultResearchOptions: DropdownOption[] = [
    { value: 'conference-fee', label: 'PROFESSIONNAL SERVICES - CONFERNECE FEE' },
    { value: 'travelling-transportation', label: 'TRAVELLING & TRANSPORTATION' }
  ];

  private defaultExternalOptions: DropdownOption[] = [
    { value: 'conference-fee', label: 'PROFESSIONNAL SERVICES - CONFERNECE FEE' },
    { value: 'travelling-transportation', label: 'TRAVELLING & TRANSPORTATION' }
  ];

  private defaultLocalOptions: DropdownOption[] = [
    { value: 'airfare-local', label: 'AIRFARE LOCAL' },
    { value: 'hotel-lodging-local', label: 'HOTEL & LODGING LOCAL' },
    { value: 'meals-subsistence-local', label: 'MEALS & SUBSISTANCE LOCAL' },
    { value: 'mileage-fares-local', label: 'MILEAGE FARES PARKING LOCAL' },
    { value: 'staff-welfare', label: 'STAFF WELFARE AND REFRESHMENT' },
    { value: 'telephone-fax', label: 'TELEPHONE AND FAX' },
    { value: 'training-presentation', label: 'TRAINING PRESENTATION PUBLICATION' }
  ];

  private defaultOverseasOptions: DropdownOption[] = [
    { value: 'airfare-foreign', label: 'AIRFARE FOREIGN' },
    { value: 'hotel-lodging-foreign', label: 'HOTEL & LODGING FOREIGN' },
    { value: 'meals-subsistence-foreign', label: 'MEALS & SUBSISTANCE FOREIGN' },
    { value: 'mileage-fares-foreign', label: 'MILEAGE FARES PARKING FOREIGN' },
    { value: 'staff-welfare', label: 'STAFF WELFARE AND REFRESHMENT' },
    { value: 'telephone-fax', label: 'TELEPHONE AND FAX' },
    { value: 'training-presentation', label: 'TRAINING PRESENTATION PUBLICATION' }
  ];

  // Signals for reactive updates
  researchOptions = signal<DropdownOption[]>([]);
  externalOptions = signal<DropdownOption[]>([]);
  localOptions = signal<DropdownOption[]>([]);
  overseasOptions = signal<DropdownOption[]>([]);

  constructor() {
    this.loadOptionsFromStorage();
  }

  /**
   * Load options from localStorage, or use defaults if not found or version mismatch
   */
  private loadOptionsFromStorage(): void {
    const storedVersion = localStorage.getItem(this.versionKey);

    // If version doesn't match, reset to defaults (migration)
    if (storedVersion !== this.currentVersion) {
      this.loadDefaults();
      localStorage.setItem(this.versionKey, this.currentVersion);
      this.saveToStorage();
      return;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.researchOptions.set(data.researchOptions || this.defaultResearchOptions);
        this.externalOptions.set(data.externalOptions || this.defaultExternalOptions);
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
    this.externalOptions.set([...this.defaultExternalOptions]);
    this.localOptions.set([...this.defaultLocalOptions]);
    this.overseasOptions.set([...this.defaultOverseasOptions]);
  }

  /**
   * Save current options to localStorage
   */
  private saveToStorage(): void {
    const data = {
      researchOptions: this.researchOptions(),
      externalOptions: this.externalOptions(),
      localOptions: this.localOptions(),
      overseasOptions: this.overseasOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Get options for a specific breakdown type
   */
  getOptionsForType(type: 'research' | 'external-research' | 'local' | 'overseas'): DropdownOption[] {
    switch (type) {
      case 'research':
        return this.researchOptions();
      case 'external-research':
        return this.externalOptions();
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
  addOption(type: 'research' | 'external-research' | 'local' | 'overseas', option: DropdownOption): void {
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
  updateOption(type: 'research' | 'external-research' | 'local' | 'overseas', value: string, newOption: DropdownOption): void {
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
  deleteOption(type: 'research' | 'external-research' | 'local' | 'overseas', value: string): void {
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
  private updateTypeOptions(type: 'research' | 'external-research' | 'local' | 'overseas', options: DropdownOption[]): void {
    if (type === 'research') {
      this.researchOptions.set(options);
    } else if (type === 'external-research') {
      this.externalOptions.set(options);
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
