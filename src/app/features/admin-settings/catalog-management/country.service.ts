import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CatalogApiResponse, CatalogPagination, CatalogStatus } from './catalog-api.types';

export interface CountryApi {
  id: string;
  country_ref: string | null;
  currency_selectable: boolean;
  region: string | null;
  source_status: string | null;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CountryListData {
  items: CountryApi[];
  pagination: CatalogPagination;
}

@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-settings/countries`;

  list(params: {
    page: number;
    perPage: number;
    status: CatalogStatus;
    search?: string;
  }): Observable<CatalogApiResponse<CountryListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage)
      .set('status', params.status);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<CatalogApiResponse<CountryListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  options(includeInactive = false): Observable<CatalogApiResponse<CountryApi[]>> {
    const params = new HttpParams().set('include_inactive', includeInactive ? 'true' : 'false');
    return this.http.get<CatalogApiResponse<CountryApi[]>>(
      `${environment.apiUrl}/master-data/countries/options`,
      { params },
    );
  }
}
