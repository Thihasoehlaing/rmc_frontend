import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CatalogApiResponse, CatalogPagination, CatalogStatus } from './catalog-api.types';

export interface ExternalGrantCategoryApi {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ExternalGrantCategoryPayload {
  code: string;
  name: string;
  is_active: boolean;
}

export interface ExternalGrantCategoryListData {
  items: ExternalGrantCategoryApi[];
  pagination: CatalogPagination;
}

@Injectable({ providedIn: 'root' })
export class ExternalGrantCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-settings/external-grant-categories`;

  list(params: {
    page: number;
    perPage: number;
    status: CatalogStatus;
    search?: string;
  }): Observable<CatalogApiResponse<ExternalGrantCategoryListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage)
      .set('status', params.status);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<CatalogApiResponse<ExternalGrantCategoryListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  getAll(): Observable<CatalogApiResponse<ExternalGrantCategoryListData>> {
    return this.http.get<CatalogApiResponse<ExternalGrantCategoryListData>>(this.baseUrl);
  }

  create(
    payload: ExternalGrantCategoryPayload,
  ): Observable<CatalogApiResponse<ExternalGrantCategoryApi>> {
    return this.http.post<CatalogApiResponse<ExternalGrantCategoryApi>>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: Partial<ExternalGrantCategoryPayload>,
  ): Observable<CatalogApiResponse<ExternalGrantCategoryApi>> {
    return this.http.put<CatalogApiResponse<ExternalGrantCategoryApi>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<CatalogApiResponse<ExternalGrantCategoryApi>> {
    return this.http.delete<CatalogApiResponse<ExternalGrantCategoryApi>>(`${this.baseUrl}/${id}`);
  }
}
