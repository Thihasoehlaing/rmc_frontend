import { Injectable, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';

export interface PartnershipDropdownOption extends DropdownOption {
  status?: string;
  createdDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PartnershipOptionsService {
  private storageKey = 'rmc_partnership_category_options';
  private versionKey = 'rmc_partnership_category_options_version';
  private currentVersion = '1.1';

  private defaultCategoryOptions: PartnershipDropdownOption[] = [
    { value: 'University Strategic Partnership', label: 'University Strategic Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'Franchise Partnership', label: 'Franchise Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'Subject/Discipline Partnership', label: 'Subject/Discipline Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'School Partnership', label: 'School Partnership', status: 'Active', createdDate: '21/04/2026' }
  ];

  categoryOptions = signal<PartnershipDropdownOption[]>([]);

  constructor() {
    this.loadOptionsFromStorage();
  }

  private loadOptionsFromStorage(): void {
    const storedVersion = localStorage.getItem(this.versionKey);

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
        this.categoryOptions.set(data.categoryOptions || this.defaultCategoryOptions);
      } catch (e) {
        console.error('Failed to parse stored partnership options', e);
        this.loadDefaults();
      }
    } else {
      this.loadDefaults();
    }
  }

  private loadDefaults(): void {
    this.categoryOptions.set([...this.defaultCategoryOptions]);
  }

  private saveToStorage(): void {
    const data = {
      categoryOptions: this.categoryOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  getOptions(): PartnershipDropdownOption[] {
    return this.categoryOptions();
  }

  addOption(option: PartnershipDropdownOption): void {
    const options = this.getOptions();
    if (options.some(opt => opt.value === option.value)) {
      throw new Error(`Option with value "${option.value}" already exists`);
    }
    const updatedOptions = [...options, option];
    this.updateOptions(updatedOptions);
  }

  updateOption(value: string, newOption: PartnershipDropdownOption): void {
    const options = this.getOptions();
    const index = options.findIndex(opt => opt.value === value);

    if (index === -1) {
      throw new Error(`Option with value "${value}" not found`);
    }

    if (newOption.value !== value && options.some(opt => opt.value === newOption.value)) {
      throw new Error(`Option with value "${newOption.value}" already exists`);
    }

    const updatedOptions = [...options];
    updatedOptions[index] = newOption;
    this.updateOptions(updatedOptions);
  }

  deleteOption(value: string): void {
    const options = this.getOptions();
    const updatedOptions = options.filter(opt => opt.value !== value);

    if (updatedOptions.length === options.length) {
      throw new Error(`Option with value "${value}" not found`);
    }

    this.updateOptions(updatedOptions);
  }

  private updateOptions(options: PartnershipDropdownOption[]): void {
    this.categoryOptions.set(options);
    this.saveToStorage();
  }

  resetToDefaults(): void {
    this.loadDefaults();
    this.saveToStorage();
  }
}
