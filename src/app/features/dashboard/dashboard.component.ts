import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { detailRoute, formTypeLabel, STATUS_COLORS } from '../../core/services/request-display.util';
import {
  DashboardFormBreakdownDto,
  DashboardStatusDistributionDto,
  DashboardSummaryDto,
  DashboardTrendPointDto,
  RequestSummaryDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { DashboardSkeletonComponent } from '../../shared/components/dashboard-skeleton/dashboard-skeleton.component';
import { dashboardConfigFor, DashboardMetricConfig } from './dashboard.config';

const EMPTY_METRICS: DashboardSummaryDto['metrics'] = {
  required_action: 0,
  pending: 0,
  completed_rejected: 0,
  all_applications: 0,
  approved_by_me: 0,
  rejected_by_me: 0,
  decided_by_me: 0,
  total_submitted: 0,
  new_today: 0,
};

const EMPTY_DISTRIBUTION: DashboardStatusDistributionDto = {
  approved: 0,
  rejected: 0,
  pending: 0,
  draft: 0,
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardSkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly requests = inject(WorkflowRequestsService);

  readonly user = computed(() => this.auth.currentUser());
  readonly username = computed(() => this.user()?.name ?? 'Guest');
  readonly view = computed(() => dashboardConfigFor(this.user()));
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly metricsData = signal(EMPTY_METRICS);
  readonly formBreakdown = signal<DashboardFormBreakdownDto[]>([]);
  readonly statusDistribution = signal(EMPTY_DISTRIBUTION);
  readonly monthlySubmissions = signal<DashboardTrendPointDto[]>([]);
  private readonly recentApps = signal<RequestSummaryDto[]>([]);

  readonly metrics = computed(() => this.view().metrics.map(metric => ({
    ...metric,
    value: this.metricsData()[metric.key],
    helper: this.metricHelper(metric),
  })));

  readonly visibleRecentApps = computed(() => [...this.recentApps()].sort(
    (a, b) => this.recentDate(b) - this.recentDate(a),
  ).slice(0, 6));

  readonly maxFormValue = computed(() => Math.max(
    1,
    ...this.formBreakdown().map(item => this.formTotal(item)),
  ));

  readonly distributionTotal = computed(() => Object.values(this.statusDistribution())
    .reduce((total, value) => total + value, 0));

  readonly donutBackground = computed(() => {
    const data = this.statusDistribution();
    const total = this.distributionTotal() || 1;
    const approved = data.approved / total * 100;
    const rejected = approved + data.rejected / total * 100;
    const pending = rejected + data.pending / total * 100;
    return `conic-gradient(var(--color-success) 0 ${approved}%, var(--color-error) ${approved}% ${rejected}%, var(--color-primary) ${rejected}% ${pending}%, var(--color-warning) ${pending}% 100%)`;
  });

  readonly maxMonthlyValue = computed(() => Math.max(
    1,
    ...this.monthlySubmissions().map(item => item.count),
  ));

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.requests.getDashboard().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        const data = response.data;
        this.metricsData.set({ ...EMPTY_METRICS, ...(data?.metrics ?? {}) });
        this.formBreakdown.set(data?.form_breakdown ?? []);
        this.statusDistribution.set(data?.status_distribution ?? EMPTY_DISTRIBUTION);
        this.monthlySubmissions.set(data?.monthly_submissions ?? []);
        this.recentApps.set(data?.recent ?? []);
      },
      error: () => this.error.set('Could not load dashboard data. Please try again.'),
    });
  }

  metricHelper(metric: DashboardMetricConfig): string {
    if (metric.key === 'decided_by_me') {
      return `${this.metricsData().approved_by_me} approved · ${this.metricsData().rejected_by_me} rejected`;
    }
    if (metric.key === 'completed_rejected') {
      const data = this.statusDistribution();
      return `${data.approved} complete · ${data.rejected} rejected`;
    }
    if (metric.key === 'all_applications') {
      return `${this.metricsData().total_submitted} submitted · ${this.statusDistribution().draft} drafts`;
    }
    return metric.helper;
  }

  formTotal(item: DashboardFormBreakdownDto): number {
    return this.view().audience === 'rmc_admin' ? item.total_submitted : item.all_applications;
  }

  formPrimaryValue(item: DashboardFormBreakdownDto): number {
    return this.view().audience === 'rmc_admin'
      ? item.approved_by_me + item.rejected_by_me
      : item.pending;
  }

  barWidth(value: number): number {
    return value ? Math.max(4, value / this.maxFormValue() * 100) : 0;
  }

  monthHeight(value: number): number {
    return value ? Math.max(8, value / this.maxMonthlyValue() * 100) : 3;
  }

  getTitle(app: RequestSummaryDto): string {
    return app.title?.trim() || '(Untitled application)';
  }

  getStatusLabel(app: RequestSummaryDto): string {
    return app.status_name || app.status_code || 'Unknown';
  }

  getStatusColor(app: RequestSummaryDto): string {
    return STATUS_COLORS[app.status_code] ?? 'var(--color-text-muted)';
  }

  getFormTypeLabel(app: RequestSummaryDto): string {
    return formTypeLabel(app.form_code, app.form_name);
  }

  getFormRoute(app: RequestSummaryDto): string {
    return detailRoute(app);
  }

  needsAction(app: RequestSummaryDto): boolean {
    return !!app.can_act;
  }

  formatDate(app: RequestSummaryDto): string {
    const iso = app.updated_at ?? app.submitted_at ?? app.created_at;
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private recentDate(app: RequestSummaryDto): number {
    const dateValue = app.updated_at ?? app.submitted_at ?? app.created_at;
    return dateValue ? new Date(dateValue).getTime() : 0;
  }
}
