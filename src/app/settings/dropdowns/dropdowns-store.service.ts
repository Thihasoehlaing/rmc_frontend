import { Injectable, signal } from '@angular/core';

export interface StoredDropdownOption {
  id: number;
  formName: string;
  category: string;
  value: string;
  lastUpdated: string;
  createdBy: string;
  status: 'Active' | 'Inactive';
}

@Injectable({
  providedIn: 'root'
})
export class DropdownsStoreService {
  private readonly storageKey = 'rmc_dropdowns_data';
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
      this.entriesSignal.set(parsed.map(item => ({
        id: item.id ?? 0,
        formName: item.formName ?? '',
        category: item.category ?? '',
        value: item.value ?? '',
        lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
        createdBy: item.createdBy ?? '',
        status: item.status === 'Inactive' ? 'Inactive' : 'Active',
      })));
    } catch (error) {
      console.error('Failed to load dropdown options from storage', error);
      this.entriesSignal.set([]);
    }
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
