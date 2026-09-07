import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../../../shared/components/chart-tooltip/chart-tooltip.component';
import { DashboardChartDatum } from '../../models/rmc-dashboard-analytics.model';

interface HorizontalBar extends DashboardChartDatum {
  width: number;
  formattedValue: string;
  exactValue: string;
}

@Component({
  selector: 'app-dashboard-horizontal-bar',
  standalone: true,
  imports: [CommonModule, ChartTooltipComponent],
  templateUrl: './dashboard-horizontal-bar.component.html',
  styleUrls: ['./dashboard-horizontal-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHorizontalBarComponent {
  private readonly seriesValue = signal<DashboardChartDatum[]>([]);
  readonly activeKey = signal<string | null>(null);

  @Input({ required: true }) set series(value: DashboardChartDatum[]) {
    this.seriesValue.set(value ?? []);
  }

  @Input() currency = true;
  @Input() emptyLabel = 'No cost data';

  readonly total = computed(() => this.seriesValue().reduce((sum, item) => sum + item.value, 0));
  readonly max = computed(() => Math.max(1, ...this.seriesValue().map((item) => item.value)));
  readonly bars = computed<HorizontalBar[]>(() =>
    this.seriesValue().map((item) => ({
      ...item,
      width: item.value ? Math.max(3, (item.value / this.max()) * 100) : 0,
      formattedValue: this.formatValue(item.value, true),
      exactValue: this.formatValue(item.value),
    })),
  );

  formatValue(value: number, compact = false): string {
    return this.currency
      ? new Intl.NumberFormat('en-MY', {
          style: 'currency',
          currency: 'MYR',
          maximumFractionDigits: 0,
          ...(compact ? { notation: 'compact' as const, maximumFractionDigits: 1 } : {}),
        }).format(value)
      : new Intl.NumberFormat('en-MY').format(value);
  }
}
