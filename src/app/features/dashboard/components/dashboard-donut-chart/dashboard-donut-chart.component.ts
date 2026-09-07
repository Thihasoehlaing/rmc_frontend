import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import { DashboardChartDatum } from '../../models/rmc-dashboard-analytics.model';

interface DonutSegment extends DashboardChartDatum {
  dashArray: string;
  dashOffset: number;
  formattedValue: string;
  labelX: number;
  labelY: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard-donut-chart',
  standalone: true,
  imports: [CommonModule, ChartTooltipComponent],
  templateUrl: './dashboard-donut-chart.component.html',
  styleUrls: ['./dashboard-donut-chart.component.scss'],
})
export class DashboardDonutChartComponent {
  private readonly seriesValue = signal<DashboardChartDatum[]>([]);
  private readonly variantValue = signal<'donut' | 'pie'>('donut');
  readonly activeSegment = signal<DonutSegment | null>(null);

  @Input({ required: true }) set series(value: DashboardChartDatum[]) {
    this.seriesValue.set(value ?? []);
  }

  @Input() currency = false;
  @Input() compact = false;
  @Input() showCenterTotal = true;
  @Input() showLegend = false;
  @Input() set variant(value: 'donut' | 'pie') {
    this.variantValue.set(value ?? 'donut');
  }
  @Input() centerLabel = 'Total';
  @Input() emptyLabel = 'No data in this range';

  readonly isPie = computed(() => this.variantValue() === 'pie');
  readonly chartRadius = computed(() => (this.isPie() ? 26 : 52));

  readonly total = computed(() =>
    this.seriesValue().reduce((sum, item) => sum + Math.max(0, item.value), 0),
  );

  readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (!total) return [];

    const radius = this.chartRadius();
    const circumference = 2 * Math.PI * radius;
    let consumed = 0;
    return this.seriesValue()
      .filter((item) => item.value > 0)
      .map((item) => {
        const percentage = item.value / total;
        const length = percentage * circumference;
        const middleAngle =
          -Math.PI / 2 + (consumed / circumference + percentage / 2) * 2 * Math.PI;
        const labelRadius = 34;
        const segment: DonutSegment = {
          ...item,
          dashArray: `${length} ${circumference - length}`,
          dashOffset: -consumed,
          formattedValue: this.formatValue(item.value),
          labelX: 64 + Math.cos(middleAngle) * labelRadius,
          labelY: 64 + Math.sin(middleAngle) * labelRadius,
          percentage: percentage * 100,
        };
        consumed += length;
        return segment;
      });
  });

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
}
