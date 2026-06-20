import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DropdownCategory {
  id: number;
  category_code: string;
  category_name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface DropdownCategoryPayload {
  category_code: string;
  category_name: string;
  is_active: boolean;
}

interface DropdownCategoryListData {
  items: DropdownCategory[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class DropdownCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/$/, '')}/api/settings/dropdown-categories`;

  list(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: '' | 'Active' | 'Inactive';
  }): Observable<ApiResponse<DropdownCategoryListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<DropdownCategoryListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  get(id: number): Observable<ApiResponse<DropdownCategory>> {
    return this.http.get<ApiResponse<DropdownCategory>>(`${this.baseUrl}/${id}`);
  }

  create(
    payload: DropdownCategoryPayload,
  ): Observable<ApiResponse<DropdownCategory>> {
    return this.http.post<ApiResponse<DropdownCategory>>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: DropdownCategoryPayload,
  ): Observable<ApiResponse<DropdownCategory>> {
    return this.http.put<ApiResponse<DropdownCategory>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<ApiResponse<DropdownCategory>> {
    return this.http.delete<ApiResponse<DropdownCategory>>(
      `${this.baseUrl}/${id}`,
    );
  }
}
