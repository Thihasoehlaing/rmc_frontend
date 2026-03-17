import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map, catchError } from 'rxjs';

export interface DropdownOption {
  id: number;
  optionName: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  parentDomainId?: number; // Only for sub-research domain
}

export type DropdownCategoryKey = 'research_cluster' | 'research_domain' | 'sub_research_domain' | 'esg_factors' | 'sdg_alignment';

export const CATEGORY_LABELS: Record<DropdownCategoryKey, string> = {
  research_cluster: 'Research Cluster',
  research_domain: 'Research Domain',
  sub_research_domain: 'Sub-Research Domain',
  esg_factors: 'ESG Factors',
  sdg_alignment: 'SDG Alignment'
};

@Injectable({
  providedIn: 'root'
})
export class RdigDropdownOptionsService {
  private store = new BehaviorSubject<Record<DropdownCategoryKey, DropdownOption[]>>({
    research_cluster: [],
    research_domain: [],
    sub_research_domain: [],
    esg_factors: [],
    sdg_alignment: [],
  });
  private loaded = new Set<DropdownCategoryKey>();
  store$ = this.store.asObservable();

  constructor(private http: HttpClient) {}

  loadOptions(category: DropdownCategoryKey): Observable<DropdownOption[]> {
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
        this.store.next({ ...this.store.getValue(), [category]: options });
      }),
      catchError(err => {
        console.error(`Failed to load ${category}`, err);
        this.loaded.add(category);
        return of([]);
      })
    );
  }

  getOptions(category: DropdownCategoryKey): Observable<DropdownOption[]> {
    return this.store$.pipe(map(state => state[category]));
  }

  getOptionsSnapshot(category: DropdownCategoryKey): DropdownOption[] {
    return this.store.getValue()[category];
  }

  addOption(category: DropdownCategoryKey, option: Pick<DropdownOption, 'optionName' | 'status' | 'parentDomainId'>): void {
    const currentState = this.store.getValue();
    const options = currentState[category];
    const newId = options.length > 0 ? Math.max(...options.map(o => o.id)) + 1 : 1;
    const newOption: DropdownOption = {
      id: newId,
      optionName: option.optionName,
      status: option.status,
      createdDate: new Date().toISOString(),
      parentDomainId: option.parentDomainId,
    };

    const updatedOptions = [...options, newOption];
    this.store.next({ ...currentState, [category]: updatedOptions });
  }

  updateOption(category: DropdownCategoryKey, updatedOption: DropdownOption): void {
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

