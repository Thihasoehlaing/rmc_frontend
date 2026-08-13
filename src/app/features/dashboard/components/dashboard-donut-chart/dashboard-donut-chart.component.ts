import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import { DashboardChartDatum } from '../../models/rmc-dashboard-analytics.model';

interface DonutSegment extends DashboardChartDatum {
  dashArray: string;
  dashOffset: number;
  formattedValue: string;
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
  private readonly radius = 52;
  private readonly circumference = 2 * Math.PI * this.radius;
  private readonly seriesValue = signal<DashboardChartDatum[]>([]);
  readonly activeSegment = signal<DonutSegment | null>(null);

  @Input({ required: true }) set series(value: DashboardChartDatum[]) {
    this.seriesValue.set(value ?? []);
  }

  @Input() currency = false;
  @Input() compact = false;
  @Input() showCenterTotal = true;
  @Input() showLegend = false;
  @Input() centerLabel = 'Total';
  @Input() emptyLabel = 'No data in this range';

  readonly total = computed(() =>
    this.seriesValue().reduce((sum, item) => sum + Math.max(0, item.value), 0),
  );

  readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (!total) return [];

    let consumed = 0;
    return this.seriesValue()
      .filter((item) => item.value > 0)
      .map((item) => {
        const percentage = item.value / total;
        const length = percentage * this.circumference;
        const segment: DonutSegment = {
          ...item,
          dashArray: `${length} ${this.circumference - length}`,
          dashOffset: -consumed,
          formattedValue: this.formatValue(item.value),
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
