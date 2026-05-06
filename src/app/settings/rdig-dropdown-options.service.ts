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
        createdDate: new Date().toISOString(),
        parentDomainId: row.parentDomainId,
      }))),
      tap(options => {
        this.loaded.add(category);
        this.baseState = { ...this.baseState, [category]: options };
        this.store.next({ ...this.store.getValue(), [category]: options });
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
      { category: 'research_cluster', formName: 'RDIG Application', categoryName: 'Research Cluster' },
      { category: 'type_of_organisation', formName: 'RDIG Application', categoryName: 'Type of Organisation' },
      { category: 'research_domain', formName: 'RDIG Application', categoryName: 'Research Domain' },
      { category: 'sub_research_domain', formName: 'RDIG Application', categoryName: 'Sub-Research Domain' },
      { category: 'esg_factors', formName: 'RDIG Application', categoryName: 'ESG Factors' },
      { category: 'sdg_alignment', formName: 'RDIG Application', categoryName: 'SDG Alignment' },
    ];

    let nextState = { ...this.baseState };
    let hasOverrides = false;

    for (const mapping of categoryMappings) {
      const sharedEntries = entries.filter(option =>
        option.formName === mapping.formName &&
        option.category === mapping.categoryName &&
        option.status === 'Active'
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
          createdDate: entry.lastUpdated,
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
      createdDate: new Date().toISOString(),
      parentDomainId: option.parentDomainId,
    };

    const updatedOptions = [...options, newOption];
    this.store.next({ ...currentState, [category]: updatedOptions });
  }

  updateOption(category: DropdownCategoryKey, updatedOption: DropdownOptionEntityEntity): void {
    const currentState = this.store.getValue();
    const options = currentState[category];
    const updatedOptions = options.map(o => o.id === updatedOption.id ? { ...o, ...updatedOption } : o);

    this.store.next({ ...currentState, [category]: updatedOptions });
  }

  deleteOptions(category: DropdownCategoryKey, ids: number[]): void {
    if (!ids.length) return;
    const currentState = this.store.getValue();
    const next = currentState[category].filter(item => !ids.includes(item.id));
    this.store.next({ ...currentState, [category]: next });
  }

  toggleStatus(category: DropdownCategoryKey, id: number): void {
    const currentState = this.store.getValue();
    const next = currentState[category].map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        status: item.status === 'Active' ? 'Inactive' : 'Active',
      };
    });
    this.store.next({ ...currentState, [category]: next });
  }
}

