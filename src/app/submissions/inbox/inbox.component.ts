import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  private applicationService = inject(ApplicationService);

  applications = signal<any[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);

  /** Badge colour per workflow status */
  readonly statusColors: Record<string, string> = {
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

  ngOnInit(): void {
    // Filtering is now done server-side — no local filterForCurrentUser call needed.
    this.applicationService.getInboxApplications().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        this.loading.set(false);
      },
    });
  }

  getTitle(app: any): string {
    return app.projectDetails?.title?.trim() || '(Untitled Application)';
  }

  getStatus(app: any): string {
    return app.workflow?.currentStatus ?? app.metadata?.applicationStatus ?? 'unknown';
  }

  getStatusColor(app: any): string {
    return this.statusColors[this.getStatus(app)] ?? '#6b7280';
  }

  getSubmittedBy(app: any): string {
    return app.teamDetails?.leaderName ?? '—';
  }

  getLastAction(app: any): string {
    const history: any[] = app.workflow?.history ?? [];
    if (!history.length) return '—';
    const last = history[history.length - 1];
    return `${last.role}: ${last.action} (${new Date(last.timestamp).toLocaleDateString('en-GB')})`;
  }

  getNextActors(app: any): string {
    const roles: string[] = app.workflow?.nextRoles ?? [];
    return roles.length ? roles.join(', ') : '—';
  }

  applicationLink(app: any): string {
    return `/rdig?id=${app.id}`;
  }
}
