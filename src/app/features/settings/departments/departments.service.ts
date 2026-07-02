import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiPagination, ApiResponse } from '../academic-staff/academic-staff.service';

export interface DepartmentListRecord {
  id: number;
  department_name: string;
  department_type: string;
  staff_count: number;
  is_active: boolean;
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly departmentsUrl = `${this.apiUrl}/api/settings/departments`;

  list(params: {
    page: number;
    perPage: number;
    name?: string;
  }): Observable<ApiResponse<PaginatedData<DepartmentListRecord>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.name?.trim()) {
      httpParams = httpParams.set('name', params.name.trim());
    }

    return this.http.get<ApiResponse<PaginatedData<DepartmentListRecord>>>(
      this.departmentsUrl,
      { params: httpParams },
    );
  }
}
