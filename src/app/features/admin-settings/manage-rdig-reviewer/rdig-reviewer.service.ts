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

/** Compact shape returned by the list endpoint. */
export interface RdigReviewerRecord {
  id: number;
  academic_staff_id: number | null;
  is_active: boolean;
  staff_username: string | null;
  staff_fullname: string | null;
  staff_email: string | null;
  photo_url: string | null;
  job_title: string | null;
  department: string | null;
}

export interface UpdateRdigReviewerPayload {
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RdigReviewerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-settings/rdig-reviewers`;

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
  add(academicStaffId: number, isActive = true): Observable<ApiResponse<RdigReviewerRecord>> {
    return this.http.post<ApiResponse<RdigReviewerRecord>>(this.baseUrl, {
      academic_staff_id: academicStaffId,
      is_active: isActive,
    });
  }

  /** Updates reviewer metadata, currently used to activate/deactivate a reviewer. */
  update(
    reviewerId: number,
    payload: UpdateRdigReviewerPayload,
  ): Observable<ApiResponse<RdigReviewerRecord>> {
    return this.http.put<ApiResponse<RdigReviewerRecord>>(`${this.baseUrl}/${reviewerId}`, payload);
  }

  /** Removes a reviewer from the pool entirely (hard delete, matches the backend's DELETE route). */
  remove(reviewerId: number): Observable<ApiResponse<RdigReviewerRecord>> {
    return this.http.delete<ApiResponse<RdigReviewerRecord>>(`${this.baseUrl}/${reviewerId}`);
  }
}
