import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService, TERMINAL_STATUSES } from '../../core/services/application.service';

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
  private adminApps = signal<DashboardApp[]>([]);
  private historyApps = signal<DashboardApp[]>([]);

  readonly isAdmin = computed(() =>
    this.auth.currentUser()?.groups.includes('Admin') ?? false
  );

  currentPage = signal(0);
  readonly pageSize = 5;

  readonly visibleRecentApps = computed(() => {
    const byId = new Map<string, DashboardApp>();

    const sourceApps = this.isAdmin()
      ? [...this.adminApps(), ...this.inboxApps(), ...this.myApps()]
      : [...this.inboxApps(), ...this.myApps()];

    sourceApps.forEach(app => {
      const key = this.getAppKey(app);
      if (!byId.has(key)) byId.set(key, app);
    });

    return [...byId.values()]
      .sort((a, b) => this.recentDate(b) - this.recentDate(a));
  });

  readonly paginatedApps = computed(() => {
    const apps = this.visibleRecentApps();
    const startIndex = this.currentPage() * this.pageSize;
    return apps.slice(startIndex, startIndex + this.pageSize);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.visibleRecentApps().length / this.pageSize);
  });

  readonly pageIndexes = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index)
  );

  readonly requiredActionCount = computed(() =>
    this.inboxApps().filter(app => this.needsAction(app)).length
  );

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

  needsAction(app: DashboardApp): boolean {
    const status = this.appSvc.getStatus(app);
    if (TERMINAL_STATUSES.has(status) || app.isDraft) {
      return false;
    }
    return this.currentUserCanActOnApp(app);
  }

  nextPage() {
    if ((this.currentPage() + 1) < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  ngOnInit(): void {
    forkJoin({
      inbox: this.appSvc.getInboxApplications(),
      mine: this.appSvc.getMyApplications(),
      admin: this.appSvc.getAdminApplications(),
      history: this.appSvc.getApplicationHistory(),
    }).subscribe({
      next: ({ inbox, mine, admin, history }) => {
        this.inboxApps.set(inbox);
        this.myApps.set(mine);
        this.adminApps.set(admin);
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

  private getAppKey(app: DashboardApp): string {
    return String(app.id ?? `${this.appSvc.getFormTypeLabel(app)}-${this.appSvc.getTitle(app)}-${this.appSvc.getSavedAt(app) ?? ''}`);
  }

  private currentUserCanActOnApp(app: DashboardApp): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;

    const nextRoles: string[] = app.workflow?.nextRoles ?? [];
    const nextUsers: string[] = app.workflow?.nextUsers ?? [];

    if (nextUsers.includes(user.id)) return true;

    const actionableRoles = user.groups.filter(group => group !== 'Admin');
    if (actionableRoles.some(role => nextRoles.includes(role))) {
      if (nextRoles.includes('HOS')) {
        const appDepartment = app.teamDetails?.department ?? '';
        return !appDepartment || !user.department || appDepartment === user.department;
      }
      return true;
    }

    if (nextRoles.includes('Applicant')) {
      return String(app.metadata?.applicantUserId ?? '') === user.id ||
        (app.teamDetails?.leaderName ?? '') === user.name;
    }

    return false;
  }
}
