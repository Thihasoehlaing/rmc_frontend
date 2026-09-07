import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import { DashboardDepartmentComparisonPoint } from '../../models/rmc-dashboard-analytics.model';

interface DepartmentChartPoint extends DashboardDepartmentComparisonPoint {
  applicationHeight: number;
  fundHeight: number;
  formattedApplications: string;
  formattedFund: string;
}

interface ActiveDepartmentMetric {
  color: string;
  departmentCode: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard-department-comparison-chart',
  standalone: true,
  imports: [CommonModule, ChartTooltipComponent],
  templateUrl: './dashboard-department-comparison-chart.component.html',
  styleUrls: ['./dashboard-department-comparison-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDepartmentComparisonChartComponent {
  private readonly pointsValue = signal<DashboardDepartmentComparisonPoint[]>([]);

  readonly applicationColor = 'var(--color-primary)';
  readonly fundColor = 'var(--color-success)';
  readonly activeMetric = signal<ActiveDepartmentMetric | null>(null);

  @Input({ required: true }) set points(value: DashboardDepartmentComparisonPoint[]) {
    this.pointsValue.set(value ?? []);
  }

  readonly applicationMaximum = computed(() =>
    this.niceMaximum(this.pointsValue().map((point) => point.approvedApplications)),
  );
  readonly fundMaximum = computed(() =>
    this.niceMaximum(this.pointsValue().map((point) => point.fundApproved)),
  );
  readonly applicationTicks = computed(() => this.ticks(this.applicationMaximum()));
  readonly fundTicks = computed(() => this.ticks(this.fundMaximum()));
  readonly chartMinimumWidth = computed(() => Math.max(860, this.pointsValue().length * 104));
  readonly chartPoints = computed<DepartmentChartPoint[]>(() =>
    this.pointsValue().map((point) => ({
      ...point,
      applicationHeight: (point.approvedApplications / this.applicationMaximum()) * 100,
      fundHeight: (point.fundApproved / this.fundMaximum()) * 100,
      formattedApplications: new Intl.NumberFormat('en-MY').format(point.approvedApplications),
      formattedFund: this.formatFund(point.fundApproved),
    })),
  );

  showMetric(point: DepartmentChartPoint, metric: 'approvedApplications' | 'fundApproved'): void {
    const applications = metric === 'approvedApplications';
    this.activeMetric.set({
      color: applications ? this.applicationColor : this.fundColor,
      departmentCode: point.departmentCode,
      label: applications ? 'Completed Applications' : 'Fund Approved',
      value: applications ? point.formattedApplications : point.formattedFund,
    });
  }

  formatApplicationTick(value: number): string {
    return Math.round(value).toString();
  }

  formatFund(value: number): string {
    if (value >= 1_000_000) {
      return `RM${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 2).replace(/\.0+$/, '')}M`;
    }
    if (value >= 1_000) return `RM${Math.round(value / 1_000)}K`;
    return `RM${Math.round(value)}`;
  }

  private ticks(maximum: number): number[] {
    return [1, 0.75, 0.5, 0.25, 0].map((ratio) => maximum * ratio);
  }

  private niceMaximum(values: number[]): number {
    const maximum = Math.max(1, ...values);
    const magnitude = 10 ** Math.floor(Math.log10(maximum));
    const normalized = maximum / magnitude;
    const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return rounded * magnitude;
  }
}
