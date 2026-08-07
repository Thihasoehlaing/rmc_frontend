import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  DashboardFormBreakdownDto,
  DashboardSummaryDto,
} from '../../../../core/services/workflow-requests.service';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { DashboardViewConfig } from '../../dashboard.config';
import {
  ALL_FORMS_FILTER,
  DASHBOARD_FORM_COLORS,
  DashboardChartType,
  DashboardChartDatum,
  DashboardLinePoint,
  DashboardStackedBarPoint,
  DashboardTrendMode,
  RmcDashboardRecord,
} from '../../models/rmc-dashboard-analytics.model';
import { RmcDashboardAnalyticsService } from '../../services/rmc-dashboard-analytics.service';
import { DashboardBarChartComponent } from '../dashboard-bar-chart/dashboard-bar-chart.component';
import { DashboardDonutChartComponent } from '../dashboard-donut-chart/dashboard-donut-chart.component';
import { DashboardLineChartComponent } from '../dashboard-line-chart/dashboard-line-chart.component';
import { DashboardHorizontalBarComponent } from '../dashboard-horizontal-bar/dashboard-horizontal-bar.component';
import { buildDashboardTimeBuckets, dashboardMaxEndDate } from '../../utils/dashboard-date-range';

interface FormFilterOption {
  code: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-rmc-admin-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NoteComponent,
    DashboardBarChartComponent,
    DashboardDonutChartComponent,
    DashboardLineChartComponent,
    DashboardHorizontalBarComponent,
  ],
  templateUrl: './rmc-admin-dashboard.component.html',
  styleUrls: ['./rmc-admin-dashboard.component.scss'],
})
export class RmcAdminAnalyticsDashboardComponent implements OnInit {
  private readonly analytics = inject(RmcDashboardAnalyticsService);
  private readonly summaryValue = signal<DashboardSummaryDto | null>(null);

  @Input({ required: true }) set summary(value: DashboardSummaryDto) {
    this.summaryValue.set(value);
  }

  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';

  readonly allForms = ALL_FORMS_FILTER;
  readonly records = signal<RmcDashboardRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedForm = signal(ALL_FORMS_FILTER);
  readonly trendMode = signal<DashboardTrendMode>('completed');
  readonly chartType = signal<DashboardChartType>('line');
  readonly filtersOpen = signal(false);
  readonly startDate = signal(this.toInputDate(new Date(new Date().getFullYear(), 0, 1)));
  readonly endDate = signal(this.toInputDate(new Date()));
  readonly dateRangeNotice = signal<string | null>(null);
  readonly maxEndDate = computed(() => dashboardMaxEndDate(this.startDate()));
  private readonly trendBuckets = computed(() =>
    buildDashboardTimeBuckets(this.startDate(), this.endDate()),
  );
  readonly trendIntervalLabel = computed(
    () => this.trendBuckets()[0]?.intervalLabel ?? 'No valid interval',
  );
  readonly chartTypes: ReadonlyArray<{
    value: DashboardChartType;
    label: string;
    icon: string;
  }> = [
    { value: 'bar', label: 'Vertical bar', icon: 'bar_chart' },
    { value: 'line', label: 'Line', icon: 'show_chart' },
    { value: 'donut', label: 'Donut', icon: 'donut_large' },
  ];

  readonly formOptions = computed<FormFilterOption[]>(() => {
    const forms = new Map<string, string>();
    for (const form of this.summaryValue()?.form_breakdown ?? []) {
      forms.set(form.form_code.toUpperCase(), form.form_name);
    }
    for (const record of this.records()) forms.set(record.formCode, record.formName);

    return [...forms.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, name], index) => ({
        code,
        name,
        color: DASHBOARD_FORM_COLORS[index % DASHBOARD_FORM_COLORS.length],
      }));
  });

  readonly selectedFormLabel = computed(() => {
    if (this.selectedForm() === ALL_FORMS_FILTER) return 'All forms';
    return (
      this.formOptions().find((form) => form.code === this.selectedForm())?.name ?? 'All forms'
    );
  });

  readonly submittedRecords = computed(() =>
    this.records().filter(
      (record) => this.matchesForm(record) && this.isWithinRange(record.submittedAt),
    ),
  );

  readonly completedRecords = computed(() =>
    this.submittedRecords().filter((record) => record.isCompleted && !this.isRejected(record)),
  );

  readonly completedTrendRecords = computed(() =>
    this.records().filter(
      (record) =>
        record.isCompleted &&
        !this.isRejected(record) &&
        this.matchesForm(record) &&
        this.isWithinRange(record.completedAt ?? record.submittedAt),
    ),
  );

  readonly rejectedRecords = computed(() =>
    this.submittedRecords().filter((record) => this.isRejected(record)),
  );

  readonly inProgressRecords = computed(() =>
    this.submittedRecords().filter((record) => !record.isCompleted && !this.isRejected(record)),
  );

  readonly totalCostSeries = computed(() =>
    this.seriesFor(this.submittedRecords(), (record) => record.cost),
  );

  readonly applicationsSeries = computed(() =>
    this.seriesForRecordsOrSummary(this.submittedRecords(), 'total_submitted', (record) => 1),
  );

  readonly completedSeries = computed(() =>
    this.seriesForRecordsOrSummary(this.completedRecords(), 'completed_rejected', () => 1),
  );

  readonly rejectedSeries = computed(() =>
    this.seriesForRecordsOrSummary(this.rejectedRecords(), 'completed_rejected', () => 1),
  );

  readonly inProgressSeries = computed(() => this.seriesFor(this.inProgressRecords(), () => 1));

  readonly visibleFormLegend = computed(() =>
    this.formOptions().filter(
      (form) => this.selectedForm() === ALL_FORMS_FILTER || form.code === this.selectedForm(),
    ),
  );

  readonly trendPoints = computed<DashboardLinePoint[]>(() => {
    const source = this.completedTrendRecords();

    return this.trendBuckets().map((bucket) => {
      const matching = source.filter((record) => {
        const completedAt = record.completedAt ?? record.submittedAt;
        return completedAt && this.isWithinBucket(completedAt, bucket.start, bucket.end);
      });
      return {
        key: bucket.key,
        label: bucket.label,
        value:
          this.trendMode() === 'completed'
            ? matching.length
            : matching.reduce((total, record) => total + record.cost, 0),
      };
    });
  });

  readonly trendDonutSeries = computed<DashboardChartDatum[]>(() =>
    this.trendPoints().map((point, index) => ({
      key: point.key,
      label: point.label,
      value: point.value,
      color: DASHBOARD_FORM_COLORS[index % DASHBOARD_FORM_COLORS.length],
    })),
  );

  readonly trendFormPoints = computed<DashboardStackedBarPoint[]>(() => {
    const source = this.completedTrendRecords();

    return this.trendBuckets().map((bucket) => {
      const segments = this.visibleFormLegend().map((form) => {
        const records = source.filter((record) => {
          const completedAt = record.completedAt ?? record.submittedAt;
          return (
            record.formCode === form.code &&
            completedAt &&
            this.isWithinBucket(completedAt, bucket.start, bucket.end)
          );
        });
        return {
          key: form.code,
          label: form.name,
          color: form.color,
          value:
            this.trendMode() === 'completed'
              ? records.length
              : records.reduce((total, record) => total + record.cost, 0),
        };
      });

      return {
        key: bucket.key,
        label: bucket.label,
        total: segments.reduce((total, segment) => total + segment.value, 0),
        segments,
      };
    });
  });

  readonly trendTitle = computed(() =>
    this.trendMode() === 'completed' ? 'Completed forms' : 'Money spent',
  );

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);
    this.analytics
      .loadPortfolio()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (portfolio) => {
          this.records.set(portfolio.records);
          if (!portfolio.records.length) {
            this.error.set(
              'Detailed portfolio data is unavailable. Summary totals are shown where possible.',
            );
          }
        },
        error: () =>
          this.error.set(
            'Detailed portfolio data is unavailable. Summary totals are shown where possible.',
          ),
      });
  }

  onFormChange(value: string): void {
    this.selectedForm.set(value);
  }

  onStartDateChange(value: string): void {
    if (!value) return;
    this.startDate.set(value);
    this.dateRangeNotice.set(null);
    if (value > this.endDate()) {
      this.endDate.set(value);
      return;
    }
    const maximumEnd = dashboardMaxEndDate(value);
    if (this.endDate() > maximumEnd) {
      this.endDate.set(maximumEnd);
      this.dateRangeNotice.set('The end date was adjusted to the maximum 10-year range.');
    }
  }

  onEndDateChange(value: string): void {
    if (!value) return;
    this.dateRangeNotice.set(null);
    const maximumEnd = dashboardMaxEndDate(this.startDate());
    if (value > maximumEnd) {
      this.endDate.set(maximumEnd);
      this.dateRangeNotice.set('Date ranges cannot exceed 10 years.');
      return;
    }
    this.endDate.set(value);
    if (value < this.startDate()) this.startDate.set(value);
  }

  setTrendMode(mode: DashboardTrendMode): void {
    this.trendMode.set(mode);
  }

  setChartType(type: DashboardChartType): void {
    this.chartType.set(type);
  }

  openFilters(): void {
    this.filtersOpen.set(true);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeFilters();
  }

  private seriesForRecordsOrSummary(
    records: RmcDashboardRecord[],
    summaryKey: keyof Pick<
      DashboardFormBreakdownDto,
      'new_today' | 'required_action' | 'total_submitted' | 'completed_rejected'
    >,
    value: (record: RmcDashboardRecord) => number,
  ): DashboardChartDatum[] {
    if (this.records().length) return this.seriesFor(records, value);

    return this.formOptions()
      .filter(
        (form) => this.selectedForm() === ALL_FORMS_FILTER || form.code === this.selectedForm(),
      )
      .map((form) => {
        const breakdown = this.summaryValue()?.form_breakdown.find(
          (item) => item.form_code.toUpperCase() === form.code,
        );
        return { ...form, key: form.code, label: form.name, value: breakdown?.[summaryKey] ?? 0 };
      });
  }

  private seriesFor(
    records: RmcDashboardRecord[],
    value: (record: RmcDashboardRecord) => number,
  ): DashboardChartDatum[] {
    return this.formOptions()
      .filter(
        (form) => this.selectedForm() === ALL_FORMS_FILTER || form.code === this.selectedForm(),
      )
      .map((form) => ({
        key: form.code,
        label: form.name,
        color: form.color,
        value: records
          .filter((record) => record.formCode === form.code)
          .reduce((total, record) => total + value(record), 0),
      }));
  }

  private matchesForm(record: RmcDashboardRecord): boolean {
    return this.selectedForm() === ALL_FORMS_FILTER || record.formCode === this.selectedForm();
  }

  private isRejected(record: RmcDashboardRecord): boolean {
    const status = `${record.request.status_code} ${record.request.status_name}`.toLowerCase();
    return /reject|not supported|declin/.test(status);
  }

  private isWithinRange(date: Date | null): boolean {
    if (!date) return false;
    const value = this.toInputDate(date);
    return value >= this.startDate() && value <= this.endDate();
  }

  private isWithinBucket(date: Date, start: Date, end: Date): boolean {
    const timestamp = date.getTime();
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
