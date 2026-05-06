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
        lastUpdated: item.lastUpdated ?? '',
        createdBy: item.createdBy ?? '',
        status: item.status === 'Inactive' ? 'Inactive' : 'Active',
      })));
    } catch (error) {
      console.error('Failed to load dropdown options from storage', error);
      this.entriesSignal.set([]);
    }
  }

  private formatDisplayDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
}
