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

export type AccessType = 'ALLOW' | 'DENY';
export type MatchType = 'EXACT' | 'PREFIX';
export type AccessStatus = '' | 'Active' | 'Inactive';
export type DecisionFilter = '' | 'ALLOWED' | 'DENIED';

export interface SystemAccessUser {
  id: number;
  username: string;
  access_type: AccessType;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemAccessUserPayload {
  username: string;
  access_type: AccessType;
  reason: string | null;
  is_active: boolean;
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

export interface SystemAccessDepartmentRule {
  id: number;
  rule_name: string;
  match_type: MatchType;
  department_value: string;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemAccessDepartmentRulePayload {
  rule_name: string;
  match_type: MatchType;
  department_value: string;
  is_active: boolean;
}

export interface SystemAccessAuditLog {
  id: number;
  username: string;
  email: string | null;
  department: string | null;
  decision: 'ALLOWED' | 'DENIED';
  reason: string;
  matched_rule_type: string | null;
  matched_rule_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  attempted_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class SystemAccessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/settings/system-access`;

  listUsers(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: AccessStatus;
    accessType?: '' | AccessType;
  }): Observable<ApiResponse<PaginatedData<SystemAccessUser>>> {
    let httpParams = this.paginationParams(params.page, params.perPage);
    httpParams = this.setOptional(httpParams, 'search', params.search);
    httpParams = this.setOptional(httpParams, 'status', params.status);
    httpParams = this.setOptional(httpParams, 'access_type', params.accessType);
    return this.http.get<ApiResponse<PaginatedData<SystemAccessUser>>>(
      `${this.baseUrl}/users`,
      { params: httpParams },
    );
  }

  getUser(id: number): Observable<ApiResponse<SystemAccessUser>> {
    return this.http.get<ApiResponse<SystemAccessUser>>(`${this.baseUrl}/users/${id}`);
  }

  createUser(payload: SystemAccessUserPayload): Observable<ApiResponse<SystemAccessUser>> {
    return this.http.post<ApiResponse<SystemAccessUser>>(`${this.baseUrl}/users`, payload);
  }

  updateUser(id: number, payload: SystemAccessUserPayload): Observable<ApiResponse<SystemAccessUser>> {
    return this.http.put<ApiResponse<SystemAccessUser>>(`${this.baseUrl}/users/${id}`, payload);
  }

  deleteUser(id: number): Observable<ApiResponse<SystemAccessUser>> {
    return this.http.delete<ApiResponse<SystemAccessUser>>(`${this.baseUrl}/users/${id}`);
  }

  listDepartmentRules(params: {
    page: number;
    perPage: number;
    search?: string;
    status?: AccessStatus;
    matchType?: '' | MatchType;
  }): Observable<ApiResponse<PaginatedData<SystemAccessDepartmentRule>>> {
    let httpParams = this.paginationParams(params.page, params.perPage);
    httpParams = this.setOptional(httpParams, 'search', params.search);
    httpParams = this.setOptional(httpParams, 'status', params.status);
    httpParams = this.setOptional(httpParams, 'match_type', params.matchType);
    return this.http.get<ApiResponse<PaginatedData<SystemAccessDepartmentRule>>>(
      `${this.baseUrl}/department-rules`,
      { params: httpParams },
    );
  }

  getDepartmentRule(id: number): Observable<ApiResponse<SystemAccessDepartmentRule>> {
    return this.http.get<ApiResponse<SystemAccessDepartmentRule>>(`${this.baseUrl}/department-rules/${id}`);
  }

  createDepartmentRule(
    payload: SystemAccessDepartmentRulePayload,
  ): Observable<ApiResponse<SystemAccessDepartmentRule>> {
    return this.http.post<ApiResponse<SystemAccessDepartmentRule>>(
      `${this.baseUrl}/department-rules`,
      payload,
    );
  }

  updateDepartmentRule(
    id: number,
    payload: SystemAccessDepartmentRulePayload,
  ): Observable<ApiResponse<SystemAccessDepartmentRule>> {
    return this.http.put<ApiResponse<SystemAccessDepartmentRule>>(
      `${this.baseUrl}/department-rules/${id}`,
      payload,
    );
  }

  deleteDepartmentRule(id: number): Observable<ApiResponse<SystemAccessDepartmentRule>> {
    return this.http.delete<ApiResponse<SystemAccessDepartmentRule>>(
      `${this.baseUrl}/department-rules/${id}`,
    );
  }

  listAuditLogs(params: {
    page: number;
    perPage: number;
    search?: string;
    decision?: DecisionFilter;
    matchedRuleType?: string;
  }): Observable<ApiResponse<PaginatedData<SystemAccessAuditLog>>> {
    let httpParams = this.paginationParams(params.page, params.perPage);
    httpParams = this.setOptional(httpParams, 'search', params.search);
    httpParams = this.setOptional(httpParams, 'decision', params.decision);
    httpParams = this.setOptional(httpParams, 'matched_rule_type', params.matchedRuleType);
    return this.http.get<ApiResponse<PaginatedData<SystemAccessAuditLog>>>(
      `${this.baseUrl}/audit-logs`,
      { params: httpParams },
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

  private paginationParams(page: number, perPage: number): HttpParams {
    return new HttpParams().set('page', page).set('per_page', perPage);
  }

  private setOptional(params: HttpParams, key: string, value: string | null | undefined): HttpParams {
    const text = value?.trim();
    return text ? params.set(key, text) : params;
  }
}
