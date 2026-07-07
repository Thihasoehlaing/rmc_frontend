import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  RequestSummaryDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { detailRoute, formTypeLabel, requestIdOf, STATUS_COLORS } from '../../core/services/request-display.util';
import { DashboardSkeletonComponent } from '../../shared/components/dashboard-skeleton/dashboard-skeleton.component';

type DashboardApp = RequestSummaryDto;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardSkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private requests = inject(WorkflowRequestsService);

  username = computed(() => this.auth.currentUser()?.name ?? 'Guest');

  loading = signal(true);
  error = signal<string | null>(null);
  private recentApps = signal<DashboardApp[]>([]);
  private requiredActions = signal(0);
  private pendingApplications = signal(0);
  private historyApplications = signal(0);

  readonly isAdmin = computed(() =>
    this.auth.currentUser()?.groups.includes('Admin') ?? false
  );

  currentPage = signal(0);
  readonly pageSize = 5;

  readonly visibleRecentApps = computed(() => {
    return this.recentApps().sort((a, b) => this.recentDate(b) - this.recentDate(a));
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
    this.requiredActions()
  );

  readonly pendingCount = computed(() =>
    this.pendingApplications()
  );

  readonly historyCount = computed(() => this.historyApplications());

  readonly metrics = computed(() => [
    {
      label: 'Required Action',
      value: this.requiredActionCount(),
      icon: 'mark_email_unread',
      route: '/submissions/inbox',
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
    this.loading.set(true);
    this.requests.getDashboard().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (res) => {
        this.recentApps.set(res.data?.recent ?? []);
        this.requiredActions.set(res.data?.metrics.required_action ?? 0);
        this.pendingApplications.set(res.data?.metrics.pending ?? 0);
        this.historyApplications.set(res.data?.metrics.history ?? 0);
      },
      error: () => {
        this.error.set('Could not load dashboard data. Please try again.');
      },
    });
  }

  getTitle(app: DashboardApp): string {
    return app.title?.trim() || '(Untitled Application)';
  }

  getStatusLabel(app: DashboardApp): string {
    return app.status_name || app.status_code || 'Unknown';
  }

  getStatusColor(app: DashboardApp): string {
    return STATUS_COLORS[app.status_code] ?? '#6b7280';
  }

  getFormTypeLabel(app: DashboardApp): string {
    return formTypeLabel(app.form_code, app.form_name);
  }

  getFormRoute(app: DashboardApp): string {
    return detailRoute(app);
  }

  formatDate(app: DashboardApp): string {
    const iso = app.updated_at ?? app.submitted_at ?? app.created_at ?? null;
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  private recentDate(app: DashboardApp): number {
    const date = app.updated_at ?? app.submitted_at ?? app.created_at;
    return date ? new Date(date).getTime() : 0;
  }

  private getAppKey(app: DashboardApp): string {
    return String(requestIdOf(app) ?? `${this.getFormTypeLabel(app)}-${this.getTitle(app)}-${app.updated_at ?? ''}`);
  }

  private currentUserCanActOnApp(app: DashboardApp): boolean {
    return !!app.can_act;
  }
}
