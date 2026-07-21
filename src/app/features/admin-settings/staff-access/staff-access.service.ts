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

export interface StaffAccessRecordApi {
  id: number;
  staff_username: string;
  staff_name: string | null;
  staff_email: string | null;
  department: string | null;
  job_title: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  has_access: boolean;
  blocked_date: string | null;
  blocked_by: string | null;
  reason: string | null;
}

export interface StaffAccessListData {
  items: StaffAccessRecordApi[];
  pagination: ApiPagination;
}

export interface StaffAccessBulkBlockData {
  items: StaffAccessRecordApi[];
  blocked_count: number;
}

export interface StaffOption {
  id: number;
  staff_id?: number;
  username: string;
  fullname: string | null;
  email: string | null;
  staff_email?: string | null;
  department: string | null;
  staff_type?: string | null;
  job_title?: string | null;
  is_active?: boolean;
}

export interface StaffAccessListParams {
  page: number;
  perPage: number;
  status?: 'all' | 'active' | 'blocked';
  department?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class StaffAccessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly baseUrl =
    `${this.apiUrl}/admin-settings/staff-access`;

  list(params: StaffAccessListParams): Observable<ApiResponse<StaffAccessListData>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.department?.trim()) {
      httpParams = httpParams.set('department', params.department.trim());
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<ApiResponse<StaffAccessListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  block(id: number, reason?: string): Observable<ApiResponse<StaffAccessRecordApi>> {
    return this.http.post<ApiResponse<StaffAccessRecordApi>>(
      `${this.baseUrl}/${id}/block`,
      reason ? { reason } : {},
    );
  }

  bulkBlock(usernames: string[], reason?: string): Observable<ApiResponse<StaffAccessBulkBlockData>> {
    return this.http.post<ApiResponse<StaffAccessBulkBlockData>>(
      `${this.baseUrl}/block`,
      reason ? { usernames, reason } : { usernames },
    );
  }

  unblock(id: number, reason?: string): Observable<ApiResponse<StaffAccessRecordApi>> {
    return this.http.post<ApiResponse<StaffAccessRecordApi>>(
      `${this.baseUrl}/${id}/unblock`,
      reason ? { reason } : {},
    );
  }

  listStaff(search = ''): Observable<ApiResponse<StaffOption[]>> {
    let params = new HttpParams();
    const text = search.trim();
    if (text) {
      params = params.set('search', text);
    }
    return this.http.get<ApiResponse<StaffOption[]>>(`${this.apiUrl}/master-data/staff`, {
      params,
    });
  }
}
