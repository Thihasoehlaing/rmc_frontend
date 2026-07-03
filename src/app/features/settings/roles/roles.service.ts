import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Role {
  id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  user_count?: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface RolePayload {
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
}

interface RoleListData {
  items: Role[];
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
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/$/, '')}/api/settings/roles`;

  list(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: '' | 'Active' | 'Inactive';
  }): Observable<ApiResponse<RoleListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<RoleListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  get(id: number): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(`${this.baseUrl}/${id}`);
  }

  create(payload: RolePayload): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(this.baseUrl, payload);
  }

  update(id: number, payload: RolePayload): Observable<ApiResponse<Role>> {
    return this.http.put<ApiResponse<Role>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<Role>> {
    return this.http.delete<ApiResponse<Role>>(`${this.baseUrl}/${id}`);
  }
}
