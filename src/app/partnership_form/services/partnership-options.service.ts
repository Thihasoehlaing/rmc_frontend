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
        const storedOptions = (data.categoryOptions || this.defaultCategoryOptions) as PartnershipDropdownOption[];
        this.categoryOptions.set(storedOptions.map(option => ({
          ...option,
          createdDate: this.normalizeDisplayDate(option.createdDate),
        })));
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
        createdDate: this.normalizeDisplayDate(option.lastUpdated),
      }));

    this.partnershipTypeOptions.set(activeTypeOptions);
    this.categoryOptions.set(activeCategoryOptions);
  }

  private loadDefaults(): void {
    this.categoryOptions.set(this.defaultCategoryOptions.map(option => ({
      ...option,
      createdDate: this.normalizeDisplayDate(option.createdDate),
    })));
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
    this.categoryOptions.set(options.map(option => ({
      ...option,
      createdDate: this.normalizeDisplayDate(option.createdDate),
    })));
    this.saveToStorage();
  }

  resetToDefaults(): void {
    this.loadDefaults();
    this.saveToStorage();
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
}
