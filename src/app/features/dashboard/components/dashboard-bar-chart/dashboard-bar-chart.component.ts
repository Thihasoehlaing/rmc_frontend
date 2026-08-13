import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import {
  DashboardChartDatum,
  DashboardStackedBarPoint,
} from '../../models/rmc-dashboard-analytics.model';

interface StackedSegment extends DashboardChartDatum {
  width: number;
  formattedValue: string;
}

interface StackedBar extends DashboardStackedBarPoint {
  formattedTotal: string;
  segments: StackedSegment[];
}

interface ActiveBarSegment extends StackedSegment {
  period: string;
}

@Component({
  selector: 'app-dashboard-bar-chart',
  standalone: true,
  imports: [CommonModule, ChartTooltipComponent],
  templateUrl: './dashboard-bar-chart.component.html',
  styleUrls: ['./dashboard-bar-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBarChartComponent {
  private readonly pointsValue = signal<DashboardStackedBarPoint[]>([]);
  readonly activeSegment = signal<ActiveBarSegment | null>(null);

  @Input({ required: true }) set points(value: DashboardStackedBarPoint[]) {
    this.pointsValue.set(value ?? []);
  }

  @Input() currency = false;
  @Input() totalLabel = '';
  @Input() emptyLabel = 'No bar chart data in this range';

  readonly maxValue = computed(() =>
    Math.max(1, ...this.pointsValue().map((point) => point.total)),
  );
  readonly axisTicks = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      ratio,
      label: this.formatAxisValue(this.maxValue() * ratio),
    })),
  );

  readonly bars = computed<StackedBar[]>(() =>
    this.pointsValue().map((point) => ({
      ...point,
      formattedTotal: this.formatValue(point.total),
      segments: point.segments
        .filter((segment) => segment.value > 0)
        .map((segment) => ({
          ...segment,
          width: (segment.value / this.maxValue()) * 100,
          formattedValue: this.formatValue(segment.value),
        })),
    })),
  );

  showSegment(segment: StackedSegment, period: string): void {
    this.activeSegment.set({ ...segment, period });
  }

  formatValue(value: number): string {
    if (this.currency) {
      return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-MY').format(value);
  }

  private formatAxisValue(value: number): string {
    if (!this.currency) return Math.round(value).toString();
    if (value >= 1_000_000) return `RM${(value / 1_000_000).toFixed(1)}m`;
    if (value >= 1_000) return `RM${Math.round(value / 1_000)}k`;
    return `RM${Math.round(value)}`;
  }
}
