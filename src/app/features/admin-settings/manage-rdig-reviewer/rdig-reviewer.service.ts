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

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

/** Compact shape returned by the list endpoint — no academic_staff_id, only the reviewer row's own id. */
export interface RdigReviewerRecord {
  id: number;
  is_active: boolean;
  staff_username: string | null;
  staff_fullname: string | null;
  staff_email: string | null;
  job_title: string | null;
  department: string | null;
}

@Injectable({ providedIn: 'root' })
export class RdigReviewerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/admin-settings/rdig-reviewers`;

  /** Lists reviewers already added to the RDIG reviewer pool. */
  list(
    params: {
      page?: number;
      perPage?: number;
      search?: string;
      departmentId?: number | null;
      status?: 'all' | 'active' | 'inactive';
    } = {},
  ): Observable<ApiResponse<PaginatedData<RdigReviewerRecord>>> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 1)
      .set('per_page', params.perPage ?? 100);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.departmentId !== null && params.departmentId !== undefined) {
      httpParams = httpParams.set('department_id', params.departmentId);
    }
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<RdigReviewerRecord>>>(this.baseUrl, {
      params: httpParams,
    });
  }

  /** Adds an academic staff member to the RDIG reviewer pool. */
  add(academicStaffId: number): Observable<ApiResponse<RdigReviewerRecord>> {
    return this.http.post<ApiResponse<RdigReviewerRecord>>(this.baseUrl, {
      academic_staff_id: academicStaffId,
      is_active: true,
    });
  }

  /** Removes a reviewer from the pool entirely (hard delete, matches the backend's DELETE route). */
  remove(reviewerId: number): Observable<ApiResponse<RdigReviewerRecord>> {
    return this.http.delete<ApiResponse<RdigReviewerRecord>>(`${this.baseUrl}/${reviewerId}`);
  }
}
