import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { FormCacheService } from '../../../../core/services/form-cache.service';

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

export interface SharedForm {
  id: number;
  form_code: string;
  form_name: string;
}

export interface DropdownOptionRow {
  id: number;
  dropdown_category_id: number;
  name?: string;
  option_name?: string;
  status: string;
  shared_with?: SharedForm[];
  updated_at?: string | null;
}

export interface RegionRow {
  id: number;
  region_name: string;
  percentage?: string | number | null;
  limit_amount?: string | number | null;
  description?: string | null;
  is_active: boolean;
}

export interface FinanceOptionRow {
  id: number;
  code: string;
  description?: string | null;
  is_active: boolean;
  form_codes?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AccountCodeRow extends FinanceOptionRow {
  account_code_category_id: number;
  category_name?: string | null;
  location_type?: 'BASE' | 'LOCAL' | 'FOREIGN';
}

export interface FormOption {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
}

export interface ListParams {
  category_code?: string;
  search?: string;
  status?: string;
  form_code?: string;
  page?: number;
  per_page?: number;
}

export interface RegionPayload {
  region_name: string;
  percentage?: number | null;
  limit_amount?: number | null;
  description?: string;
  is_active: boolean;
}

export interface FinanceOptionPayload {
  code: string;
  description?: string;
  is_active: boolean;
  form_codes: string[];
}

export interface AccountCodePayload extends FinanceOptionPayload {
  account_code_category_id?: number;
  location_type?: 'BASE' | 'LOCAL' | 'FOREIGN';
}

@Injectable({ providedIn: 'root' })
export class SharedDropdownOptionsService {
  private readonly http = inject(HttpClient);
  private readonly formCache = inject(FormCacheService);

  listForms(): Observable<ApiResponse<FormOption[]>> {
    return this.formCache.getActiveForms();
  }

  listOptions(params: ListParams): Observable<ApiResponse<PagedResult<DropdownOptionRow>>> {
    let httpParams = new HttpParams()
      .set('category_code', params.category_code ?? '')
      .set('page', String(params.page ?? 1))
      .set('per_page', String(params.per_page ?? 15));

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.form_code) {
      httpParams = httpParams.set('form_code', params.form_code);
    }

    return this.http.get<ApiResponse<PagedResult<DropdownOptionRow>>>(
      `${environment.apiBaseUrl}/admin-settings/dropdown-options`,
      { params: httpParams },
    );
  }

  listRegions(params: ListParams): Observable<ApiResponse<PagedResult<RegionRow>>> {
    return this.http.get<ApiResponse<PagedResult<RegionRow>>>(
      `${environment.apiBaseUrl}/admin-settings/regions`,
      { params: this.toAdminListParams(params) },
    );
  }

  createRegion(data: RegionPayload): Observable<ApiResponse<RegionRow>> {
    return this.http.post<ApiResponse<RegionRow>>(
      `${environment.apiBaseUrl}/admin-settings/regions`,
      data,
    );
  }

  updateRegion(id: number, data: Partial<RegionPayload>): Observable<ApiResponse<RegionRow>> {
    return this.http.put<ApiResponse<RegionRow>>(
      `${environment.apiBaseUrl}/admin-settings/regions/${id}`,
      data,
    );
  }

  deleteRegion(id: number): Observable<ApiResponse<RegionRow>> {
    return this.http.delete<ApiResponse<RegionRow>>(
      `${environment.apiBaseUrl}/admin-settings/regions/${id}`,
    );
  }

  listProjectAccountCodes(
    params: ListParams,
  ): Observable<ApiResponse<PagedResult<FinanceOptionRow>>> {
    return this.http.get<ApiResponse<PagedResult<FinanceOptionRow>>>(
      `${environment.apiBaseUrl}/admin-settings/project-account-codes`,
      { params: this.toAdminListParams(params) },
    );
  }

  createProjectAccountCode(data: FinanceOptionPayload): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.post<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/project-account-codes`,
      data,
    );
  }

  updateProjectAccountCode(
    id: number,
    data: Partial<FinanceOptionPayload>,
  ): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.put<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/project-account-codes/${id}`,
      data,
    );
  }

  deleteProjectAccountCode(id: number): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.delete<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/project-account-codes/${id}`,
    );
  }

  listVoteNumbers(params: ListParams): Observable<ApiResponse<PagedResult<FinanceOptionRow>>> {
    return this.http.get<ApiResponse<PagedResult<FinanceOptionRow>>>(
      `${environment.apiBaseUrl}/admin-settings/vote-numbers`,
      { params: this.toAdminListParams(params) },
    );
  }

  createVoteNumber(data: FinanceOptionPayload): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.post<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/vote-numbers`,
      data,
    );
  }

  updateVoteNumber(
    id: number,
    data: Partial<FinanceOptionPayload>,
  ): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.put<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/vote-numbers/${id}`,
      data,
    );
  }

  deleteVoteNumber(id: number): Observable<ApiResponse<FinanceOptionRow>> {
    return this.http.delete<ApiResponse<FinanceOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/vote-numbers/${id}`,
    );
  }

  listAccountCodes(params: ListParams): Observable<ApiResponse<PagedResult<AccountCodeRow>>> {
    return this.http.get<ApiResponse<PagedResult<AccountCodeRow>>>(
      `${environment.apiBaseUrl}/admin-settings/account-codes`,
      { params: this.toAdminListParams(params) },
    );
  }

  createAccountCode(data: AccountCodePayload): Observable<ApiResponse<AccountCodeRow>> {
    return this.http.post<ApiResponse<AccountCodeRow>>(
      `${environment.apiBaseUrl}/admin-settings/account-codes`,
      data,
    );
  }

  updateAccountCode(
    id: number,
    data: Partial<AccountCodePayload>,
  ): Observable<ApiResponse<AccountCodeRow>> {
    return this.http.put<ApiResponse<AccountCodeRow>>(
      `${environment.apiBaseUrl}/admin-settings/account-codes/${id}`,
      data,
    );
  }

  deleteAccountCode(id: number): Observable<ApiResponse<AccountCodeRow>> {
    return this.http.delete<ApiResponse<AccountCodeRow>>(
      `${environment.apiBaseUrl}/admin-settings/account-codes/${id}`,
    );
  }

  createOption(data: {
    category_code: string;
    option_name: string;
    status: string;
    form_codes: string[];
  }): Observable<ApiResponse<DropdownOptionRow>> {
    return this.http.post<ApiResponse<DropdownOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/dropdown-options`,
      data,
    );
  }

  updateOption(
    id: number,
    data: {
      option_name?: string;
      status?: string;
      form_codes?: string[];
    },
  ): Observable<ApiResponse<DropdownOptionRow>> {
    return this.http.put<ApiResponse<DropdownOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/dropdown-options/${id}`,
      data,
    );
  }

  deleteOption(id: number): Observable<ApiResponse<DropdownOptionRow>> {
    return this.http.delete<ApiResponse<DropdownOptionRow>>(
      `${environment.apiBaseUrl}/admin-settings/dropdown-options/${id}`,
    );
  }

  private toAdminListParams(params: ListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('per_page', String(params.per_page ?? 15));

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.form_code) {
      httpParams = httpParams.set('form_code', params.form_code);
    }

    return httpParams;
  }
}
