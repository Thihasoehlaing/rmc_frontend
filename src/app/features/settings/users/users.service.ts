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

export interface DepartmentRecord {
  id: number;
  department_name: string;
  department_type: string;
  is_active: boolean;
}

export interface UserListFilters {
  nameEmail: string;
  jobTitle: string;
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
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly usersUrl = `${this.apiUrl}/api/settings/users`;
  private readonly rolesUrl = `${this.apiUrl}/api/settings/roles`;
  private readonly departmentsUrl = `${this.apiUrl}/api/settings/departments`;

  list(
    page: number,
    perPage: number,
    filters: UserListFilters,
  ): Observable<ApiResponse<PaginatedData<UserRecord>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    if (filters.nameEmail.trim()) {
      params = params.set('name_email', filters.nameEmail.trim());
    }
    if (filters.jobTitle.trim()) {
      params = params.set('job_title', filters.jobTitle.trim());
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

  listRoleOptions(): Observable<ApiResponse<RoleRecord[]>> {
    return this.http.get<ApiResponse<RoleRecord[]>>(`${this.rolesUrl}/options`);
  }

  listDepartments(): Observable<ApiResponse<DepartmentRecord[]>> {
    return this.http.get<ApiResponse<DepartmentRecord[]>>(this.departmentsUrl);
  }

  pairUserRole(
    username: string,
    roleId: number,
  ): Observable<ApiResponse<UserRecord>> {
    return this.http.post<ApiResponse<UserRecord>>(
      `${this.apiUrl}/api/settings/user-role`,
      { username, role_id: roleId },
    );
  }
}
