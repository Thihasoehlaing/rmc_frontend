import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { FormCacheService } from '../../../../core/services/form-cache.service';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';

export interface DropdownOptionEntityEntity {
  id: number;
  optionName: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  parentDomainId?: number;
  code?: string;
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

// Raw API shapes from master-data endpoints
interface RawCluster { id: number; cluster_name: string; is_active: boolean; }
interface RawDomain  { id: number; domain_name: string;  is_active: boolean; }
interface RawSubDomain {
  id: number;
  research_domain_id: number;
  sub_domain_name: string;
  is_active: boolean;
}
interface RawEsg { id: number; esg_code: string; esg_name: string; is_active: boolean; }
interface RawSdg { id: number; sdg_code: string; sdg_name: string; is_active: boolean; }
interface RawDropdownOption { id: number; option_name: string; status: string; dropdown_category_id?: number; }

// Raw API shapes from admin-settings endpoints (paginated)
export interface AdminCluster    { id: number; cluster_name: string;    is_active: boolean; }
export interface AdminDomain     { id: number; domain_name: string;     is_active: boolean; }
export interface AdminSubDomain  {
  id: number;
  research_domain_id: number;
  sub_domain_name: string;
  is_active: boolean;
}
export interface AdminEsg        { id: number; esg_code: string; esg_name: string; is_active: boolean; }
export interface AdminSdg        { id: number; sdg_code: string; sdg_name: string; is_active: boolean; }
export interface AdminSharedForm {
  id: number;
  form_code: string;
  form_name: string;
}
export interface FormOption {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
}
export interface AdminTypeOfOrg  {
  id: number;
  name?: string;
  option_name?: string;
  status: string;
  dropdown_category_id: number;
  shared_with?: AdminSharedForm[];
  updated_at?: string;
}

export interface AdminPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface AdminPagedResult<T> {
  items: T[];
  pagination: AdminPagination;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

export interface AdminListParams {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

type StoreState = Record<DropdownCategoryKey, DropdownOptionEntityEntity[]>;

@Injectable({ providedIn: 'root' })
export class RdigDropdownOptionsService {
  private readonly http = inject(HttpClient);
  private readonly formCache = inject(FormCacheService);

  private store = new BehaviorSubject<StoreState>({
    research_cluster: [],
    type_of_organisation: [],
    research_domain: [],
    sub_research_domain: [],
    esg_factors: [],
    sdg_alignment: [],
  });

  private loaded = new Set<DropdownCategoryKey>();

  store$ = this.store.asObservable();

  // ─── Form-facing reads ────────────────────────────────────────────────────

  loadOptions(category: DropdownCategoryKey): Observable<DropdownOptionEntityEntity[]> {
    if (this.loaded.has(category)) {
      return of(this.store.getValue()[category]);
    }
    return this.fetchFormOptions(category);
  }

  getOptions(category: DropdownCategoryKey): Observable<DropdownOptionEntityEntity[]> {
    return this.store$.pipe(map((state) => state[category]));
  }

  getOptionsSnapshot(category: DropdownCategoryKey): DropdownOptionEntityEntity[] {
    return this.store.getValue()[category];
  }

  private fetchFormOptions(category: DropdownCategoryKey): Observable<DropdownOptionEntityEntity[]> {
    let fetch$: Observable<DropdownOptionEntityEntity[]>;

    switch (category) {
      case 'research_cluster':
        fetch$ = this.http.get<ApiResponse<RawCluster[]>>(`${environment.apiUrl}/rmc/master-data/research-clusters`).pipe(
          map((r) => (r.data ?? []).map((c) => ({
            id: c.id,
            optionName: c.cluster_name,
            status: c.is_active ? ('Active' as const) : ('Inactive' as const),
            createdDate: '',
          }))),
          catchError(() => of([])),
        );
        break;

      case 'type_of_organisation':
        fetch$ = this.http.get<ApiResponse<RawDropdownOption[]>>(
          `${environment.apiUrl}/rmc/dropdowns/TYPE_OF_ORGANISATION/options`,
          { params: new HttpParams().set('form_code', 'RDIG') },
        ).pipe(
          map((r) => (r.data ?? []).map((o) => ({
            id: o.id,
            optionName: o.option_name,
            status: (o.status ?? '').toLowerCase() === 'inactive' ? ('Inactive' as const) : ('Active' as const),
            createdDate: '',
          }))),
          catchError(() => of([])),
        );
        break;

      case 'research_domain':
        fetch$ = this.http.get<ApiResponse<RawDomain[]>>(`${environment.apiUrl}/rmc/master-data/research-domains`).pipe(
          map((r) => (r.data ?? []).map((d) => ({
            id: d.id,
            optionName: d.domain_name,
            status: d.is_active ? ('Active' as const) : ('Inactive' as const),
            createdDate: '',
          }))),
          catchError(() => of([])),
        );
        break;

      case 'sub_research_domain':
        // Load all domains first, then fetch sub-domains for each in parallel
        fetch$ = this.fetchFormOptions('research_domain').pipe(
          switchMap((domains) => {
            const activeDomains = domains.filter((d) => d.status === 'Active');
            if (!activeDomains.length) return of([]);
            return forkJoin(
              activeDomains.map((domain) =>
                this.http.get<ApiResponse<RawSubDomain[]>>(
                  `${environment.apiUrl}/rmc/master-data/research-domains/${domain.id}/sub-domains`,
                ).pipe(
                  map((r) => (r.data ?? []).map((sd) => ({
                    id: sd.id,
                    optionName: sd.sub_domain_name,
                    status: sd.is_active ? ('Active' as const) : ('Inactive' as const),
                    createdDate: '',
                    parentDomainId: sd.research_domain_id,
                  }))),
                  catchError(() => of([])),
                ),
              ),
            ).pipe(map((arrays) => arrays.flat()));
          }),
        );
        break;

      case 'esg_factors':
        fetch$ = this.http.get<ApiResponse<RawEsg[]>>(`${environment.apiUrl}/rmc/master-data/esgs`).pipe(
          map((r) => (r.data ?? []).map((e) => ({
            id: e.id,
            optionName: e.esg_name,
            status: e.is_active ? ('Active' as const) : ('Inactive' as const),
            createdDate: '',
            code: e.esg_code,
          }))),
          catchError(() => of([])),
        );
        break;

      case 'sdg_alignment':
        fetch$ = this.http.get<ApiResponse<RawSdg[]>>(`${environment.apiUrl}/rmc/master-data/sdgs`).pipe(
          map((r) => (r.data ?? []).map((s) => ({
            id: s.id,
            optionName: s.sdg_name,
            status: s.is_active ? ('Active' as const) : ('Inactive' as const),
            createdDate: '',
            code: s.sdg_code,
          }))),
          catchError(() => of([])),
        );
        break;

      default:
        fetch$ = of([]);
    }

    return fetch$.pipe(
      tap((options) => {
        this.loaded.add(category);
        this.store.next({ ...this.store.getValue(), [category]: options });
      }),
    );
  }

  // ─── Admin list (paginated, with search & status filter) ─────────────────

  adminListClusters(params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminCluster>>> {
    return this.http.get<ApiResponse<AdminPagedResult<AdminCluster>>>(
      `${environment.apiUrl}/rmc/admin-settings/research-clusters`,
      { params: this.buildParams(params) },
    );
  }

  adminListDomains(params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminDomain>>> {
    return this.http.get<ApiResponse<AdminPagedResult<AdminDomain>>>(
      `${environment.apiUrl}/rmc/admin-settings/research-domains`,
      { params: this.buildParams(params) },
    );
  }

  adminListSubDomains(domainId: number, params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminSubDomain>>> {
    return this.http.get<ApiResponse<AdminPagedResult<AdminSubDomain>>>(
      `${environment.apiUrl}/rmc/admin-settings/research-domains/${domainId}/sub-domains`,
      { params: this.buildParams(params) },
    );
  }

  adminListEsgs(params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminEsg>>> {
    return this.http.get<ApiResponse<AdminPagedResult<AdminEsg>>>(
      `${environment.apiUrl}/rmc/admin-settings/esgs`,
      { params: this.buildParams(params) },
    );
  }

  adminListSdgs(params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminSdg>>> {
    return this.http.get<ApiResponse<AdminPagedResult<AdminSdg>>>(
      `${environment.apiUrl}/rmc/admin-settings/sdgs`,
      { params: this.buildParams(params) },
    );
  }

  adminListTypeOfOrg(params: AdminListParams): Observable<ApiResponse<AdminPagedResult<AdminTypeOfOrg>>> {
    const p = this.buildParams(params)
      .set('category_code', 'TYPE_OF_ORGANISATION')
      .set('form_code', 'RDIG');
    return this.http.get<ApiResponse<AdminPagedResult<AdminTypeOfOrg>>>(
      `${environment.apiUrl}/rmc/admin-settings/dropdown-options`,
      { params: p },
    );
  }

  listForms(): Observable<ApiResponse<FormOption[]>> {
    return this.formCache.getForms();
  }

  // ─── Admin create ─────────────────────────────────────────────────────────

  adminCreateCluster(data: { cluster_name: string; is_active?: boolean }): Observable<ApiResponse<AdminCluster>> {
    return this.http.post<ApiResponse<AdminCluster>>(`${environment.apiUrl}/rmc/admin-settings/research-clusters`, data).pipe(
      tap(() => this.invalidateAndRefresh('research_cluster')),
    );
  }

  adminCreateDomain(data: { domain_name: string; is_active?: boolean }): Observable<ApiResponse<AdminDomain>> {
    return this.http.post<ApiResponse<AdminDomain>>(`${environment.apiUrl}/rmc/admin-settings/research-domains`, data).pipe(
      tap(() => this.invalidateAndRefresh('research_domain')),
    );
  }

  adminCreateSubDomain(domainId: number, data: { sub_domain_name: string; is_active?: boolean }): Observable<ApiResponse<AdminSubDomain>> {
    return this.http.post<ApiResponse<AdminSubDomain>>(
      `${environment.apiUrl}/rmc/admin-settings/research-domains/${domainId}/sub-domains`, data,
    ).pipe(tap(() => this.invalidateAndRefresh('sub_research_domain')));
  }

  adminCreateEsg(data: { esg_code: string; esg_name: string; is_active?: boolean }): Observable<ApiResponse<AdminEsg>> {
    return this.http.post<ApiResponse<AdminEsg>>(`${environment.apiUrl}/rmc/admin-settings/esgs`, data).pipe(
      tap(() => this.invalidateAndRefresh('esg_factors')),
    );
  }

  adminCreateSdg(data: { sdg_code: string; sdg_name: string; is_active?: boolean }): Observable<ApiResponse<AdminSdg>> {
    return this.http.post<ApiResponse<AdminSdg>>(`${environment.apiUrl}/rmc/admin-settings/sdgs`, data).pipe(
      tap(() => this.invalidateAndRefresh('sdg_alignment')),
    );
  }

  adminCreateTypeOfOrg(data: { option_name: string; is_active?: boolean; form_codes?: string[] }): Observable<ApiResponse<AdminTypeOfOrg>> {
    const body = {
      category_code: 'TYPE_OF_ORGANISATION',
      option_name: data.option_name,
      status: data.is_active === false ? 'INACTIVE' : 'ACTIVE',
      form_codes: data.form_codes ?? [],
    };
    return this.http.post<ApiResponse<AdminTypeOfOrg>>(`${environment.apiUrl}/rmc/admin-settings/dropdown-options`, body).pipe(
      tap(() => this.invalidateAndRefresh('type_of_organisation')),
    );
  }

  // ─── Admin update ─────────────────────────────────────────────────────────

  adminUpdateCluster(id: number, data: { cluster_name?: string; is_active?: boolean }): Observable<ApiResponse<AdminCluster>> {
    return this.http.put<ApiResponse<AdminCluster>>(`${environment.apiUrl}/rmc/admin-settings/research-clusters/${id}`, data).pipe(
      tap(() => this.invalidateAndRefresh('research_cluster')),
    );
  }

  adminUpdateDomain(id: number, data: { domain_name?: string; is_active?: boolean }): Observable<ApiResponse<AdminDomain>> {
    return this.http.put<ApiResponse<AdminDomain>>(`${environment.apiUrl}/rmc/admin-settings/research-domains/${id}`, data).pipe(
      tap(() => this.invalidateAndRefresh('research_domain')),
    );
  }

  // Note: item-level sub-domain ops use the FLAT route (/admin-settings/sub-domains/{id}),
  // unlike list/create which are nested under a domain. The backend resolves the sub-domain
  // by its own id here, so no domain_id is needed.
  adminUpdateSubDomain(id: number, data: { sub_domain_name?: string; is_active?: boolean }): Observable<ApiResponse<AdminSubDomain>> {
    return this.http.put<ApiResponse<AdminSubDomain>>(
      `${environment.apiUrl}/rmc/admin-settings/sub-domains/${id}`, data,
    ).pipe(tap(() => this.invalidateAndRefresh('sub_research_domain')));
  }

  adminUpdateEsg(id: number, data: { esg_code?: string; esg_name?: string; is_active?: boolean }): Observable<ApiResponse<AdminEsg>> {
    return this.http.put<ApiResponse<AdminEsg>>(`${environment.apiUrl}/rmc/admin-settings/esgs/${id}`, data).pipe(
      tap(() => this.invalidateAndRefresh('esg_factors')),
    );
  }

  adminUpdateSdg(id: number, data: { sdg_code?: string; sdg_name?: string; is_active?: boolean }): Observable<ApiResponse<AdminSdg>> {
    return this.http.put<ApiResponse<AdminSdg>>(`${environment.apiUrl}/rmc/admin-settings/sdgs/${id}`, data).pipe(
      tap(() => this.invalidateAndRefresh('sdg_alignment')),
    );
  }

  adminUpdateTypeOfOrg(id: number, data: { option_name?: string; is_active?: boolean; form_codes?: string[] }): Observable<ApiResponse<AdminTypeOfOrg>> {
    const body: Record<string, unknown> = {};
    if (data.option_name !== undefined) body['option_name'] = data.option_name;
    if (data.is_active !== undefined) body['status'] = data.is_active ? 'ACTIVE' : 'INACTIVE';
    if (data.form_codes !== undefined) body['form_codes'] = data.form_codes;
    return this.http.put<ApiResponse<AdminTypeOfOrg>>(`${environment.apiUrl}/rmc/admin-settings/dropdown-options/${id}`, body).pipe(
      tap(() => this.invalidateAndRefresh('type_of_organisation')),
    );
  }

  // ─── Admin delete ─────────────────────────────────────────────────────────

  adminDeleteCluster(id: number): Observable<ApiResponse<AdminCluster>> {
    return this.http.delete<ApiResponse<AdminCluster>>(`${environment.apiUrl}/rmc/admin-settings/research-clusters/${id}`).pipe(
      tap(() => this.invalidateAndRefresh('research_cluster')),
    );
  }

  adminDeleteDomain(id: number): Observable<ApiResponse<AdminDomain>> {
    return this.http.delete<ApiResponse<AdminDomain>>(`${environment.apiUrl}/rmc/admin-settings/research-domains/${id}`).pipe(
      tap(() => { this.invalidateAndRefresh('research_domain'); this.invalidateAndRefresh('sub_research_domain'); }),
    );
  }

  // Flat item route — see adminUpdateSubDomain note.
  adminDeleteSubDomain(id: number): Observable<ApiResponse<AdminSubDomain>> {
    return this.http.delete<ApiResponse<AdminSubDomain>>(
      `${environment.apiUrl}/rmc/admin-settings/sub-domains/${id}`,
    ).pipe(tap(() => this.invalidateAndRefresh('sub_research_domain')));
  }

  adminDeleteEsg(id: number): Observable<ApiResponse<AdminEsg>> {
    return this.http.delete<ApiResponse<AdminEsg>>(`${environment.apiUrl}/rmc/admin-settings/esgs/${id}`).pipe(
      tap(() => this.invalidateAndRefresh('esg_factors')),
    );
  }

  adminDeleteSdg(id: number): Observable<ApiResponse<AdminSdg>> {
    return this.http.delete<ApiResponse<AdminSdg>>(`${environment.apiUrl}/rmc/admin-settings/sdgs/${id}`).pipe(
      tap(() => this.invalidateAndRefresh('sdg_alignment')),
    );
  }

  adminDeleteTypeOfOrg(id: number): Observable<ApiResponse<AdminTypeOfOrg>> {
    return this.http.delete<ApiResponse<AdminTypeOfOrg>>(`${environment.apiUrl}/rmc/admin-settings/dropdown-options/${id}`).pipe(
      tap(() => this.invalidateAndRefresh('type_of_organisation')),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Marks the form-facing cache for this category as stale and notifies any
   * mounted RDIG/Journal form components (they listen for this event and call
   * loadOptions() themselves). Deliberately does NOT fetch here — the caller
   * already has the up-to-date row from the create/update/delete response, and
   * fetching eagerly would fire an extra, unnecessary network request.
   */
  private invalidateAndRefresh(category: DropdownCategoryKey): void {
    this.loaded.delete(category);
    window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));
  }

  private buildParams(p: AdminListParams): HttpParams {
    let params = new HttpParams();
    if (p.search) params = params.set('search', p.search);
    if (p.status && p.status !== 'all') params = params.set('status', p.status);
    if (p.page) params = params.set('page', p.page.toString());
    if (p.per_page) params = params.set('per_page', p.per_page.toString());
    return params;
  }
}

