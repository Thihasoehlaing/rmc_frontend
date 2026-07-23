import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CatalogApiResponse, CatalogPagination, CatalogStatus } from './catalog-api.types';

export interface ProjectAccountCodeApi {
  id: number;
  code: string;
  description: string | null;
  is_active: boolean;
  form_codes: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectAccountCodePayload {
  code: string;
  description?: string | null;
  is_active?: boolean;
  form_codes?: string[];
}

export interface ProjectAccountCodeListData {
  items: ProjectAccountCodeApi[];
  pagination: CatalogPagination;
}

@Injectable({ providedIn: 'root' })
export class ProjectAccountCodeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-settings/project-account-codes`;

  list(params: {
    page: number;
    perPage: number;
    status: CatalogStatus;
    search?: string;
    formCode?: string;
  }): Observable<CatalogApiResponse<ProjectAccountCodeListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage)
      .set('status', params.status);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.formCode?.trim()) {
      httpParams = httpParams.set('form_code', params.formCode.trim());
    }

    return this.http.get<CatalogApiResponse<ProjectAccountCodeListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  create(
    payload: ProjectAccountCodePayload,
  ): Observable<CatalogApiResponse<ProjectAccountCodeApi>> {
    return this.http.post<CatalogApiResponse<ProjectAccountCodeApi>>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: Partial<ProjectAccountCodePayload>,
  ): Observable<CatalogApiResponse<ProjectAccountCodeApi>> {
    return this.http.put<CatalogApiResponse<ProjectAccountCodeApi>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<CatalogApiResponse<ProjectAccountCodeApi>> {
    return this.http.delete<CatalogApiResponse<ProjectAccountCodeApi>>(`${this.baseUrl}/${id}`);
  }
}
