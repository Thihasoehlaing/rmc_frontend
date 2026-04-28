import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AppNotification } from '../interfaces/notification.interface';
import { NOTIFICATION_TEMPLATES } from '../core/constants/notification-templates';
import { BatchSitting } from '../interfaces/batch-sitting.interface';

const BASE = 'http://localhost:3000/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** All notifications for the current user, newest-first. */
  readonly notifications = signal<AppNotification[]>([]);

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length,
  );

  // ── Load ────────────────────────────────────────────────────────────────────

  /**
   * Fetches notifications for the current user from the server.
   * Returns the loaded list so callers can chain (e.g. batch check).
   */
  loadForCurrentUser(): Observable<AppNotification[]> {
    const user = this.auth.currentUser();
    if (!user) return of([]);

    const params = new HttpParams()
      .set('userId',     user.id)
      .set('roles',      user.groups.join(','))
      .set('department', user.department ?? '');

    return this.http.get<AppNotification[]>(BASE, { params }).pipe(
      tap(data => this.notifications.set(data)),
      catchError(err => {
        console.error('[NotificationService] load failed', err);
        return of([]);
      }),
    );
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  create(payload: Omit<AppNotification, 'id'>): Observable<AppNotification> {
    return this.http.post<AppNotification>(BASE, payload).pipe(
      tap(saved => {
        // Only add to the local signal if it would actually be visible to the current user.
        // This prevents cross-role "leakage" where an RMC notification appears in an
        // applicant's unread badge (and vice versa) right after creation.
        if (this.isVisibleToCurrentUser(saved)) {
          this.notifications.update(list => [saved, ...list]);
        }
      }),
      catchError(err => throwError(() => err)),
    );
  }

  /** Returns true when `n` would be returned by the server for the current user. */
  private isVisibleToCurrentUser(n: AppNotification): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    if (user.groups.includes('Admin')) return true;

    // Targeted at a specific user
    if (n.recipientUserId) return n.recipientUserId === user.id;

    // Role-based
    if (n.recipientRole && (user.groups as string[]).includes(n.recipientRole)) {
      if (n.recipientRole === 'HOS') {
        return !n.recipientDepartment || !user.department || n.recipientDepartment === user.department;
      }
      return true;
    }

    return false;
  }

  // ── Read state ──────────────────────────────────────────────────────────────

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`).pipe(
      tap(() => this.notifications.update(list => list.filter(n => n.id !== id))),
      catchError(err => throwError(() => err)),
    );
  }

  /**
   * Automatically deletes any ACTION notifications for this entity assigned
   * to the current user (e.g. they approved it, so their "pending review" clears).
   */
  resolveAction(entityId: number, entityType: string): void {
    const toDelete = this.notifications().filter(n => 
      n.type === 'ACTION' && 
      n.data.entityId === entityId && 
      n.data.entityType === entityType
    );
    toDelete.forEach(n => this.delete(n.id!).subscribe());
  }

  markAsRead(id: number): void {
    this.http.patch(`${BASE}/${id}`, { read: true }).subscribe();
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n),
    );
  }

  markAllRead(): void {
    this.notifications()
      .filter(n => !n.read)
      .forEach(n => this.http.patch(`${BASE}/${n.id!}`, { read: true }).subscribe());
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  // ── Template resolution ─────────────────────────────────────────────────────

  /**
   * Resolves a notification template with runtime context values.
   *
   * @param key     A key from NOTIFICATION_TEMPLATES
   * @param context Plain object whose keys replace {{placeholders}} in the message.
   *                Also carries recipientRole / recipientUserId / recipientDepartment / data.
   */
  build(key: string, context: Record<string, unknown>): Omit<AppNotification, 'id'> {
    const tpl = NOTIFICATION_TEMPLATES[key];
    const message = tpl.messageTemplate.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => String(context[k] ?? `{{${k}}}`),
    );
    return {
      key,
      scope:               tpl.scope,
      type:                tpl.type,
      title:               tpl.title,
      message,
      priority:            tpl.priority,
      read:                false,
      createdAt:           new Date().toISOString(),
      recipientRole:       context['recipientRole'] as string | undefined,
      recipientUserId:     context['recipientUserId'] as string | undefined,
      recipientDepartment: context['recipientDepartment'] as string | undefined,
      data:                (context['data'] as AppNotification['data']) ?? {},
    };
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  /** Computes a human-readable relative time string from a stored ISO timestamp. */
  relativeTime(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'ACTION':   return 'pending_actions';
      case 'INFO':     return 'info';
      case 'REMINDER': return 'alarm';
      case 'ALERT':    return 'warning';
      default:         return 'notifications';
    }
  }

  // ── Batch date checks ───────────────────────────────────────────────────────

  /**
   * Fires BATCH_IS_DONE / UPCOMING_BATCH_PLAN notifications when relevant
   * batch dates are reached. Deduplicates — will not re-fire if the
   * notification already exists for that batch.
   *
   * Only executes for RMC / Admin users.
   * Call after loadForCurrentUser() resolves so duplicate-check has data.
   */
  checkBatchNotifications(batches: BatchSitting[]): void {
    const user = this.auth.currentUser();
    if (!user?.groups.some(g => g === 'RMC' || g === 'Admin')) return;

    const today  = new Date().toISOString().substring(0, 10);
    const in7    = new Date(Date.now() + 7 * 86_400_000).toISOString().substring(0, 10);
    const stored = this.notifications();

    const alreadyHas = (key: string, batchId: number) =>
      stored.some(n => n.key === key && n.data['batchId'] === batchId);

    batches.forEach(batch => {
      if (batch.status === 'active' && batch.endDate <= today && !alreadyHas('BATCH_IS_DONE', batch.id)) {
        this.create(this.build('BATCH_IS_DONE', {
          batchName:    batch.batchName,
          recipientRole: 'RMC',
          data: { batchId: batch.id, batchName: batch.batchName, route: '/settings/batch-sitting' },
        })).subscribe();
      }

      if (batch.status === 'planned' && batch.startDate === in7 && !alreadyHas('UPCOMING_BATCH_PLAN', batch.id)) {
        this.create(this.build('UPCOMING_BATCH_PLAN', {
          batchName:    batch.batchName,
          recipientRole: 'RMC',
          data: { batchId: batch.id, batchName: batch.batchName, route: '/settings/batch-sitting' },
        })).subscribe();
      }
    });
  }
}
