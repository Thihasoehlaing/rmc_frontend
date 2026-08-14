import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import {
  DashboardChartDatum,
  DashboardExternalDepartmentPoint,
} from '../../models/rmc-dashboard-analytics.model';

interface ExternalCategorySegment extends DashboardChartDatum {
  height: number;
  formattedValue: string;
}

interface ExternalDepartmentViewPoint extends DashboardExternalDepartmentPoint {
  applicationHeight: number;
  categorySegments: ExternalCategorySegment[];
  formattedApplications: string;
  formattedFund: string;
  fundHeight: number;
}

interface ActiveExternalMetric {
  color: string;
  departmentCode: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard-external-department-chart',
  standalone: true,
  imports: [CommonModule, ChartTooltipComponent],
  templateUrl: './dashboard-external-department-chart.component.html',
  styleUrls: ['./dashboard-external-department-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardExternalDepartmentChartComponent {
  private readonly pointsValue = signal<DashboardExternalDepartmentPoint[]>([]);

  readonly fundColor = 'var(--color-success)';
  readonly activeMetric = signal<ActiveExternalMetric | null>(null);

  @Input({ required: true }) set points(value: DashboardExternalDepartmentPoint[]) {
    this.pointsValue.set(value ?? []);
  }

  readonly applicationMaximum = computed(() =>
    this.niceMaximum(this.pointsValue().map((point) => point.totalApplications)),
  );
  readonly fundMaximum = computed(() =>
    this.niceMaximum(this.pointsValue().map((point) => point.fundApproved)),
  );
  readonly applicationTicks = computed(() => this.ticks(this.applicationMaximum()));
  readonly fundTicks = computed(() => this.ticks(this.fundMaximum()));
  readonly chartMinimumWidth = computed(() => Math.max(880, this.pointsValue().length * 120));
  readonly categoryLegend = computed(() => this.pointsValue()[0]?.categories ?? []);
  readonly chartPoints = computed<ExternalDepartmentViewPoint[]>(() =>
    this.pointsValue().map((point) => ({
      ...point,
      applicationHeight: (point.totalApplications / this.applicationMaximum()) * 100,
      fundHeight: (point.fundApproved / this.fundMaximum()) * 100,
      formattedApplications: new Intl.NumberFormat('en-MY').format(point.totalApplications),
      formattedFund: this.formatFund(point.fundApproved),
      categorySegments: point.categories.map((category) => ({
        ...category,
        height: (category.value / this.applicationMaximum()) * 100,
        formattedValue: new Intl.NumberFormat('en-MY').format(category.value),
      })),
    })),
  );

  showCategory(point: ExternalDepartmentViewPoint, segment: ExternalCategorySegment): void {
    this.activeMetric.set({
      color: segment.color,
      departmentCode: point.departmentCode,
      label: segment.label,
      value: segment.formattedValue,
    });
  }

  showFund(point: ExternalDepartmentViewPoint): void {
    this.activeMetric.set({
      color: this.fundColor,
      departmentCode: point.departmentCode,
      label: 'Fund Approved',
      value: point.formattedFund,
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
