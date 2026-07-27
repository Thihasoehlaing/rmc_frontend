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

export interface MonitoringQuery {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  requestCode?: string;
  syncSource?: string;
  triggeredBy?: string;
}

export interface MailLog {
  id: number;
  notification_recipient_id: number;
  notification_id: number | null;
  request_id: number | null;
  request_code: string | null;
  form_code: string | null;
  title: string | null;
  recipient_username: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  mail_status: string;
  dingdong_status_code: number | null;
  dingdong_response: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
}

export interface StaffSyncLog {
  id: number;
  sync_source: string;
  sync_status: string;
  total_records: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly http = inject(HttpClient);
  private readonly settingsUrl = `${environment.apiUrl}/settings`;

  listMailLogs(query: MonitoringQuery): Observable<ApiResponse<PaginatedData<MailLog>>> {
    let params = this.baseParams(query);

    if (query.status) params = params.set('mail_status', query.status);
    if (query.requestCode?.trim()) params = params.set('request_code', query.requestCode.trim());

    return this.http.get<ApiResponse<PaginatedData<MailLog>>>(`${this.settingsUrl}/mail-logs`, {
      params,
    });
  }

  listStaffSyncLogs(query: MonitoringQuery): Observable<ApiResponse<PaginatedData<StaffSyncLog>>> {
    let params = this.baseParams(query);

    if (query.status) params = params.set('sync_status', query.status);
    if (query.syncSource?.trim()) params = params.set('sync_source', query.syncSource.trim());
    if (query.triggeredBy?.trim()) params = params.set('triggered_by', query.triggeredBy.trim());

    return this.http.get<ApiResponse<PaginatedData<StaffSyncLog>>>(
      `${this.settingsUrl}/staff-sync-logs`,
      { params },
    );
  }

  private baseParams(query: MonitoringQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query.page)
      .set('per_page', query.perPage);

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.dateFrom) params = params.set('date_from', query.dateFrom);
    if (query.dateTo) params = params.set('date_to', query.dateTo);

    return params;
  }
}
