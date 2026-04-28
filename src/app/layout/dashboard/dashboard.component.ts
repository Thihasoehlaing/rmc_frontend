import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApplicationService, TERMINAL_STATUSES } from '../../services/application.service';

type DashboardApp = any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private appSvc = inject(ApplicationService);

  username = computed(() => this.auth.currentUser()?.name ?? 'Guest');

  loading = signal(true);
  error = signal<string | null>(null);
  private inboxApps = signal<DashboardApp[]>([]);
  private myApps = signal<DashboardApp[]>([]);
  private historyApps = signal<DashboardApp[]>([]);

  readonly requiredActionCount = computed(() => this.inboxApps().length);

  readonly pendingCount = computed(() =>
    this.myApps().filter(app => {
      if (app.isDraft === true) return false;
      const status = this.appSvc.getStatus(app);
      if (TERMINAL_STATUSES.has(status)) return false;
      if (status === 'fill_application') return false;
      return !(app.workflow?.nextRoles ?? []).includes('Applicant');
    }).length
  );

  readonly historyCount = computed(() => this.historyApps().length);

  readonly metrics = computed(() => [
    {
      label: 'Required Action',
      value: this.requiredActionCount(),
      icon: 'mark_email_unread',
      route: '/inbox',
      tone: 'primary',
    },
    {
      label: 'Pending Forms',
      value: this.pendingCount(),
      icon: 'pending_actions',
      route: '/submissions/pending',
      tone: 'warning',
    },
    {
      label: 'History',
      value: this.historyCount(),
      icon: 'history',
      route: '/submissions/history',
      tone: 'secondary',
    },
  ]);

  readonly recentApps = computed(() => {
    const byId = new Map<string, DashboardApp>();

    [...this.inboxApps(), ...this.myApps(), ...this.historyApps()].forEach(app => {
      const key = String(app.id ?? `${this.appSvc.getTitle(app)}-${this.appSvc.getSavedAt(app) ?? ''}`);
      if (!byId.has(key)) byId.set(key, app);
    });

    return [...byId.values()]
      .sort((a, b) => this.recentDate(b) - this.recentDate(a))
      .slice(0, 6);
  });

  ngOnInit(): void {
    forkJoin({
      inbox: this.appSvc.getInboxApplications(),
      mine: this.appSvc.getMyApplications(),
      history: this.appSvc.getApplicationHistory(),
    }).subscribe({
      next: ({ inbox, mine, history }) => {
        this.inboxApps.set(inbox);
        this.myApps.set(mine);
        this.historyApps.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load dashboard data. Make sure the local database server is running.');
        this.loading.set(false);
      },
    });
  }

  getTitle(app: DashboardApp): string {
    return this.appSvc.getTitle(app);
  }

  getStatusLabel(app: DashboardApp): string {
    return this.appSvc.getStatusLabel(app);
  }

  getStatusColor(app: DashboardApp): string {
    return this.appSvc.getStatusColor(app);
  }

  getFormTypeLabel(app: DashboardApp): string {
    return this.appSvc.getFormTypeLabel(app);
  }

  getFormRoute(app: DashboardApp): string {
    return this.appSvc.getFormRoute(app);
  }

  formatDate(app: DashboardApp): string {
    return this.appSvc.formatDate(this.appSvc.getSavedAt(app) ?? this.appSvc.getSubmittedAt(app));
  }

  private recentDate(app: DashboardApp): number {
    const date = this.appSvc.getSavedAt(app) ?? this.appSvc.getSubmittedAt(app);
    return date ? new Date(date).getTime() : 0;
  }
}
