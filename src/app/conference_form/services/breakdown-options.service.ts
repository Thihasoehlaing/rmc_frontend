import { Injectable, effect, inject, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';
import { DropdownsStoreService } from '../../settings/dropdowns/dropdowns-store.service';
import type { StoredDropdownOption } from '../../settings/dropdowns/dropdowns-store.service';

@Injectable({
  providedIn: 'root'
})
export class BreakdownOptionsService {
  private readonly dropdownStore = inject(DropdownsStoreService);
  private storageKey = 'rmc_breakdown_options';
  private versionKey = 'rmc_breakdown_options_version';
  private currentVersion = '3.0'; // Version bump to include regions
  private readonly conferenceFormName = 'Conference Application';
  private readonly itemDescriptionCategory = 'Select Item Description';
  private readonly regionCategory = 'Select Region';

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

  private defaultRegionOptions: DropdownOption[] = [
    { value: 'americas', label: 'Americas' },
    { value: 'asean', label: 'ASEAN' },
    { value: 'asia', label: 'Asia' },
    { value: 'australasia', label: 'Australasia' },
    { value: 'europe', label: 'Europe' },
    { value: 'malaysia', label: 'Malaysia' },
    { value: 'mea', label: 'Middle East and Africa' },
    { value: 'pacific', label: 'Pacific Islands' }
  ];

  // Signals for reactive updates
  researchOptions = signal<DropdownOption[]>([]);
  externalOptions = signal<DropdownOption[]>([]);
  localOptions = signal<DropdownOption[]>([]);
  regionOptions = signal<DropdownOption[]>([]);

  constructor() {
    this.loadOptionsFromStorage();
    effect(() => {
      this.syncFromSettingsStore(this.dropdownStore.entries());
    });
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
        this.regionOptions.set(data.regionOptions || this.defaultRegionOptions);
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
    this.regionOptions.set([...this.defaultRegionOptions]);
  }

  private syncFromSettingsStore(entries: StoredDropdownOption[]): void {
    this.loadOptionsFromStorage();

    const sharedItemDescriptionOptions = entries
      .filter(option => option.formName === this.conferenceFormName && option.category === this.itemDescriptionCategory && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    const sharedRegionOptions = entries
      .filter(option => option.formName === this.conferenceFormName && option.category === this.regionCategory && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    if (sharedItemDescriptionOptions.length > 0) {
      this.researchOptions.set(sharedItemDescriptionOptions);
      this.externalOptions.set(sharedItemDescriptionOptions);
      this.localOptions.set(sharedItemDescriptionOptions);
    }

    if (sharedRegionOptions.length > 0) {
      this.regionOptions.set(sharedRegionOptions);
    }
  }

  /**
   * Save current options to localStorage
   */
  private saveToStorage(): void {
    const data = {
      researchOptions: this.researchOptions(),
      externalOptions: this.externalOptions(),
      localOptions: this.localOptions(),
      regionOptions: this.regionOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Get options for a specific breakdown type
   */
  getOptionsForType(type: 'research' | 'external-research' | 'local' | 'region'): DropdownOption[] {
    switch (type) {
      case 'research':
        return this.researchOptions();
      case 'external-research':
        return this.externalOptions();
      case 'local':
        return this.localOptions();
      case 'region':
        return this.regionOptions();
      default:
        return [];
    }
  }

  /**
   * Add a new option to a breakdown type
   */
  addOption(type: 'research' | 'external-research' | 'local' | 'region', option: DropdownOption): void {
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
  updateOption(type: 'research' | 'external-research' | 'local' | 'region', value: string, newOption: DropdownOption): void {
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
  deleteOption(type: 'research' | 'external-research' | 'local' | 'region', value: string): void {
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
  private updateTypeOptions(type: 'research' | 'external-research' | 'local' | 'region', options: DropdownOption[]): void {
    if (type === 'research') {
      this.researchOptions.set(options);
    } else if (type === 'external-research') {
      this.externalOptions.set(options);
    } else if (type === 'local') {
      this.localOptions.set(options);
    } else if (type === 'region') {
      this.regionOptions.set(options);
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
