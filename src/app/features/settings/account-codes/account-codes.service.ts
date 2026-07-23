import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PagedResult<T> {
  items: T[];
  pagination: Pagination;
}

export type StatusFilter = '' | 'Active' | 'Inactive';
export type LocationType = 'LOCAL' | 'FOREIGN';
export type AccountCodeLocationType = LocationType | 'BASE';

export interface AccountCodeCategory {
  id: number;
  category_name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccountCodeCategoryPayload {
  category_name: string;
  is_active: boolean;
}

export interface AccountCodeCategoryOption {
  id: number;
  category_name: string;
}

export interface AccountCode {
  id: number;
  account_code_category_id: number;
  category_name: string | null;
  code: string;
  description: string;
  location_type: AccountCodeLocationType;
  is_active: boolean;
  form_codes: string[];
  forms?: Array<{ id: number; form_name: string; form_code: string }>;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccountCodePayload {
  account_code_category_id: number;
  code: string;
  description: string;
  location_type: LocationType;
  is_active: boolean;
  form_codes: string[];
}

@Injectable({ providedIn: 'root' })
export class AccountCodesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly categoryUrl = `${this.apiUrl}/settings/account-code-categories`;
  private readonly categoryOptionsUrl = `${this.categoryUrl}/options`;
  private readonly codeUrl = `${this.apiUrl}/settings/account-codes`;

  listCategories(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: StatusFilter;
  }): Observable<ApiResponse<PagedResult<AccountCodeCategory>>> {
    return this.http.get<ApiResponse<PagedResult<AccountCodeCategory>>>(this.categoryUrl, {
      params: this.toListParams(params),
    });
  }

  getCategory(id: number): Observable<ApiResponse<AccountCodeCategory>> {
    return this.http.get<ApiResponse<AccountCodeCategory>>(`${this.categoryUrl}/${id}`);
  }

  listCategoryOptions(): Observable<ApiResponse<AccountCodeCategoryOption[]>> {
    return this.http.get<ApiResponse<AccountCodeCategoryOption[]>>(this.categoryOptionsUrl);
  }

  createCategory(
    payload: AccountCodeCategoryPayload,
  ): Observable<ApiResponse<AccountCodeCategory>> {
    return this.http.post<ApiResponse<AccountCodeCategory>>(this.categoryUrl, payload);
  }

  updateCategory(
    id: number,
    payload: AccountCodeCategoryPayload,
  ): Observable<ApiResponse<AccountCodeCategory>> {
    return this.http.put<ApiResponse<AccountCodeCategory>>(`${this.categoryUrl}/${id}`, payload);
  }

  deleteCategory(id: number): Observable<ApiResponse<AccountCodeCategory>> {
    return this.http.delete<ApiResponse<AccountCodeCategory>>(`${this.categoryUrl}/${id}`);
  }

  listCodes(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: StatusFilter;
    accountCodeCategoryId?: number | null;
    locationType?: '' | LocationType;
    formCode?: string;
  }): Observable<ApiResponse<PagedResult<AccountCode>>> {
    let httpParams = this.toListParams(params);

    if (params.accountCodeCategoryId) {
      httpParams = httpParams.set('account_code_category_id', params.accountCodeCategoryId);
    }
    if (params.locationType) {
      httpParams = httpParams.set('location_type', params.locationType);
    }
    if (params.formCode?.trim()) {
      httpParams = httpParams.set('form_code', params.formCode.trim());
    }

    return this.http.get<ApiResponse<PagedResult<AccountCode>>>(this.codeUrl, {
      params: httpParams,
    });
  }

  getCode(id: number): Observable<ApiResponse<AccountCode>> {
    return this.http.get<ApiResponse<AccountCode>>(`${this.codeUrl}/${id}`);
  }

  createCode(payload: AccountCodePayload): Observable<ApiResponse<AccountCode>> {
    return this.http.post<ApiResponse<AccountCode>>(this.codeUrl, payload);
  }

  updateCode(id: number, payload: AccountCodePayload): Observable<ApiResponse<AccountCode>> {
    return this.http.put<ApiResponse<AccountCode>>(`${this.codeUrl}/${id}`, payload);
  }

  deleteCode(id: number): Observable<ApiResponse<AccountCode>> {
    return this.http.delete<ApiResponse<AccountCode>>(`${this.codeUrl}/${id}`);
  }

  private toListParams(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: StatusFilter;
  }): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return httpParams;
  }
}
