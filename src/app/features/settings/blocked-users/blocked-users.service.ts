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

export interface BlockedUser {
  id: number;
  user_id: number | null;
  username: string;
  fullname: string | null;
  email: string | null;
  reason: string | null;
  is_active: boolean;
  blocked_by: string | null;
  blocked_at: string | null;
  unblocked_by: string | null;
  unblocked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateBlockedUserPayload {
  username: string;
  reason: string | null;
}

export interface UpdateBlockedUserPayload extends CreateBlockedUserPayload {
  is_active: boolean;
}

export interface StaffOption {
  id: number;
  username: string | null;
  fullname: string | null;
  email: string | null;
  staff_type: string | null;
  department: string | null;
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class BlockedUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly baseUrl =
    `${this.apiUrl}/rmc/settings/blocked-users`;
  private readonly staffOptionsUrl = `${this.apiUrl}/rmc/master-data/staff`;

  list(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: '' | 'Active' | 'Inactive';
  }): Observable<ApiResponse<PaginatedData<BlockedUser>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<BlockedUser>>>(
      this.baseUrl,
      { params: httpParams },
    );
  }

  get(id: number): Observable<ApiResponse<BlockedUser>> {
    return this.http.get<ApiResponse<BlockedUser>>(`${this.baseUrl}/${id}`);
  }

  create(
    payload: CreateBlockedUserPayload,
  ): Observable<ApiResponse<BlockedUser>> {
    return this.http.post<ApiResponse<BlockedUser>>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: UpdateBlockedUserPayload,
  ): Observable<ApiResponse<BlockedUser>> {
    return this.http.put<ApiResponse<BlockedUser>>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  updateStatus(
    id: number,
    isActive: boolean,
  ): Observable<ApiResponse<BlockedUser>> {
    return this.http.put<ApiResponse<BlockedUser>>(
      `${this.baseUrl}/${id}`,
      { is_active: isActive },
    );
  }

  delete(id: number): Observable<ApiResponse<BlockedUser>> {
    return this.http.delete<ApiResponse<BlockedUser>>(
      `${this.baseUrl}/${id}`,
    );
  }

  listStaffOptions(): Observable<ApiResponse<StaffOption[]>> {
    return this.http.get<ApiResponse<StaffOption[]>>(this.staffOptionsUrl);
  }
}
