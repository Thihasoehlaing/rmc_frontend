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

export interface NotificationLog {
  id: number;
  notification_id: number;
  notification_recipient_id: number | null;
  request_id: number | null;
  request_code: string | null;
  form_code: string | null;
  request_title: string | null;
  template_code: string | null;
  event_type: string;
  title: string;
  message: string;
  redirect_url: string | null;
  from_status_code: string | null;
  to_status_code: string | null;
  action_code: string | null;
  priority: string;
  created_by_username: string | null;
  created_by_name: string | null;
  recipient_username: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_type: string | null;
  is_read: boolean | null;
  mail_status: string | null;
  mail_sent_at: string | null;
  created_at: string | null;
  recipient_created_at: string | null;
}

export interface DingDongTestMailPayload {
  title: string;
  message_html: string;
}

export interface DingDongTestMailResult {
  recipient: string;
  title: string;
  mail_status: string;
  dingdong_status_code: number | null;
  dingdong_response: string | null;
  error_message: string | null;
  sent_at: string | null;
}

export interface NotificationCheckCreateResult {
  checked_count: number;
  processed_approval_count: number;
  skipped_existing_count: number;
  skipped_missing_request_count: number;
  created_notification_count: number;
  created_notification_ids: number[];
  failed_count: number;
  failures: Array<{
    approval_id: number;
    request_id: number;
    request_code: string;
    action_code: string;
    from_status_code: string | null;
    to_status_code: string | null;
    error: string;
  }>;
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

  listNotificationLogs(query: MonitoringQuery): Observable<ApiResponse<PaginatedData<NotificationLog>>> {
    let params = this.baseParams(query);

    if (query.status) params = params.set('mail_status', query.status);
    if (query.requestCode?.trim()) params = params.set('request_code', query.requestCode.trim());

    return this.http.get<ApiResponse<PaginatedData<NotificationLog>>>(
      `${this.settingsUrl}/notification-logs`,
      { params },
    );
  }

  resendNotificationMail(notificationRecipientId: number): Observable<ApiResponse<NotificationLog>> {
    return this.http.post<ApiResponse<NotificationLog>>(
      `${this.settingsUrl}/notification-logs/${notificationRecipientId}/resend`,
      {},
    );
  }

  checkAndCreateNotifications(): Observable<ApiResponse<NotificationCheckCreateResult>> {
    return this.http.post<ApiResponse<NotificationCheckCreateResult>>(
      `${this.settingsUrl}/notification-logs/check-create`,
      {},
    );
  }

  sendDingDongTestMail(payload: DingDongTestMailPayload): Observable<ApiResponse<DingDongTestMailResult>> {
    return this.http.post<ApiResponse<DingDongTestMailResult>>(
      `${this.settingsUrl}/dingdong/test-mail`,
      payload,
    );
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
