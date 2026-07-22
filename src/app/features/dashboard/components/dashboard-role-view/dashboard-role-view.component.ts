import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { detailRoute, formTypeLabel, STATUS_COLORS } from '../../../../core/services/request-display.util';
import {
  DashboardFormBreakdownDto,
  DashboardStatusDistributionDto,
  DashboardSummaryDto,
  DashboardTrendPointDto,
  RequestSummaryDto,
} from '../../../../core/services/workflow-requests.service';
import { DashboardMetricConfig, DashboardViewConfig } from '../../dashboard.config';

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
  history: 0,
  drafts: 0,
  failed_mail: 0,
};

const EMPTY_DISTRIBUTION: DashboardStatusDistributionDto = {
  approved: 0,
  rejected: 0,
  pending: 0,
};

@Component({
  selector: 'app-dashboard-role-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-role-view.component.html',
  styleUrls: ['../../dashboard.component.scss'],
})
export class DashboardRoleViewComponent {
  private readonly summaryValue = signal<DashboardSummaryDto | null>(null);
  private readonly viewValue = signal<DashboardViewConfig | null>(null);

  @Input({ required: true }) set summary(value: DashboardSummaryDto | null) {
    this.summaryValue.set(value);
  }

  @Input({ required: true }) set view(value: DashboardViewConfig) {
    this.viewValue.set(value);
  }

  @Input() username = 'Guest';

  readonly viewConfig = computed(() => this.viewValue() as DashboardViewConfig);
  readonly metricsData = computed(() => ({ ...EMPTY_METRICS, ...(this.summaryValue()?.metrics ?? {}) }));
  readonly formBreakdown = computed<DashboardFormBreakdownDto[]>(() => this.summaryValue()?.form_breakdown ?? []);
  readonly statusDistribution = computed<DashboardStatusDistributionDto>(
    () => this.summaryValue()?.status_distribution ?? EMPTY_DISTRIBUTION,
  );
  readonly monthlySubmissions = computed<DashboardTrendPointDto[]>(
    () => this.summaryValue()?.monthly_submissions ?? [],
  );
  readonly recentApps = computed<RequestSummaryDto[]>(() => this.summaryValue()?.recent ?? []);

  readonly metrics = computed(() =>
    this.viewConfig().metrics.map((metric) => ({
      ...metric,
      value: this.metricsData()[metric.key] ?? 0,
      helper: this.metricHelper(metric),
    })),
  );

  readonly visibleRecentApps = computed(() =>
    [...this.recentApps()]
      .sort((a, b) => this.recentDate(b) - this.recentDate(a))
      .slice(0, 6),
  );

  readonly maxFormValue = computed(() =>
    Math.max(1, ...this.formBreakdown().map((item) => this.formTotal(item))),
  );

  readonly distributionTotal = computed(() =>
    Object.values(this.statusDistribution()).reduce((total, value) => total + value, 0),
  );

  readonly donutBackground = computed(() => {
    const data = this.statusDistribution();
    const total = this.distributionTotal() || 1;
    const approved = (data.approved / total) * 100;
    const rejected = approved + (data.rejected / total) * 100;
    return `conic-gradient(var(--color-success) 0 ${approved}%, var(--color-error) ${approved}% ${rejected}%, var(--color-primary) ${rejected}% 100%)`;
  });

  readonly maxMonthlyValue = computed(() =>
    Math.max(1, ...this.monthlySubmissions().map((item) => item.count)),
  );

  metricHelper(metric: DashboardMetricConfig): string {
    if (metric.key === 'decided_by_me') {
      return `${this.metricsData().approved_by_me} approved · ${this.metricsData().rejected_by_me} rejected`;
    }
    if (metric.key === 'completed_rejected') {
      const data = this.statusDistribution();
      return `${data.approved} complete · ${data.rejected} rejected`;
    }
    if (metric.key === 'all_applications') {
      return `${this.metricsData().total_submitted} submitted · ${this.metricsData().drafts} drafts`;
    }
    return metric.helper;
  }

  formTotal(item: DashboardFormBreakdownDto): number {
    const audience = this.viewConfig().audience;
    return audience === 'rmc_admin' || audience === 'system_admin'
      ? item.total_submitted
      : item.all_applications;
  }

  formPrimaryValue(item: DashboardFormBreakdownDto): number {
    const audience = this.viewConfig().audience;
    return audience === 'rmc_admin' || audience === 'system_admin'
      ? item.total_submitted
      : item.pending;
  }

  barWidth(value: number): number {
    return value ? Math.max(4, (value / this.maxFormValue()) * 100) : 0;
  }

  monthHeight(value: number): number {
    return value ? Math.max(8, (value / this.maxMonthlyValue()) * 100) : 3;
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
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private recentDate(app: RequestSummaryDto): number {
    const dateValue = app.updated_at ?? app.submitted_at ?? app.created_at;
    return dateValue ? new Date(dateValue).getTime() : 0;
  }
}
