import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface GuidelineBlockApi {
  id: number;
  guideline_id: number;
  block_type: string;
  block_content: string;
  display_order: number;
  background_token: string | null;
  text_token: string | null;
  font_size_token: string | null;
  font_weight_token: string | null;
}

export interface GuidelineApi {
  id: number;
  form_id: number;
  form_code: string;
  form_name: string;
  guideline_title: string | null;
  button_text: string | null;
  is_active: boolean;
  background_token: string | null;
  text_token: string | null;
  button_token: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  block_count: number;
  blocks?: GuidelineBlockApi[];
}

export interface GuidelinePayload {
  form_code: string;
  guideline_title: string;
  button_text: string;
  is_active: boolean;
  background_token: string;
  text_token: string;
  button_token: string;
  blocks: Array<{
    block_type: string;
    block_content: string;
    display_order: number;
    background_token: string | null;
    text_token: string | null;
    font_size_token: string | null;
    font_weight_token: string | null;
  }>;
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

  update(
    id: number,
    payload: GuidelinePayload,
  ): Observable<ApiResponse<GuidelineApi>> {
    return this.http.put<ApiResponse<GuidelineApi>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  updateStatus(
    id: number,
    isActive: boolean,
  ): Observable<ApiResponse<GuidelineApi>> {
    return this.http.patch<ApiResponse<GuidelineApi>>(
      `${this.baseUrl}/${id}/status`,
      { is_active: isActive },
    );
  }

  delete(id: number): Observable<ApiResponse<GuidelineApi>> {
    return this.http.delete<ApiResponse<GuidelineApi>>(`${this.baseUrl}/${id}`);
  }
}
