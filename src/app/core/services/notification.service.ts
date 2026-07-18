import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AppNotification, NotificationPriority } from '../interfaces/notification.interface';
import { NOTIFICATION_TEMPLATES } from '../constants/notification-templates';
import { BatchSitting } from '../interfaces/batch-sitting.interface';
import { environment } from '../../../environments/environment';
import { detailRoute, formRoute } from './request-display.util';

const BASE = `${environment.apiUrl.replace(/\/$/, '')}/rmc/notifications`;
const POPUP_PAGE_SIZE = 10;

export interface NotificationUnreadCount {
  unreadCount: number;
  latestNotificationId?: number;
  latestNotificationDate?: string;
}

export interface NotificationPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface NotificationListResponse {
  items: AppNotification[];
  pagination: NotificationPagination;
  meta: NotificationUnreadCount;
}

export interface NotificationListParams {
  page: number;
  pageSize: number;
  search?: string;
  applicationId?: string;
  formCode?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  read?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  notificationKey?: string;
  batchId?: number;
  entityId?: number;
  entityType?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface BackendNotification {
  id: number;
  recipient_id?: number;
  request_id?: number | null;
  form_code?: string | null;
  request_no?: string | null;
  request_title?: string | null;
  event_type?: string | null;
  title?: string | null;
  message?: string | null;
  redirect_url?: string | null;
  priority?: string | null;
  is_read?: boolean;
  created_at?: string | null;
  recipient_type?: string | null;
}

interface BackendPaginated<T> {
  items: T[];
  pagination: NotificationPagination;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Latest popup notifications only, newest first. */
  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly latestNotificationId = signal<number | null>(null);
  readonly latestNotificationDate = signal<string | null>(null);
  readonly popupHasMore = signal(false);

  private readonly popupCacheMeta = signal<NotificationUnreadCount | null>(null);

  loadUnreadCount(): Observable<NotificationUnreadCount> {
    if (!this.auth.currentUser()) return of(this.emptyMeta());

    return this.http.get<ApiResponse<{ unread_count: number }>>(`${BASE}/unread-count`).pipe(
      map(res => ({ unreadCount: res.data?.unread_count ?? 0 })),
      tap(meta => this.setUnreadMeta(meta)),
      catchError(err => {
        console.error('[NotificationService] unread count load failed', err);
        const fallback = this.emptyMeta();
        this.setUnreadMeta(fallback);
        return of(fallback);
      }),
    );
  }

  loadPopupNotifications(force = false): Observable<AppNotification[]> {
    return this.loadUnreadCount().pipe(
      switchMap(meta => {
        const cached = this.notifications();
        const cachedMeta = this.popupCacheMeta();
        const canReuse = !force && cached.length > 0 && this.sameMeta(meta, cachedMeta);

        if (canReuse) return of(cached);

        return this.listNotifications({
          page: 1,
          pageSize: POPUP_PAGE_SIZE,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        }).pipe(
          tap(response => {
            this.notifications.set(response.items.slice(0, POPUP_PAGE_SIZE));
            this.popupHasMore.set(response.pagination.total_items > POPUP_PAGE_SIZE);
            this.popupCacheMeta.set(response.meta);
          }),
          map(response => response.items.slice(0, POPUP_PAGE_SIZE)),
        );
      }),
    );
  }

  /** Backward-compatible load: now fetches only the latest popup page. */
  loadForCurrentUser(): Observable<AppNotification[]> {
    return this.loadPopupNotifications(true);
  }

  listNotifications(params: NotificationListParams): Observable<NotificationListResponse> {
    if (!this.auth.currentUser()) {
      return of({
        items: [],
        pagination: {
          current_page: 1,
          per_page: params.pageSize,
          total_items: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
        meta: this.emptyMeta(),
      });
    }

    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.pageSize);

    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.formCode || params.applicationId) httpParams = httpParams.set('form_code', params.formCode || params.applicationId || '');
    if (params.dateFrom) httpParams = httpParams.set('date_from', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('date_to', params.dateTo);
    if (params.status) httpParams = httpParams.set('event_type', params.status);
    if (params.read === 'true') httpParams = httpParams.set('is_read', true);
    if (params.read === 'false') httpParams = httpParams.set('is_read', false);
    if (params.notificationKey) httpParams = httpParams.set('event_type', params.notificationKey);

    return this.http.get<ApiResponse<BackendPaginated<BackendNotification>>>(BASE, { params: httpParams }).pipe(
      map(res => {
        const items = (res.data?.items ?? []).map(mapBackendNotification);
        return {
          items,
          pagination: res.data?.pagination ?? {
            current_page: 1,
            per_page: params.pageSize,
            total_items: items.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
          meta: { unreadCount: this.unreadCount() },
        };
      }),
      tap(response => this.setUnreadMeta(response.meta)),
      catchError(err => throwError(() => err)),
    );
  }

  create(payload: Omit<AppNotification, 'id'>): Observable<AppNotification> {
    return this.http.post<AppNotification>(BASE, payload).pipe(
      tap(saved => {
        if (this.isVisibleToCurrentUser(saved)) {
          this.notifications.update(list => [saved, ...list].slice(0, POPUP_PAGE_SIZE));
          if (!saved.read) this.decrementSafe(-1);
          this.latestNotificationId.set(saved.id ?? null);
          this.latestNotificationDate.set(saved.createdAt ?? null);
          this.popupCacheMeta.set(null);
        }
      }),
      catchError(err => throwError(() => err)),
    );
  }

  delete(id: number): Observable<void> {
    const current = this.notifications().find(n => n.id === id);

    return this.http.delete<ApiResponse<unknown>>(`${BASE}/${id}`).pipe(
      map(() => void 0),
      tap(() => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        if (current && !current.read) this.decrementSafe(1);
        this.popupCacheMeta.set(null);
      }),
      catchError(err => throwError(() => err)),
    );
  }

  /** Deletes matching action notifications without requiring a full local notification list. */
  resolveAction(entityId: number, entityType: string): void {
    this.listNotifications({
      page: 1,
      pageSize: 50,
      status: 'required_action',
      entityId,
      entityType,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    }).subscribe({
      next: response => {
        response.items
          .filter(n => n.type === 'ACTION')
          .forEach(n => this.delete(n.id!).subscribe());
      },
      error: err => console.error('[NotificationService] resolve action failed', err),
    });
  }

  markAsRead(id: number, wasUnread = true): void {
    const current = this.notifications().find(n => n.id === id);
    if (current?.read) return;

    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n),
    );

    if (!current || wasUnread) {
      this.decrementSafe(1);
      this.syncPopupMetaUnreadCount();
    }

    this.http.patch(`${BASE}/${id}/read`, {}).subscribe({
      error: err => {
        console.error('[NotificationService] mark read failed', err);
        this.loadUnreadCount().subscribe();
      },
    });
  }

  markAllRead(): void {
    const unreadLoaded = this.notifications().filter(n => !n.read);
    if (unreadLoaded.length === 0) return;

    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.decrementSafe(unreadLoaded.length);
    this.syncPopupMetaUnreadCount();

    this.http.patch(`${BASE}/read-all`, {}).subscribe({
      error: err => {
        console.error('[NotificationService] mark all read failed', err);
        this.loadUnreadCount().subscribe();
      },
    });
  }

  build(key: string, context: Record<string, unknown>): Omit<AppNotification, 'id'> {
    const tpl = NOTIFICATION_TEMPLATES[key];
    const message = tpl.messageTemplate.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => String(context[k] ?? `{{${k}}}`),
    );
    return {
      key,
      scope: tpl.scope,
      type: tpl.type,
      title: tpl.title,
      message,
      priority: tpl.priority,
      read: false,
      createdAt: new Date().toISOString(),
      recipientRole: context['recipientRole'] as string | undefined,
      recipientUserId: context['recipientUserId'] as string | undefined,
      recipientDepartment: context['recipientDepartment'] as string | undefined,
      data: (context['data'] as AppNotification['data']) ?? {},
    };
  }

  relativeTime(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'ACTION': return 'pending_actions';
      case 'INFO': return 'info';
      case 'REMINDER': return 'alarm';
      case 'ALERT': return 'warning';
      default: return 'notifications';
    }
  }

  /** Date-based batch notifications now use targeted duplicate checks, not a full list. */
  checkBatchNotifications(batches: BatchSitting[]): void {
    const user = this.auth.currentUser();
    if (!user?.groups.some(g => g === 'RMC' || g === 'Admin')) return;

    const today = new Date().toISOString().substring(0, 10);
    const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().substring(0, 10);

    batches.forEach(batch => {
      if (batch.status === 'active' && batch.endDate <= today) {
        this.createBatchNotificationIfMissing('BATCH_IS_DONE', batch, {
          batchName: batch.batchName,
          recipientRole: 'RMC',
          data: { batchId: batch.id, batchName: batch.batchName, route: '/admin-settings/batch-sitting' },
        });
      }

      if (batch.status === 'planned' && batch.startDate === in7) {
        this.createBatchNotificationIfMissing('UPCOMING_BATCH_PLAN', batch, {
          batchName: batch.batchName,
          recipientRole: 'RMC',
          data: { batchId: batch.id, batchName: batch.batchName, route: '/admin-settings/batch-sitting' },
        });
      }
    });
  }

  private createBatchNotificationIfMissing(
    key: string,
    batch: BatchSitting,
    context: Record<string, unknown>,
  ): void {
    this.notificationExists(key, batch.id).subscribe({
      next: exists => {
        if (!exists) this.create(this.build(key, context)).subscribe();
      },
      error: err => console.error('[NotificationService] batch duplicate check failed', err),
    });
  }

  private notificationExists(notificationKey: string, batchId: number): Observable<boolean> {
    return this.listNotifications({
      page: 1,
      pageSize: 1,
      notificationKey,
      batchId,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    }).pipe(map(response => response.items.length > 0));
  }

  private currentUserParams(): HttpParams | null {
    const user = this.auth.currentUser();
    if (!user) return null;

    return new HttpParams()
      .set('userId', user.id)
      .set('roles', user.groups.join(','))
      .set('department', user.department ?? '');
  }

  private isVisibleToCurrentUser(n: AppNotification): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    if (user.groups.includes('Admin')) return true;

    if (n.recipientUserId) return n.recipientUserId === user.id;

    if (n.recipientRole && (user.groups as string[]).includes(n.recipientRole)) {
      if (n.recipientRole === 'HOS') {
        return !n.recipientDepartment || !user.department || n.recipientDepartment === user.department;
      }
      return true;
    }

    return false;
  }

  private setUnreadMeta(meta: NotificationUnreadCount): void {
    this.unreadCount.set(Math.max(0, Number(meta.unreadCount) || 0));
    this.latestNotificationId.set(meta.latestNotificationId ?? null);
    this.latestNotificationDate.set(meta.latestNotificationDate ?? null);
  }

  private sameMeta(first: NotificationUnreadCount, second: NotificationUnreadCount | null): boolean {
    if (!second) return false;
    return first.unreadCount === second.unreadCount &&
      first.latestNotificationId === second.latestNotificationId &&
      first.latestNotificationDate === second.latestNotificationDate;
  }

  private emptyMeta(): NotificationUnreadCount {
    return { unreadCount: 0 };
  }

  private syncPopupMetaUnreadCount(): void {
    const meta = this.popupCacheMeta();
    if (!meta) return;
    this.popupCacheMeta.set({ ...meta, unreadCount: this.unreadCount() });
  }

  private decrementSafe(amount: number): void {
    this.unreadCount.update(count => Math.max(0, count - amount));
  }
}

export function mapBackendNotification(item: BackendNotification): AppNotification {
  const eventType = (item.event_type ?? 'INFO').toUpperCase();
  const isAction =
    eventType.includes('ACTION') ||
    eventType.includes('REVIEW') ||
    eventType.includes('RESUBMISSION');
  const formCode = item.form_code?.trim().toUpperCase();
  const isApplicantResubmission = eventType.includes('RESUBMISSION');
  const requestRoute =
    item.request_id != null && isApplicantResubmission && ['CONFERENCE', 'JOURNAL'].includes(formCode ?? '')
      ? `${formRoute(formCode)}?request_id=${item.request_id}`
      : item.request_id != null
        ? detailRoute({
            request_id: item.request_id,
            form_code: item.form_code,
            request_code: item.request_no,
          })
        : item.redirect_url ?? undefined;

  return {
    // Mark-read/delete endpoints use the notification id, not recipient_id.
    id: item.id,
    key: item.event_type ?? 'BACKEND_NOTIFICATION',
    scope: formCode === 'RDIG' ? 'RDIG' : 'GLOBAL',
    type: isAction ? 'ACTION' : 'INFO',
    title: item.title ?? 'Notification',
    message: item.message ?? '',
    priority: toPriority(item.priority),
    read: !!item.is_read,
    createdAt: item.created_at ?? new Date().toISOString(),
    recipientRole: item.recipient_type ?? undefined,
    data: {
      entityId: item.request_id ?? undefined,
      entityType: formCode ?? undefined,
      entityModule: formCode?.toLowerCase(),
      requestCode: item.request_no ?? undefined,
      recipientId: item.recipient_id,
      route: requestRoute,
    },
  };
}

function toPriority(priority: string | null | undefined): NotificationPriority {
  const value = (priority ?? '').toLowerCase();
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}


