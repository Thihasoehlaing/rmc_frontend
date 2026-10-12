import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

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

export interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

export interface RequestStatusSetting {
  id: number;
  form_id: number | null;
  form_code: string | null;
  form_name: string | null;
  status_code: string;
  status_name: string;
  actor_type_id: number | null;
  actor_code: string | null;
  actor_name: string | null;
  is_initial: boolean;
  is_final: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ActorTypeOption {
  id: number;
  actor_code: string;
  actor_name: string;
  description: string | null;
  is_active: boolean;
}

export interface RequestStatusQuery {
  page: number;
  perPage: number;
  search?: string;
  status?: '' | 'Active' | 'Inactive';
  formCode?: string;
}

export interface RequestStatusPayload {
  form_id: number;
  status_code: string;
  status_name: string;
  actor_type_id: number | null;
  is_initial: boolean;
  is_final: boolean;
  display_order: number;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class RequestStatusesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/settings/request-statuses`;
  private readonly settingsUrl = `${environment.apiUrl}/settings`;

  list(query: RequestStatusQuery): Observable<ApiResponse<PaginatedData<RequestStatusSetting>>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('per_page', query.perPage);

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);
    if (query.formCode) params = params.set('form_code', query.formCode);

    return this.http.get<ApiResponse<PaginatedData<RequestStatusSetting>>>(this.url, { params });
  }

  get(id: number): Observable<ApiResponse<RequestStatusSetting>> {
    return this.http.get<ApiResponse<RequestStatusSetting>>(`${this.url}/${id}`);
  }

  create(payload: RequestStatusPayload): Observable<ApiResponse<RequestStatusSetting>> {
    return this.http.post<ApiResponse<RequestStatusSetting>>(this.url, payload);
  }

  update(id: number, payload: RequestStatusPayload): Observable<ApiResponse<RequestStatusSetting>> {
    return this.http.put<ApiResponse<RequestStatusSetting>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<RequestStatusSetting>> {
    return this.http.delete<ApiResponse<RequestStatusSetting>>(`${this.url}/${id}`);
  }

  listActorTypes(): Observable<ApiResponse<ActorTypeOption[]>> {
    const params = new HttpParams().set('status', 'Active');
    return this.http.get<ApiResponse<ActorTypeOption[]>>(
      `${this.url}/actor-options`,
      { params },
    );
  }
}
