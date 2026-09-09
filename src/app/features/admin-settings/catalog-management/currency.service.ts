import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CatalogApiResponse, CatalogPagination, CatalogStatus } from './catalog-api.types';

export interface CurrencyApi {
  id: number;
  country_id: number;
  name: string;
  symbol: string;
  code: string;
  country_name: string | null;
  country_code: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CurrencyPayload {
  name: string;
  symbol: string;
  code: string;
  country_id: number;
  is_active: boolean;
}

export interface CurrencyListData {
  items: CurrencyApi[];
  pagination: CatalogPagination;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-settings/currencies`;

  list(params: {
    page: number;
    perPage: number;
    status: CatalogStatus;
    search?: string;
    countryId?: number;
  }): Observable<CatalogApiResponse<CurrencyListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage)
      .set('status', params.status);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.countryId) {
      httpParams = httpParams.set('country_id', params.countryId);
    }

    return this.http.get<CatalogApiResponse<CurrencyListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  create(payload: CurrencyPayload): Observable<CatalogApiResponse<CurrencyApi>> {
    return this.http.post<CatalogApiResponse<CurrencyApi>>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: Partial<CurrencyPayload>,
  ): Observable<CatalogApiResponse<CurrencyApi>> {
    return this.http.put<CatalogApiResponse<CurrencyApi>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<CatalogApiResponse<CurrencyApi>> {
    return this.http.delete<CatalogApiResponse<CurrencyApi>>(`${this.baseUrl}/${id}`);
  }

  options(includeInactive = false): Observable<CatalogApiResponse<CurrencyApi[]>> {
    const params = new HttpParams().set('include_inactive', includeInactive ? 'true' : 'false');
    return this.http.get<CatalogApiResponse<CurrencyApi[]>>(
      `${environment.apiUrl}/master-data/currencies/options`,
      { params },
    );
  }
}
