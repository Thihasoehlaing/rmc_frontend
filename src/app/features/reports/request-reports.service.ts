import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ReportPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedReportData<T> {
  items: T[];
  pagination: ReportPagination;
}

export interface RequestReportRow {
  request_id: number;
  request_code: string | null;
  form_id: number;
  form_code: string | null;
  form_name: string | null;
  applicant_staff_username: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_department: string | null;
  status_code: string | null;
  status_name: string | null;
  submitted_at: string | null;
}

export interface RequestReportQuery {
  page?: number;
  perPage?: number;
  formCode?: string;
  requestCode?: string;
  dateFrom?: string;
  dateTo?: string;
  externalFields?: string[];
}

export interface ExternalReportFieldOption {
  value: string;
  label: string;
  source: 'External Form' | 'External Detail' | string;
}

@Injectable({ providedIn: 'root' })
export class RequestReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports/requests`;

  list(
    query: RequestReportQuery,
  ): Observable<ApiResponse<PaginatedReportData<RequestReportRow>>> {
    return this.http.get<ApiResponse<PaginatedReportData<RequestReportRow>>>(this.baseUrl, {
      params: this.toParams(query),
    });
  }

  exportExcel(query: RequestReportQuery): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      observe: 'response',
      params: this.toParams(query),
      responseType: 'blob',
    });
  }

  getExternalFieldOptions(): Observable<ApiResponse<ExternalReportFieldOption[]>> {
    return this.http.get<ApiResponse<ExternalReportFieldOption[]>>(
      `${environment.apiUrl}/reports/external-fields`,
    );
  }

  private toParams(query: RequestReportQuery): HttpParams {
    let params = new HttpParams();

    if (query.page != null) params = params.set('page', query.page);
    if (query.perPage != null) params = params.set('per_page', query.perPage);
    if (query.formCode) params = params.set('form_code', query.formCode);
    if (query.requestCode?.trim()) params = params.set('request_code', query.requestCode.trim());
    if (query.dateFrom) params = params.set('date_from', query.dateFrom);
    if (query.dateTo) params = params.set('date_to', query.dateTo);
    if (query.externalFields?.length) {
      params = params.set('external_fields', query.externalFields.join(','));
    }

    return params;
  }
}
