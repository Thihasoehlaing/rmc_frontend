import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  DashboardFormBreakdownDto,
  DashboardSummaryDto,
} from '../../../../core/services/workflow-requests.service';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { DashboardViewConfig } from '../../dashboard.config';
import {
  DASHBOARD_FORM_COLORS,
  DashboardChartDatum,
  DashboardLinePoint,
  DashboardStackedBarPoint,
  DashboardTrendMode,
  RmcDashboardRecord,
} from '../../models/rmc-dashboard-analytics.model';
import { RmcDashboardAnalyticsService } from '../../services/rmc-dashboard-analytics.service';
import { DashboardBarChartComponent } from '../dashboard-bar-chart/dashboard-bar-chart.component';
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
    SearchableDropdownComponent,
    DashboardBarChartComponent,
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

  readonly records = signal<RmcDashboardRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedForms = signal<string[]>([]);
  readonly barTrendMode = signal<DashboardTrendMode>('completed');
  readonly lineTrendMode = signal<DashboardTrendMode>('completed');
  readonly filtersOpen = signal(false);
  readonly startDate = signal(this.toInputDate(new Date(new Date().getFullYear(), 0, 1)));
  readonly endDate = signal(this.toInputDate(new Date()));
  readonly dateRangeNotice = signal<string | null>(null);
  readonly maxEndDate = computed(() => dashboardMaxEndDate(this.startDate()));
  private readonly trendBuckets = computed(() =>
    buildDashboardTimeBuckets(this.startDate(), this.endDate()),
  );
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

  readonly formFilterOptions = computed<DropdownOption<string>[]>(() =>
    this.formOptions().map((form) => ({ value: form.code, label: form.code })),
  );

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

  readonly rejectedTrendRecords = computed(() =>
    this.records().filter(
      (record) =>
        this.isRejected(record) &&
        this.matchesForm(record) &&
        this.isWithinRange(record.completedAt ?? record.submittedAt),
    ),
  );

  readonly inProgressRecords = computed(() =>
    this.submittedRecords().filter((record) => !record.isCompleted && !this.isRejected(record)),
  );

  readonly totalCostSeries = computed(() =>
    this.seriesFor(this.submittedRecords(), (record) => record.cost),
  );
  readonly totalCostAmount = computed(() => this.seriesTotal(this.totalCostSeries()));

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

  readonly applicationsTotal = computed(() => this.seriesTotal(this.applicationsSeries()));
  readonly completedTotal = computed(() => this.seriesTotal(this.completedSeries()));
  readonly rejectedTotal = computed(() => this.seriesTotal(this.rejectedSeries()));
  readonly inProgressTotal = computed(() => this.seriesTotal(this.inProgressSeries()));

  readonly visibleFormLegend = computed(() =>
    this.formOptions().filter((form) => this.isFormSelected(form.code)),
  );

  readonly barMetricLabel = computed(() => this.metricLabel(this.barTrendMode()));
  readonly lineMetricLabel = computed(() => this.metricLabel(this.lineTrendMode()));

  constructor() {
    effect(() => {
      const codes = this.formOptions().map((form) => form.code);
      const selected = this.selectedForms();
      if (codes.length && !selected.length) {
        this.selectedForms.set(codes);
      }
    });
  }

  readonly lineTrendPoints = computed<DashboardLinePoint[]>(() => {
    const source = this.recordsForTrend(this.lineTrendMode());

    return this.trendBuckets().map((bucket) => {
      const matching = source.filter((record) => {
        const trendDate = this.trendDate(record, this.lineTrendMode());
        return trendDate && this.isWithinBucket(trendDate, bucket.start, bucket.end);
      });
      return {
        key: bucket.key,
        label: bucket.label,
        value:
          this.lineTrendMode() === 'spend'
            ? matching.reduce((total, record) => total + record.cost, 0)
            : matching.length,
      };
    });
  });

  readonly barTrendFormPoints = computed<DashboardStackedBarPoint[]>(() => {
    const source = this.recordsForTrend(this.barTrendMode());

    return this.visibleFormLegend().map((form) => {
      const records = source.filter((record) => record.formCode === form.code);
      const value =
        this.barTrendMode() === 'spend'
          ? records.reduce((total, record) => total + record.cost, 0)
          : records.length;

      return {
        key: form.code,
        label: form.code,
        total: value,
        segments: [{ key: form.code, label: form.code, color: form.color, value }],
      };
    });
  });

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

  onFormSelectionChange(values: string[] | null): void {
    const next = values ?? [];
    const codes = this.formOptions().map((form) => form.code);
    const selectedCodes = next.filter((value) => codes.includes(value));

    if (!next.length) {
      this.selectedForms.set(this.allFormSelection());
      return;
    }
    this.selectedForms.set(selectedCodes);
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

  setBarTrendMode(mode: DashboardTrendMode): void {
    this.barTrendMode.set(mode);
  }

  setLineTrendMode(mode: DashboardTrendMode): void {
    this.lineTrendMode.set(mode);
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
        (form) => this.isFormSelected(form.code),
      )
      .map((form) => {
        const breakdown = this.summaryValue()?.form_breakdown.find(
          (item) => item.form_code.toUpperCase() === form.code,
        );
        return { ...form, key: form.code, label: form.code, value: breakdown?.[summaryKey] ?? 0 };
      });
  }

  private seriesFor(
    records: RmcDashboardRecord[],
    value: (record: RmcDashboardRecord) => number,
  ): DashboardChartDatum[] {
    return this.formOptions()
      .filter(
        (form) => this.isFormSelected(form.code),
      )
      .map((form) => ({
        key: form.code,
        label: form.code,
        color: form.color,
        value: records
          .filter((record) => record.formCode === form.code)
          .reduce((total, record) => total + value(record), 0),
      }));
  }

  private matchesForm(record: RmcDashboardRecord): boolean {
    return this.isFormSelected(record.formCode);
  }

  private isFormSelected(formCode: string): boolean {
    return this.selectedForms().includes(formCode);
  }

  private recordsForTrend(mode: DashboardTrendMode): RmcDashboardRecord[] {
    if (mode === 'all') return this.submittedRecords();
    return mode === 'rejected' ? this.rejectedTrendRecords() : this.completedTrendRecords();
  }

  private trendDate(record: RmcDashboardRecord, mode: DashboardTrendMode): Date | null {
    return mode === 'all' ? record.submittedAt : record.completedAt ?? record.submittedAt;
  }

  private metricLabel(mode: DashboardTrendMode): string {
    if (mode === 'all') return 'Total Submissions';
    if (mode === 'spend') return 'Total money spend';
    if (mode === 'rejected') return 'Rejected forms';
    return 'Completed forms';
  }

  private allFormSelection(): string[] {
    return this.formOptions().map((form) => form.code);
  }

  private seriesTotal(series: DashboardChartDatum[]): number {
    return series.reduce((total, item) => total + Math.max(0, item.value), 0);
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
