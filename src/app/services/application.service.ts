import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Human-readable labels for every workflow status. */
export const STATUS_LABELS: Record<string, string> = {
  fill_application:                         'New Application',
  draft:                                    'Draft',
  pending_applicant_resubmission_hos:       'Revision Required',
  pending_applicant_resubmission_reviewers: 'Revision Required',
  pending_hos:                              'Pending HOS Review',
  pending_hos_review:                       'Pending HOS Re-Review',
  rejected_hos:                             'Rejected by HOS',
  pending_rmc:                              'Pending RMC',
  pending_rmc_review:                       'Pending RMC Review',
  rejected_rmc:                             'Rejected by RMC',
  pending_reviewers:                        'Under Reviewer Assessment',
  pending_rdig_chair:                       'Pending RDIG Chair',
  rejected_rdig_chair:                      'Rejected by RDIG Chair',
  pending_vc:                               'Pending VC Approval',
  rejected_vc:                              'Rejected by VC',
  pending_ceo:                              'Pending CEO Approval',
  rejected_ceo:                             'Rejected by CEO',
  approved:                                 'Approved',
};

/** Badge colour per workflow status (matches the inbox colour palette). */
export const STATUS_COLORS: Record<string, string> = {
  fill_application:                         '#3b82f6',
  pending_applicant_resubmission_hos:       '#f59e0b',
  pending_applicant_resubmission_reviewers: '#f59e0b',
  pending_hos:                              '#a855f7',
  pending_hos_review:                       '#a855f7',
  rejected_hos:                             '#ef4444',
  pending_rmc:                              '#6366f1',
  pending_rmc_review:                       '#6366f1',
  rejected_rmc:                             '#ef4444',
  pending_reviewers:                        '#0ea5e9',
  pending_rdig_chair:                       '#10b981',
  rejected_rdig_chair:                      '#ef4444',
  pending_vc:                               '#14b8a6',
  rejected_vc:                              '#ef4444',
  pending_ceo:                              '#f97316',
  rejected_ceo:                             '#ef4444',
  approved:                                 '#22c55e',
};

/** Statuses that represent a fully closed workflow. */
export const TERMINAL_STATUSES = new Set([
  'approved', 'rejected_hos', 'rejected_rmc',
  'rejected_rdig_chair', 'rejected_vc', 'rejected_ceo',
]);

/**
 * Centralised service for fetching RDIG applications.
 *
 * Filtering is performed SERVER-SIDE (server.mjs) — the Angular client only
 * receives applications the current user is authorised to see.
 *
 * The user's identity is passed as query parameters so the server can apply
 * the correct visibility rules without fetching and filtering the entire
 * collection on the client.
 *
 * NOTE: In production these params would be derived from a verified JWT on
 * the server; query params are used here because this is a json-server demo.
 */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly BASE = 'http://localhost:3000';

  /** Builds the common identity params used by all application endpoints. */
  private identityParams(): HttpParams | null {
    const user = this.auth.currentUser();
    if (!user) return null;
    return new HttpParams()
      .set('userId',     user.id)
      .set('roles',      user.groups.join(','))
      .set('leaderName', user.name)
      .set('department', user.department ?? '');
  }

  /**
   * Inbox: applications currently awaiting the logged-in user's action.
   * Drafts are excluded server-side.
   */
  getInboxApplications(): Observable<any[]> {
    const params = this.identityParams();
    if (!params) return of([]);
    return this.http.get<any[]>(`${this.BASE}/applications`, { params });
  }

  /**
   * My Applications: ALL applications submitted by the current user as applicant
   * (matched by applicantUserId or leaderName). Includes drafts, pending, and
   * terminal applications. Used by the Drafts and Pending pages.
   */
  getMyApplications(): Observable<any[]> {
    const params = this.identityParams();
    if (!params) return of([]);
    return this.http.get<any[]>(`${this.BASE}/applications`, {
      params: params.set('view', 'my'),
    });
  }

  /**
   * History: applications that the current user has already acted on but that
   * are no longer in their active queue. For applicants this also covers
   * terminal applications (approved / rejected) regardless of history entries.
   */
  getApplicationHistory(): Observable<any[]> {
    const params = this.identityParams();
    if (!params) return of([]);
    return this.http.get<any[]>(`${this.BASE}/applications`, {
      params: params.set('view', 'history'),
    });
  }

  /** Convenience helpers shared across list components. */
  getTitle(app: any): string {
    return app.projectDetails?.title?.trim() || '(Untitled Application)';
  }

  getStatus(app: any): string {
    return app.workflow?.currentStatus ?? app.metadata?.applicationStatus ?? 'unknown';
  }

  getStatusLabel(app: any): string {
    return STATUS_LABELS[this.getStatus(app)] ?? this.getStatus(app);
  }

  getStatusColor(app: any): string {
    return STATUS_COLORS[this.getStatus(app)] ?? '#6b7280';
  }

  getSubmittedBy(app: any): string {
    return app.teamDetails?.leaderName ?? '—';
  }

  /** ISO string of the first workflow history entry (= first submission). */
  getSubmittedAt(app: any): string | null {
    const history: any[] = app.workflow?.history ?? [];
    return history.length ? history[0].timestamp : null;
  }

  /** ISO string of the most recent save (savedAt field) or last history entry. */
  getSavedAt(app: any): string | null {
    if (app.savedAt) return app.savedAt;
    const history: any[] = app.workflow?.history ?? [];
    return history.length ? history[history.length - 1].timestamp : null;
  }

  /** The action taken by the current user (from workflow history). */
  getUserAction(app: any, displayName: string): { action: string; timestamp: string; role: string } | null {
    const history: any[] = app.workflow?.history ?? [];
    const entry = [...history].reverse().find(h => h.performedBy === displayName);
    return entry ? { action: entry.action, timestamp: entry.timestamp, role: entry.role ?? '—' } : null;
  }

  /** Human-readable label for a form type identifier. */
  getFormTypeLabel(app: any): string {
    const type = app.formType ?? '';
    const labels: Record<string, string> = {
      RDIG:       'RDIG',
      Conference: 'Conference',
      Journal:    'Journal',
      RAGRA:      'RA/GRA',
    };
    return labels[type] ?? (type || '—');
  }

  /**
   * Derive the Angular route for opening an application based on its formType.
   * Falls back to /rdig if formType is missing (legacy records).
   */
  getFormRoute(app: any): string {
    switch (app.formType) {
      case 'Conference': return '/conference/application';
      case 'Journal':    return '/journal/application';
      case 'RAGRA':      return '/ragra';
      default:           return '/rdig';
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
