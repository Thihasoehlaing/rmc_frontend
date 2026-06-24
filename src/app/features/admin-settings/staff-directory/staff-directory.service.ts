import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiPagination,
  ApiResponse,
  DepartmentRecord,
  StaffRecord,
} from '../../settings/academic-staff/academic-staff.service';

export type {
  ApiPagination,
  ApiResponse,
  DepartmentRecord,
  StaffRecord,
} from '../../settings/academic-staff/academic-staff.service';

export type StaffStatusFilter = '' | 'Active' | 'Inactive';

export interface StaffListParams {
  page: number;
  perPage: number;
  search?: string;
  departmentId?: number | null;
  status?: StaffStatusFilter;
  type?: string;
}

export interface StaffSyncResult {
  total?: number;
  created?: number;
  updated?: number;
  deactivated?: number;
  [key: string]: unknown;
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class StaffDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly staffUrl = `${this.apiUrl}/api/settings/staff`;
  private readonly syncUrl = `${this.staffUrl}/sync`;
  private readonly departmentsUrl = `${this.apiUrl}/api/settings/departments`;

  list(
    params: StaffListParams,
  ): Observable<ApiResponse<PaginatedData<StaffRecord>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.departmentId !== null && params.departmentId !== undefined) {
      httpParams = httpParams.set('department_id', params.departmentId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.type?.trim()) {
      httpParams = httpParams.set('type', params.type.trim());
    }

    return this.http.get<ApiResponse<PaginatedData<StaffRecord>>>(this.staffUrl, {
      params: httpParams,
    });
  }

  sync(force = true): Observable<ApiResponse<StaffSyncResult>> {
    return this.http.post<ApiResponse<StaffSyncResult>>(this.syncUrl, { force });
  }

  listDepartments(
    includeInactive = false,
  ): Observable<ApiResponse<DepartmentRecord[]>> {
    const params = new HttpParams().set(
      'include_inactive',
      includeInactive ? 'true' : 'false',
    );
    return this.http.get<ApiResponse<DepartmentRecord[]>>(this.departmentsUrl, {
      params,
    });
  }
}
