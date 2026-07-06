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

export interface DepartmentRecord {
  id: number;
  department_name: string;
  department_type: string;
  is_active: boolean;
}

export interface StaffRecord {
  id: number;
  staff_id: number;
  username: string;
  staff_code: string | null;
  fullname: string | null;
  email: string | null;
  staff_email: string | null;
  department: string | null;
  job_title: string | null;
  photo_url: string | null;
  staff_type?: string | null;
  synced_at?: string | null;
  is_active: boolean;
  label: string | null;
}

export interface AcademicStaffRecord {
  id: number;
  staff_id?: number;
  staff?: Partial<StaffRecord>;
  username?: string | null;
  staff_code?: string | null;
  fullname?: string | null;
  email?: string | null;
  staff_email?: string | null;
  department?: string | null;
  job_title?: string | null;
  photo_url?: string | null;
  departments?: DepartmentRecord[];
  label?: string | null;
  is_active: boolean;
  staff_is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AcademicStaffPayload {
  username: string;
  is_active: boolean;
}

export interface AcademicStaffByDepartmentPayload {
  department_id: number;
  type?: 'fulltime' | 'parttime' | 'contract';
  is_active: boolean;
}

export interface AcademicStaffByDepartmentResult {
  department_id: number;
  department_name: string;
  added_count: number;
  skipped_count: number;
  added: AcademicStaffRecord[];
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class AcademicStaffService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly academicStaffUrl =
    `${this.apiUrl}/rmc/settings/academic-staff`;
  private readonly staffUrl = `${this.apiUrl}/rmc/settings/staff`;
  private readonly departmentsUrl =
    `${this.apiUrl}/rmc/master-data/departments`;

  list(params: {
    page: number;
    perPage: number;
    search?: string;
    name?: string;
    email?: string;
    jobTitle?: string;
    departmentId?: number | null;
    status?: '' | 'Active' | 'Inactive';
  }): Observable<ApiResponse<PaginatedData<AcademicStaffRecord>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.name?.trim()) {
      httpParams = httpParams.set('name', params.name.trim());
    }
    if (params.email?.trim()) {
      httpParams = httpParams.set('email', params.email.trim());
    }
    if (params.jobTitle?.trim()) {
      httpParams = httpParams.set('job_title', params.jobTitle.trim());
    }
    if (params.departmentId !== null && params.departmentId !== undefined) {
      httpParams = httpParams.set('department_id', params.departmentId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<AcademicStaffRecord>>>(
      this.academicStaffUrl,
      { params: httpParams },
    );
  }

  get(id: number): Observable<ApiResponse<AcademicStaffRecord>> {
    return this.http.get<ApiResponse<AcademicStaffRecord>>(
      `${this.academicStaffUrl}/${id}`,
    );
  }

  create(
    payload: AcademicStaffPayload,
  ): Observable<ApiResponse<AcademicStaffRecord>> {
    return this.http.post<ApiResponse<AcademicStaffRecord>>(
      this.academicStaffUrl,
      payload,
    );
  }

  update(
    id: number,
    payload: AcademicStaffPayload,
  ): Observable<ApiResponse<AcademicStaffRecord>> {
    return this.http.put<ApiResponse<AcademicStaffRecord>>(
      `${this.academicStaffUrl}/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<ApiResponse<AcademicStaffRecord>> {
    return this.http.delete<ApiResponse<AcademicStaffRecord>>(
      `${this.academicStaffUrl}/${id}`,
    );
  }

  createByDepartment(
    payload: AcademicStaffByDepartmentPayload,
  ): Observable<ApiResponse<AcademicStaffByDepartmentResult>> {
    return this.http.post<ApiResponse<AcademicStaffByDepartmentResult>>(
      `${this.academicStaffUrl}/by-department`,
      payload,
    );
  }

  listDepartments(): Observable<ApiResponse<DepartmentRecord[]>> {
    return this.http.get<ApiResponse<DepartmentRecord[]>>(
      this.departmentsUrl,
    );
  }

  listStaff(filters: {
    search?: string;
    departmentId?: number | null;
  } = {}): Observable<ApiResponse<PaginatedData<StaffRecord>>> {
    let params = new HttpParams()
      .set('page', 1)
      .set('per_page', 100)
      .set('status', 'Active');

    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (
      filters.departmentId !== null &&
      filters.departmentId !== undefined
    ) {
      params = params.set('department_id', filters.departmentId);
    }

    return this.http.get<ApiResponse<PaginatedData<StaffRecord>>>(
      this.staffUrl,
      { params },
    );
  }
}
