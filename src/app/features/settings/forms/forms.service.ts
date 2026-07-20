import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { FormCacheService } from '../../../core/services/form-cache.service';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ManagedForm {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ManagedFormPayload {
  form_code: string;
  form_name: string;
  is_active: boolean;
}

export interface ManagedFormListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: '' | 'Active' | 'Inactive';
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class FormsService {
  private readonly http = inject(HttpClient);
  private readonly formCache = inject(FormCacheService);
  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/$/, '')}/rmc/settings/forms`;

  list(
    params: ManagedFormListParams,
  ): Observable<ApiResponse<PaginatedData<ManagedForm>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<ManagedForm>>>(
      this.baseUrl,
      { params: httpParams },
    );
  }

  get(id: number): Observable<ApiResponse<ManagedForm>> {
    return this.http.get<ApiResponse<ManagedForm>>(`${this.baseUrl}/${id}`);
  }

  create(
    payload: ManagedFormPayload,
  ): Observable<ApiResponse<ManagedForm>> {
    return this.http
      .post<ApiResponse<ManagedForm>>(this.baseUrl, payload)
      .pipe(tap(() => this.refreshFormCache()));
  }

  update(
    id: number,
    payload: ManagedFormPayload,
  ): Observable<ApiResponse<ManagedForm>> {
    return this.http
      .put<ApiResponse<ManagedForm>>(`${this.baseUrl}/${id}`, payload)
      .pipe(tap(() => this.refreshFormCache()));
  }

  deactivate(id: number): Observable<ApiResponse<ManagedForm>> {
    return this.http
      .delete<ApiResponse<ManagedForm>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.refreshFormCache()));
  }

  private refreshFormCache(): void {
    this.formCache.refresh().subscribe({ error: () => undefined });
  }
}
