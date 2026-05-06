import { Injectable, signal, inject, effect } from '@angular/core';
import { DropdownOption } from '../../interfaces/components.interface';
import { DropdownsStoreService, StoredDropdownOption } from '../../settings/dropdowns/dropdowns-store.service';

export type JournalOptionType =
  | 'vote_number_description'
  | 'vote_number'
  | 'account_code_description'
  | 'account_code';

@Injectable({
  providedIn: 'root'
})
export class JournalOptionsService {
  private storageKey = 'rmc_journal_options';
  private versionKey = 'rmc_journal_options_version';
  private currentVersion = '2.0';
  private dropdownsStoreService = inject(DropdownsStoreService);
  private readonly formName = 'Journal Application';

  // Default options for Vote Number Description
  private defaultVoteNumberDescriptionOptions: DropdownOption[] = [
    { value: 'journal-vote-desc-1', label: 'VOTE NUMBER DESCRIPTION 01' },
    { value: 'journal-vote-desc-2', label: 'VOTE NUMBER DESCRIPTION 02' }
  ];

  // Default options for Vote Number
  private defaultVoteNumberOptions: DropdownOption[] = [
    { value: 'journal-vote-1', label: 'VOTE NUMBER 01' },
    { value: 'journal-vote-2', label: 'VOTE NUMBER 02' }
  ];

  // Default options for Account Code Description
  private defaultAccountCodeDescriptionOptions: DropdownOption[] = [
    { value: 'journal-account-desc-1', label: 'ACCOUNT CODE DESCRIPTION 01' },
    { value: 'journal-account-desc-2', label: 'ACCOUNT CODE DESCRIPTION 02' }
  ];

  // Default options for Account Code
  private defaultAccountCodeOptions: DropdownOption[] = [
    { value: 'journal-acc-1', label: 'ACCOUNT CODE A' },
    { value: 'journal-acc-2', label: 'ACCOUNT CODE B' }
  ];

  // Signals for reactive updates
  voteNumberDescriptionOptions = signal<DropdownOption[]>([]);
  voteNumberOptions = signal<DropdownOption[]>([]);
  accountCodeDescriptionOptions = signal<DropdownOption[]>([]);
  accountCodeOptions = signal<DropdownOption[]>([]);

  constructor() {
    this.voteNumberDescriptionOptions.set([]);
    this.voteNumberOptions.set([]);
    this.accountCodeDescriptionOptions.set([]);
    this.accountCodeOptions.set([]);

    // Sync with Admin Settings whenever dropdown entries are updated
    effect(() => {
      this.syncFromSettingsStore(this.dropdownsStoreService.entries());
    });
  }

  /**
   * Sync options from the Admin Settings dropdown store
   */
  private syncFromSettingsStore(entries: StoredDropdownOption[]): void {
    // Map category names from Admin Settings to our signals
    const voteDescOptions = entries
      .filter(option => option.formName === this.formName && option.category === 'Vote Number Description' && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    const voteNumOptions = entries
      .filter(option => option.formName === this.formName && option.category === 'Vote Number' && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    const accountDescOptions = entries
      .filter(option => option.formName === this.formName && option.category === 'Account Code Description' && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    const accountCodeOptions = entries
      .filter(option => option.formName === this.formName && option.category === 'Account Code' && option.status === 'Active')
      .map(option => ({ value: option.value, label: option.value }));

    this.voteNumberDescriptionOptions.set(voteDescOptions);
    this.voteNumberOptions.set(voteNumOptions);
    this.accountCodeDescriptionOptions.set(accountDescOptions);
    this.accountCodeOptions.set(accountCodeOptions);
  }

  /**
   * Re-read the latest persisted values from localStorage.
   */
  reloadFromStorage(): void {
    this.syncFromSettingsStore(this.dropdownsStoreService.entries());
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
      } catch {
        // Silently discard malformed data — fall back to defaults
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
    this.voteNumberDescriptionOptions.set([...this.defaultVoteNumberDescriptionOptions]);
    this.voteNumberOptions.set([...this.defaultVoteNumberOptions]);
    this.accountCodeDescriptionOptions.set([...this.defaultAccountCodeDescriptionOptions]);
    this.accountCodeOptions.set([...this.defaultAccountCodeOptions]);
  }

  /**
   * Save current options to localStorage
   */
  private saveToStorage(): void {
    const data = {
      voteNumberDescriptionOptions: this.voteNumberDescriptionOptions(),
      voteNumberOptions: this.voteNumberOptions(),
      accountCodeDescriptionOptions: this.accountCodeDescriptionOptions(),
      accountCodeOptions: this.accountCodeOptions()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Get options for a specific breakdown type
   * Options are kept in sync with Admin Settings via the effect
   */
  getOptionsForType(type: JournalOptionType): DropdownOption[] {
    switch (type) {
      case 'vote_number_description':
        return this.voteNumberDescriptionOptions();
      case 'vote_number':
        return this.voteNumberOptions();
      case 'account_code_description':
        return this.accountCodeDescriptionOptions();
      case 'account_code':
        return this.accountCodeOptions();
      default:
        return [];
    }
  }

  /**
   * Add a new option to a breakdown type
   */
  addOption(type: JournalOptionType, option: DropdownOption): void {
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
  updateOption(type: JournalOptionType, value: string, newOption: DropdownOption): void {
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
  deleteOption(type: JournalOptionType, value: string): void {
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
  private updateTypeOptions(type: JournalOptionType, options: DropdownOption[]): void {
    if (type === 'vote_number_description') {
      this.voteNumberDescriptionOptions.set(options);
    } else if (type === 'vote_number') {
      this.voteNumberOptions.set(options);
    } else if (type === 'account_code_description') {
      this.accountCodeDescriptionOptions.set(options);
    } else if (type === 'account_code') {
      this.accountCodeOptions.set(options);
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
