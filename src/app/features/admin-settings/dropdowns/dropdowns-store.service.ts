import { Injectable, signal } from '@angular/core';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';

export interface StoredDropdownOption {
  id: number;
  formName: string;
  category: string;
  value: string;
  lastUpdated: string;
  createdBy: string;
  status: 'Active' | 'Inactive';
}

interface ProjectAccountCodeSeedOption {
  value: string;
  accountCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class DropdownsStoreService {
  private readonly storageKey = 'rmc_dropdowns_data';
  private readonly projectAccountCodeSeedKey = 'rmc_project_account_code_seed_v3';
  private readonly journalItemDescriptionSeedKey = 'rmc_journal_item_description_seed_v1';
  private readonly journalAccountCodeDescriptionSeedKey = 'rmc_journal_account_code_description_seed_v1';
  private readonly updateEventName = 'rmc-dropdowns-updated';
  private readonly entriesSignal = signal<StoredDropdownOption[]>([]);

  readonly entries = this.entriesSignal.asReadonly();

  constructor() {
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener(this.updateEventName, this.handleExternalUpdate);
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  getOptions(formName: string, category: string): StoredDropdownOption[] {
    return this.entries().filter(option => option.formName === formName && option.category === category);
  }

  getConfiguredNumber(formName: string, category: string, optionName: string | null | undefined): string {
    if (!optionName || typeof localStorage === 'undefined') {
      return '';
    }

    const trimmed = optionName.trim();
    const normalized = trimmed.toLowerCase();
    const slug = normalized.replace(/\s+/g, '-');
    const formSlug = formName.trim().toLowerCase().replace(/\s+/g, '-');
    const categorySlug = category.trim().toLowerCase().replace(/\s+/g, '-');
    const keys = [
      `option-metadata-account-code-${formSlug}-${categorySlug}-${trimmed}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${normalized}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${slug}`,
    ];

    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        const metadata = JSON.parse(stored) as { accountNumber?: string };
        return metadata.accountNumber?.trim() ?? '';
      } catch {
        return '';
      }
    }

    return '';
  }

  hasOptions(formName: string, category: string): boolean {
    return this.getOptions(formName, category).length > 0;
  }

  refresh(): void {
    this.loadFromStorage();
  }

  notifyUpdated(): void {
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(this.updateEventName));
    }
  }

  replaceCategoryOptions(
    formName: string,
    category: string,
    options: Array<Omit<StoredDropdownOption, 'formName' | 'category'>>,
  ): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const currentEntries = [...this.entries()];
    const remainingEntries = currentEntries.filter(entry => entry.formName !== formName || entry.category !== category);

    const replacementEntries = options.map<StoredDropdownOption>(option => ({
      id: option.id,
      formName,
      category,
      value: option.value.trim(),
      lastUpdated: this.normalizeDisplayDate(option.lastUpdated),
      createdBy: option.createdBy,
      status: option.status === 'Inactive' ? 'Inactive' : 'Active',
    }));

    const nextEntries: StoredDropdownOption[] = [
      ...remainingEntries,
      ...replacementEntries,
    ];

    localStorage.setItem(this.storageKey, JSON.stringify(nextEntries));
    this.entriesSignal.set(nextEntries);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(this.updateEventName));
    }
  }

  upsertOptions(formName: string, category: string, values: string[], createdBy: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const sanitizedValues = values
      .map(value => value.trim())
      .filter(value => value.length > 0);

    if (sanitizedValues.length === 0) {
      return;
    }

    const now = this.formatDisplayDate(new Date());
    const currentEntries = [...this.entries()];
    const existingKeys = new Set(
      currentEntries.map(entry => `${entry.formName}|${entry.category}|${entry.value.toLowerCase()}`)
    );

    let nextId = currentEntries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0);
    let hasChanges = false;

    for (const value of sanitizedValues) {
      const lookupKey = `${formName}|${category}|${value.toLowerCase()}`;
      if (existingKeys.has(lookupKey)) {
        continue;
      }

      nextId += 1;
      currentEntries.push({
        id: nextId,
        formName,
        category,
        value,
        lastUpdated: now,
        createdBy,
        status: 'Active'
      });
      existingKeys.add(lookupKey);
      hasChanges = true;
    }

    if (!hasChanges) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(currentEntries));
    this.entriesSignal.set(currentEntries);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(this.updateEventName));
    }
  }

  private handleExternalUpdate = (): void => {
    this.loadFromStorage();
  };

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === this.storageKey) {
      this.loadFromStorage();
    }
  };

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.entriesSignal.set([]);
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        this.entriesSignal.set([]);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StoredDropdownOption>[];
      const entries: StoredDropdownOption[] = parsed.map(item => ({
        id: item.id ?? 0,
        formName: item.formName ?? '',
        category: item.category ?? '',
        value: item.value ?? '',
        lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
        createdBy: item.createdBy ?? '',
        status: item.status === 'Inactive' ? 'Inactive' : 'Active',
      }));

      const migratedEntries = this.seedJournalAccountCodeDescriptions(
        this.seedJournalItemDescriptions(
          this.seedProjectAccountCodes(entries)
        )
      );
      this.entriesSignal.set(migratedEntries);
    } catch (error) {
      console.error('Failed to load dropdown options from storage', error);
      this.entriesSignal.set([]);
    }
  }

  private seedProjectAccountCodes(entries: StoredDropdownOption[]): StoredDropdownOption[] {
    const testCodes: ProjectAccountCodeSeedOption[] = [
      // Research grant accounts
      { value: 'V28000', accountCode: '6203/001' },
      { value: 'V28100', accountCode: '6203/002' },
      { value: 'V28200', accountCode: '6203/003' },
      { value: 'V28300', accountCode: '6203/004' },
      { value: 'V28400', accountCode: '6203/005' },
      { value: 'V28500', accountCode: '6203/006' },
      { value: 'V28600', accountCode: '6203/007' },
      { value: 'V28700', accountCode: '6203/008' },
      { value: 'V28800', accountCode: '6203/009' },
      { value: 'V28900', accountCode: '6203/010' },
      // Publication support accounts
      { value: 'V29000', accountCode: '6203/100' },
      { value: 'V29100', accountCode: '6203/200' },
      { value: 'V29200', accountCode: '6203/300' },
      { value: 'V29300', accountCode: '6203/400' },
      { value: 'V29400', accountCode: '6203/500' },
      { value: 'V29500', accountCode: '6203/600' },
      { value: 'V29600', accountCode: '6203/700' },
      { value: 'V29700', accountCode: '6203/800' },
      { value: 'V29800', accountCode: '6203/900' },
      { value: 'V29900', accountCode: '6203/1000' },
      // Higher-tier accounts
      { value: 'V30000', accountCode: '6203/1100' },
      { value: 'V30100', accountCode: '6203/1200' },
    ];
    const formNames = ['Conference Application', 'Journal Application'];
    const nextEntries = [...entries];
    let nextId = nextEntries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;
    const now = this.formatDisplayDate(new Date());
    let hasChanges = false;

    for (const code of testCodes) {
      for (const formName of formNames) {
        const exists = nextEntries.some(entry =>
          entry.formName === formName &&
          entry.category === 'Project Account Code' &&
          entry.value.toLowerCase() === code.value.toLowerCase()
        );

        if (!exists) {
          nextEntries.push({
            id: nextId++,
            formName,
            category: 'Project Account Code',
            value: code.value,
            lastUpdated: now,
            createdBy: 'System Seed',
            status: 'Active'
          });
          hasChanges = true;
        }

        hasChanges = this.seedProjectAccountCodeMetadata(formName, code) || hasChanges;
      }
    }

    if (hasChanges || !localStorage.getItem(this.projectAccountCodeSeedKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(nextEntries));
      localStorage.setItem(this.projectAccountCodeSeedKey, '1');
    }

    return nextEntries;
  }

  private seedProjectAccountCodeMetadata(formName: string, option: ProjectAccountCodeSeedOption): boolean {
    const metadata = {
      createdDate: this.formatDisplayDate(new Date()),
      status: 'Active',
      accountNumber: option.accountCode,
    };

    const keys = this.getAccountCodeMetadataStorageKeys(option.value, formName, 'Project Account Code');
    const hasExistingMetadata = keys.some(key => !!localStorage.getItem(key));
    if (hasExistingMetadata) {
      return false;
    }

    for (const key of keys) {
      localStorage.setItem(key, JSON.stringify(metadata));
    }

    return true;
  }

  private seedJournalItemDescriptions(entries: StoredDropdownOption[]): StoredDropdownOption[] {
    if (localStorage.getItem(this.journalItemDescriptionSeedKey)) {
      return entries;
    }

    const testDescriptions = [
      'Article Processing Charge',
      'Publication Fee',
      'Language Editing and Proofreading'
    ];
    const nextEntries = [...entries];
    let nextId = nextEntries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;
    const now = this.formatDisplayDate(new Date());

    for (const description of testDescriptions) {
      const exists = nextEntries.some(entry =>
        entry.formName === 'Journal Application' &&
        entry.category === 'Vote Number Description' &&
        entry.value.toLowerCase() === description.toLowerCase()
      );

      if (!exists) {
        nextEntries.push({
          id: nextId++,
          formName: 'Journal Application',
          category: 'Vote Number Description',
          value: description,
          lastUpdated: now,
          createdBy: 'System Seed',
          status: 'Active'
        });
      }
    }

    localStorage.setItem(this.storageKey, JSON.stringify(nextEntries));
    localStorage.setItem(this.journalItemDescriptionSeedKey, '1');
    return nextEntries;
  }

  private seedJournalAccountCodeDescriptions(entries: StoredDropdownOption[]): StoredDropdownOption[] {
    if (localStorage.getItem(this.journalAccountCodeDescriptionSeedKey)) {
      return entries;
    }

    const testDescriptions = [
      'Professional Services',
      'Research Materials and Supplies',
      'Printing and Publication'
    ];
    const nextEntries = [...entries];
    let nextId = nextEntries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;
    const now = this.formatDisplayDate(new Date());

    for (const description of testDescriptions) {
      const exists = nextEntries.some(entry =>
        entry.formName === 'Journal Application' &&
        entry.category === 'Account Code Description' &&
        entry.value.toLowerCase() === description.toLowerCase()
      );

      if (!exists) {
        nextEntries.push({
          id: nextId++,
          formName: 'Journal Application',
          category: 'Account Code Description',
          value: description,
          lastUpdated: now,
          createdBy: 'System Seed',
          status: 'Active'
        });
      }
    }

    localStorage.setItem(this.storageKey, JSON.stringify(nextEntries));
    localStorage.setItem(this.journalAccountCodeDescriptionSeedKey, '1');
    return nextEntries;
  }

  private formatDisplayDate(date: Date): string {
    return formatDisplayDate(date);
  }

  private parseDisplayDate(dateValue?: string): number {
    if (!dateValue) {
      return 0;
    }

    const numericMatch = dateValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (numericMatch) {
      const [, day, month, year] = numericMatch;
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

  private getAccountCodeMetadataStorageKeys(optionName: string, formName: string, category: string): string[] {
    const trimmed = optionName.trim();
    const normalized = trimmed.toLowerCase();
    const slug = normalized.replace(/\s+/g, '-');
    const formSlug = formName.trim().toLowerCase().replace(/\s+/g, '-');
    const categorySlug = category.trim().toLowerCase().replace(/\s+/g, '-');

    return Array.from(new Set([
      `option-metadata-account-code-${formSlug}-${categorySlug}-${trimmed}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${normalized}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${slug}`,
    ]));
  }
}
