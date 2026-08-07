import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

import { DashboardLinePoint } from '../../models/rmc-dashboard-analytics.model';

interface PlotPoint extends DashboardLinePoint {
  x: number;
  y: number;
  formattedValue: string;
  axisLabel: string;
  axisDetail: string;
  axisLabelY: number;
}

@Component({
  selector: 'app-dashboard-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-line-chart.component.html',
  styleUrls: ['./dashboard-line-chart.component.scss'],
})
export class DashboardLineChartComponent {
  private readonly width = 720;
  private readonly height = 338;
  private readonly left = 58;
  private readonly right = 22;
  private readonly top = 22;
  private readonly bottom = 120;
  private readonly pointsValue = signal<DashboardLinePoint[]>([]);

  @Input({ required: true }) set points(value: DashboardLinePoint[]) {
    this.pointsValue.set(value ?? []);
  }

  @Input() currency = false;
  @Input() emptyLabel = 'No trend data in this range';

  readonly total = computed(() => this.pointsValue().reduce((sum, point) => sum + point.value, 0));

  readonly maxValue = computed(() =>
    Math.max(1, ...this.pointsValue().map((point) => point.value)),
  );

  readonly plotPoints = computed<PlotPoint[]>(() => {
    const points = this.pointsValue();
    const plotWidth = this.width - this.left - this.right;
    const plotHeight = this.height - this.top - this.bottom;
    const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
    const labelRows = points.length > 12 ? 3 : points.length > 6 ? 2 : 1;

    return points.map((point, index) => {
      const labelParts = this.axisLabelParts(point.label);
      return {
        ...point,
        x: this.left + step * index,
        y: this.top + plotHeight - (point.value / this.maxValue()) * plotHeight,
        formattedValue: this.formatValue(point.value),
        axisLabel: labelParts.label,
        axisDetail: labelParts.detail,
        axisLabelY: 244 + (index % labelRows) * 32,
      };
    });
  });

  readonly polyline = computed(() =>
    this.plotPoints()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );

  readonly gridLines = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: this.top + (this.height - this.top - this.bottom) * (1 - ratio),
      label: this.formatAxisValue(this.maxValue() * ratio),
    })),
  );

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

  private axisLabelParts(label: string): { label: string; detail: string } {
    const weeklyParts = label.split(' – Week ');
    if (weeklyParts.length === 2) {
      return { label: weeklyParts[0], detail: `Week ${weeklyParts[1]}` };
    }

    const years = [...label.matchAll(/’\d{2}/g)].map((match) => match[0]);
    return {
      label: label.replace(/\s?’\d{2}/g, ''),
      detail: [...new Set(years)].join('–'),
    };
  }
}
