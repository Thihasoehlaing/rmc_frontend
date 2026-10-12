import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CatalogApiResponse, CatalogPagination, CatalogStatus } from './catalog-api.types';

export interface CountryApi {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CountryPayload {
  name: string;
  code: string;
  is_active: boolean;
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

  create(payload: CountryPayload): Observable<CatalogApiResponse<CountryApi>> {
    return this.http.post<CatalogApiResponse<CountryApi>>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<CountryPayload>): Observable<CatalogApiResponse<CountryApi>> {
    return this.http.put<CatalogApiResponse<CountryApi>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<CatalogApiResponse<CountryApi>> {
    return this.http.delete<CatalogApiResponse<CountryApi>>(`${this.baseUrl}/${id}`);
  }

  options(includeInactive = false): Observable<CatalogApiResponse<CountryApi[]>> {
    const params = new HttpParams().set('include_inactive', includeInactive ? 'true' : 'false');
    return this.http.get<CatalogApiResponse<CountryApi[]>>(
      `${environment.apiUrl}/master-data/countries/options`,
      { params },
    );
  }
}
