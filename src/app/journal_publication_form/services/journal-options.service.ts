import { Injectable, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';      

@Injectable({
  providedIn: 'root'
})
export class JournalOptionsService {
  private storageKey = 'rmc_journal_options';
  private versionKey = 'rmc_journal_options_version';
  private currentVersion = '1.0';

  // Default options for Vote Number (mapped internally as 'research' to match common struct)
  private defaultResearchOptions: DropdownOption[] = [
    { value: 'journal-vote-1', label: 'VOTE NUMBER 01' },
    { value: 'journal-vote-2', label: 'VOTE NUMBER 02' }
  ];

  // Default options for Account Code (mapped internally as 'local')
  private defaultLocalOptions: DropdownOption[] = [
    { value: 'journal-acc-1', label: 'ACCOUNT CODE A' },
    { value: 'journal-acc-2', label: 'ACCOUNT CODE B' }
  ];

  // Signals for reactive updates
  researchOptions = signal<DropdownOption[]>([]);
  localOptions = signal<DropdownOption[]>([]);

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
        this.localOptions.set(data.localOptions || this.defaultLocalOptions);   
      } catch (e) {
        console.error('Failed to parse stored journal options', e);
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
  }

  /**
   * Save current options to localStorage
   */
  private saveToStorage(): void {
    const data = {
      researchOptions: this.researchOptions(),
      localOptions: this.localOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Get options for a specific breakdown type
   */
  getOptionsForType(type: 'research' | 'local'): DropdownOption[] {
    switch (type) {
      case 'research':
        return this.researchOptions();
      case 'local':
        return this.localOptions();
      default:
        return [];
    }
  }

  /**
   * Add a new option to a breakdown type
   */
  addOption(type: 'research' | 'local', option: DropdownOption): void {
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
  updateOption(type: 'research' | 'local', value: string, newOption: DropdownOption): void {
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
  deleteOption(type: 'research' | 'local', value: string): void {
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
  private updateTypeOptions(type: 'research' | 'local', options: DropdownOption[]): void {
    if (type === 'research') {
      this.researchOptions.set(options);
    } else if (type === 'local') {
      this.localOptions.set(options);
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
