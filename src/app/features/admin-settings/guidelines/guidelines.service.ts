import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * One guideline per form: {form_id, title, content_html, is_active}.
 * content_html is only present on the detail (get-by-id) response — the list
 * endpoint omits it to keep list payloads small.
 */
export interface GuidelineApi {
  id: number;
  form_id: number;
  form_code: string | null;
  form_name: string | null;
  title: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  content_html?: string;
}

export interface GuidelinePayload {
  form_id: number;
  title: string;
  content_html: string;
  is_active?: boolean;
}

export interface GuidelinePagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface GuidelineListData {
  items: GuidelineApi[];
  pagination: GuidelinePagination;
}

export interface GuidelineListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class GuidelinesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/$/, '')}/api/admin-settings/guidelines`;

  list(params: GuidelineListParams): Observable<ApiResponse<GuidelineListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<GuidelineListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  get(id: number): Observable<ApiResponse<GuidelineApi>> {
    return this.http.get<ApiResponse<GuidelineApi>>(`${this.baseUrl}/${id}`);
  }

  create(payload: GuidelinePayload): Observable<ApiResponse<GuidelineApi>> {
    return this.http.post<ApiResponse<GuidelineApi>>(this.baseUrl, payload);
  }

  /** The backend's PUT accepts a partial body — only the given fields are changed. */
  update(
    id: number,
    payload: Partial<GuidelinePayload>,
  ): Observable<ApiResponse<GuidelineApi>> {
    return this.http.put<ApiResponse<GuidelineApi>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<ApiResponse<GuidelineApi>> {
    return this.http.delete<ApiResponse<GuidelineApi>>(`${this.baseUrl}/${id}`);
  }
}
