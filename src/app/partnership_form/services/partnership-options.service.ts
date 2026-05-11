import { Injectable, effect, inject, signal } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';
import { DropdownsStoreService } from '../../settings/dropdowns/dropdowns-store.service';
import type { StoredDropdownOption } from '../../settings/dropdowns/dropdowns-store.service';

export interface PartnershipDropdownOption extends DropdownOption {
  status?: string;
  createdDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PartnershipOptionsService {
  private readonly dropdownStore = inject(DropdownsStoreService);
  private storageKey = 'rmc_partnership_category_options';
  private versionKey = 'rmc_partnership_category_options_version';
  private currentVersion = '1.1';
  private readonly partnershipFormName = 'Partnership Application';
  private readonly partnershipTypeCategory = 'Partnership Type';
  private readonly partnershipCategoryCategory = 'Partnership Category';

  private readonly defaultTypeOptions: DropdownOption[] = [
    { value: 'Academic', label: 'Academic' },
    { value: 'Industry', label: 'Industry' },
    { value: 'Both', label: 'Both' }
  ];

  private defaultCategoryOptions: PartnershipDropdownOption[] = [
    { value: 'University Strategic Partnership', label: 'University Strategic Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'Franchise Partnership', label: 'Franchise Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'Subject/Discipline Partnership', label: 'Subject/Discipline Partnership', status: 'Active', createdDate: '21/04/2026' },
    { value: 'School Partnership', label: 'School Partnership', status: 'Active', createdDate: '21/04/2026' }
  ];

  partnershipTypeOptions = signal<DropdownOption[]>([]);
  categoryOptions = signal<PartnershipDropdownOption[]>([]);

  constructor() {
    this.loadOptionsFromStorage();
    effect(() => {
      this.syncFromSettingsStore(this.dropdownStore.entries());
    });
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

  private syncFromSettingsStore(entries: StoredDropdownOption[]): void {
    const activeTypeOptions = entries
      .filter(option => option.formName === this.partnershipFormName && option.category === this.partnershipTypeCategory && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    const activeCategoryOptions = entries
      .filter(option => option.formName === this.partnershipFormName && option.category === this.partnershipCategoryCategory && option.status === 'Active')
      .map(option => ({
        value: option.value,
        label: option.value,
        status: option.status,
        createdDate: option.lastUpdated || undefined,
      }));

    this.partnershipTypeOptions.set(activeTypeOptions);
    this.categoryOptions.set(activeCategoryOptions);
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
