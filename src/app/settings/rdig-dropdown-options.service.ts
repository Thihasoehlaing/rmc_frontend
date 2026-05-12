import { Injectable, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map, catchError } from 'rxjs';
import { DropdownsStoreService } from './dropdowns/dropdowns-store.service';
import type { StoredDropdownOption } from './dropdowns/dropdowns-store.service';

/**
 * Server-side dropdown record returned from the settings API.
 * Named DropdownOptionEntityEntity to distinguish it from the UI-facing
 * DropdownOptionEntity<T> in shared/interfaces/components.interface.ts.
 */
export interface DropdownOptionEntityEntity {
  id: number;
  optionName: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  parentDomainId?: number; // Only for sub-research domain
}

export type DropdownCategoryKey =
  | 'research_cluster'
  | 'type_of_organisation'
  | 'research_domain'
  | 'sub_research_domain'
  | 'esg_factors'
  | 'sdg_alignment';

export const CATEGORY_LABELS: Record<DropdownCategoryKey, string> = {
  research_cluster: 'Research Cluster',
  type_of_organisation: 'Type of Organisation',
  research_domain: 'Research Domain',
  sub_research_domain: 'Sub-Research Domain',
  esg_factors: 'ESG',
  sdg_alignment: 'SDG',
};

@Injectable({
  providedIn: 'root'
})
export class RdigDropdownOptionsService {
  private readonly dropdownStore = inject(DropdownsStoreService);
  private readonly formName = 'RDIG Application';
  private store = new BehaviorSubject<Record<DropdownCategoryKey, DropdownOptionEntityEntity[]>>({
    research_cluster: [],
    type_of_organisation: [],
    research_domain: [],
    sub_research_domain: [],
    esg_factors: [],
    sdg_alignment: [],
  });
  private baseState: Record<DropdownCategoryKey, DropdownOptionEntityEntity[]> = {
    research_cluster: [],
    type_of_organisation: [],
    research_domain: [],
    sub_research_domain: [],
    esg_factors: [],
    sdg_alignment: [],
  };
  private loaded = new Set<DropdownCategoryKey>();
  store$ = this.store.asObservable();

  constructor(private http: HttpClient) {
    effect(() => {
      this.syncFromSettingsStore(this.dropdownStore.entries());
    });
  }

  loadOptions(category: DropdownCategoryKey): Observable<DropdownOptionEntityEntity[]> {
    if (this.loaded.has(category)) {
      return of(this.store.getValue()[category]);
    }

    return this.http.get<Array<{ id: number; value: string; isActive: boolean; parentDomainId?: number }>>(`assets/dropdown-options/${category}.json`).pipe(
      map(rows => rows.map(row => ({
        id: row.id,
        optionName: row.value,
        status: row.isActive ? ('Active' as const) : ('Inactive' as const),
        createdDate: this.formatDisplayDate(new Date()),
        parentDomainId: row.parentDomainId,
      }))),
      tap(options => {
        this.loaded.add(category);
        this.baseState = { ...this.baseState, [category]: options };
        this.store.next({ ...this.store.getValue(), [category]: options });
        this.syncFromSettingsStore(this.dropdownStore.entries());
      }),
      catchError(err => {
        console.error(`Failed to load ${category}`, err);
        this.loaded.add(category);
        return of([]);
      })
    );
  }

  getOptions(category: DropdownCategoryKey): Observable<DropdownOptionEntityEntity[]> {
    return this.store$.pipe(map(state => state[category]));
  }

  getOptionsSnapshot(category: DropdownCategoryKey): DropdownOptionEntityEntity[] {
    return this.store.getValue()[category];
  }

  private syncFromSettingsStore(entries: StoredDropdownOption[]): void {
    const categoryMappings: Array<{ category: DropdownCategoryKey; formName: string; categoryName: string }> = [
      { category: 'research_cluster', formName: this.formName, categoryName: 'Research Cluster' },
      { category: 'type_of_organisation', formName: this.formName, categoryName: 'Type of Organisation' },
      { category: 'research_domain', formName: this.formName, categoryName: 'Research Domain' },
      { category: 'sub_research_domain', formName: this.formName, categoryName: 'Sub-Research Domain' },
      { category: 'esg_factors', formName: this.formName, categoryName: 'ESG Factors' },
      { category: 'sdg_alignment', formName: this.formName, categoryName: 'SDG Alignment' },
    ];

    let nextState = { ...this.baseState };
    let hasOverrides = false;

    for (const mapping of categoryMappings) {
      const sharedEntries = entries.filter(option =>
        option.formName === mapping.formName &&
        option.category === mapping.categoryName
      );

      if (sharedEntries.length === 0) {
        continue;
      }

      hasOverrides = true;
      nextState = {
        ...nextState,
        [mapping.category]: sharedEntries.map(entry => ({
          id: entry.id,
          optionName: entry.value,
          status: entry.status,
          createdDate: this.normalizeDisplayDate(entry.lastUpdated),
        })),
      };
    }

    if (hasOverrides) {
      this.store.next(nextState);
    } else {
      this.store.next(nextState);
    }
  }

  addOption(category: DropdownCategoryKey, option: Pick<DropdownOptionEntityEntity, 'optionName' | 'status' | 'parentDomainId'>): void {
    const currentState = this.store.getValue();
    const options = currentState[category];
    const newId = options.length > 0 ? Math.max(...options.map(o => o.id)) + 1 : 1;
    const newOption: DropdownOptionEntityEntity = {
      id: newId,
      optionName: option.optionName,
      status: option.status,
      createdDate: this.formatDisplayDate(new Date()),
      parentDomainId: option.parentDomainId,
    };

    const updatedOptions = [...options, newOption];
    this.store.next({ ...currentState, [category]: updatedOptions });
    this.persistCategory(category, updatedOptions);
  }

  updateOption(category: DropdownCategoryKey, updatedOption: DropdownOptionEntityEntity): void {
    const currentState = this.store.getValue();
    const options = currentState[category];
    const updatedOptions = options.map(o => o.id === updatedOption.id ? { ...o, ...updatedOption } : o);

    this.store.next({ ...currentState, [category]: updatedOptions });
    this.persistCategory(category, updatedOptions);
  }

  deleteOptions(category: DropdownCategoryKey, ids: number[]): void {
    if (!ids.length) return;
    const currentState = this.store.getValue();
    const next = currentState[category].filter(item => !ids.includes(item.id));
    this.store.next({ ...currentState, [category]: next });
    this.persistCategory(category, next);
  }

  toggleStatus(category: DropdownCategoryKey, id: number): void {
    const currentState = this.store.getValue();
    const next: DropdownOptionEntityEntity[] = currentState[category].map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        status: item.status === 'Active' ? 'Inactive' : 'Active',
      };
    });
    this.store.next({ ...currentState, [category]: next });
    this.persistCategory(category, next);
  }

  private persistCategory(category: DropdownCategoryKey, options: DropdownOptionEntityEntity[]): void {
    const storedOptions: Array<Omit<StoredDropdownOption, 'formName' | 'category'>> = options.map<Omit<StoredDropdownOption, 'formName' | 'category'>>(option => ({
      id: option.id,
      value: option.optionName,
      lastUpdated: this.normalizeDisplayDate(option.createdDate),
      createdBy: 'Admin',
      status: option.status,
    }));

    this.dropdownStore.replaceCategoryOptions(
      this.formName,
      CATEGORY_LABELS[category],
      storedOptions,
    );
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue: string): number {
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
    if (!dateValue) {
      return this.formatDisplayDate(new Date());
    }

    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }

    return this.formatDisplayDate(new Date(timestamp));
  }
}

