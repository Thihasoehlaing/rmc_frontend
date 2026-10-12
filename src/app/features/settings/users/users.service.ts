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

export interface UserRecord {
  id: number;
  username: string;
  fullname: string | null;
  email: string | null;
  distinguished_name: string | null;
  department: string | null;
  role_id: number | null;
  role_code: string | null;
  role_name: string | null;
  job_title: string | null;
  photo_url: string | null;
  is_student: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RoleRecord {
  id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
}

export interface RoleOption {
  id: number;
  role_code: string;
  role_name: string;
}

export interface DepartmentRecord {
  id: number;
  department_name: string;
  department_type: string;
  is_active: boolean;
}

export interface UserListFilters {
  name: string;
  email: string;
  roleId: number | null;
  accountType: '' | 'Staff' | 'Student';
  departmentId: number | null;
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly usersUrl = `${this.apiUrl}/settings/users`;
  private readonly roleOptionsUrl = `${this.apiUrl}/settings/roles/options`;
  private readonly departmentsUrl = `${this.apiUrl}/master-data/departments`;

  list(
    page: number,
    perPage: number,
    filters: UserListFilters,
  ): Observable<ApiResponse<PaginatedData<UserRecord>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    if (filters.name.trim()) {
      params = params.set('name', filters.name.trim());
    }
    if (filters.email.trim()) {
      params = params.set('email', filters.email.trim());
    }
    if (filters.roleId !== null) {
      params = params.set('role_id', filters.roleId);
    }
    if (filters.accountType) {
      params = params.set('account_type', filters.accountType);
    }
    if (filters.departmentId !== null) {
      params = params.set('department_id', filters.departmentId);
    }

    return this.http.get<ApiResponse<PaginatedData<UserRecord>>>(
      this.usersUrl,
      { params },
    );
  }

  listRoleOptions(): Observable<ApiResponse<RoleOption[]>> {
    return this.http.get<ApiResponse<RoleOption[]>>(this.roleOptionsUrl);
  }

  listDepartments(): Observable<ApiResponse<DepartmentRecord[]>> {
    return this.http.get<ApiResponse<DepartmentRecord[]>>(this.departmentsUrl);
  }

  pairUserRole(
    username: string,
    roleId: number,
  ): Observable<ApiResponse<UserRecord>> {
    return this.http.post<ApiResponse<UserRecord>>(
      `${this.apiUrl}/settings/user-role`,
      { username, role_id: roleId },
    );
  }

  assignUserRole(userId: number, roleId: number): Observable<ApiResponse<UserRecord>> {
    return this.http.patch<ApiResponse<UserRecord>>(
      `${this.usersUrl}/${userId}/role`,
      { role_id: roleId },
    );
  }
}
