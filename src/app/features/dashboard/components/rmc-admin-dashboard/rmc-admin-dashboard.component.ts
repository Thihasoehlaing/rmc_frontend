import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
  DashboardDepartmentComparisonPoint,
  DashboardExternalDepartmentPoint,
  DashboardLinePoint,
  DashboardStackedBarPoint,
  DashboardTrendMode,
  RmcDashboardRecord,
} from '../../models/rmc-dashboard-analytics.model';
import { RmcDashboardAnalyticsService } from '../../services/rmc-dashboard-analytics.service';
import { DashboardBarChartComponent } from '../dashboard-bar-chart/dashboard-bar-chart.component';
import { DashboardLineChartComponent } from '../dashboard-line-chart/dashboard-line-chart.component';
import { DashboardHorizontalBarComponent } from '../dashboard-horizontal-bar/dashboard-horizontal-bar.component';
import { DashboardDonutChartComponent } from '../dashboard-donut-chart/dashboard-donut-chart.component';
import { DashboardDepartmentComparisonChartComponent } from '../dashboard-department-comparison-chart/dashboard-department-comparison-chart.component';
import { DashboardExternalDepartmentChartComponent } from '../dashboard-external-department-chart/dashboard-external-department-chart.component';
import { buildDashboardTimeBuckets, dashboardMaxEndDate } from '../../utils/dashboard-date-range';
import { dashboardDepartmentCode } from '../../utils/dashboard-department-code';
import {
  DASHBOARD_BAR_METRIC_OPTIONS,
  DASHBOARD_TREND_METRIC_OPTIONS,
} from '../../utils/dashboard-metric-options';

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
    DashboardDonutChartComponent,
    DashboardDepartmentComparisonChartComponent,
    DashboardExternalDepartmentChartComponent,
  ],
  templateUrl: './rmc-admin-dashboard.component.html',
  styleUrls: ['./rmc-admin-dashboard.component.scss'],
})
export class RmcAdminAnalyticsDashboardComponent implements OnInit {
  private readonly analytics = inject(RmcDashboardAnalyticsService);
  private readonly summaryValue = signal<DashboardSummaryDto | null>(null);
  private readonly formSelectionInitialized = signal(false);
  private analyticsRequestId = 0;

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
  readonly draftSelectedForms = signal<string[]>([]);
  readonly draftStartDate = signal(this.startDate());
  readonly draftEndDate = signal(this.endDate());
  readonly dateRangeNotice = signal<string | null>(null);
  readonly maxEndDate = computed(() => dashboardMaxEndDate(this.draftStartDate()));
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

  readonly formFilterOptions = computed<DropdownOption<string>[]>(() => {
    const selected = this.draftSelectedForms();
    const externalSelected = selected.includes('EXTERNAL');
    const nonExternalSelected = selected.some((code) => code !== 'EXTERNAL');

    return this.formOptions().map((form) => {
      const external = form.code === 'EXTERNAL';
      const disabled = external ? nonExternalSelected : externalSelected;
      return {
        value: form.code,
        label: form.code,
        disabled,
        description: disabled
          ? external
            ? 'Clear the other forms before selecting External'
            : 'Unavailable while External is selected'
          : external
            ? 'Select separately from other forms'
            : undefined,
      };
    });
  });

  readonly trendMetricOptions = DASHBOARD_TREND_METRIC_OPTIONS;
  readonly barMetricOptions = DASHBOARD_BAR_METRIC_OPTIONS;

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

  readonly customDashboardForm = computed<'CONFERENCE' | 'JOURNAL' | null>(() => {
    const selected = this.selectedForms();
    if (selected.length !== 1) return null;
    return selected[0] === 'CONFERENCE' || selected[0] === 'JOURNAL' ? selected[0] : null;
  });
  readonly isExternalDashboard = computed(
    () => this.selectedForms().length === 1 && this.selectedForms()[0] === 'EXTERNAL',
  );
  readonly showMultiFormCharts = computed(() => this.selectedForms().length > 1);

  private readonly externalCategoryCodes = computed(() =>
    [
      ...new Set(
        this.submittedRecords()
          .map((record) => record.analytics?.externalGrantCategory?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    ].sort(),
  );
  private readonly externalDepartmentCodes = computed(() =>
    [...new Set(this.submittedRecords().map((record) => this.departmentCode(record)))].sort(),
  );
  readonly externalCategoryTotal = computed(() => this.externalCategoryCodes().length);
  readonly externalDepartmentTotal = computed(() => this.externalDepartmentCodes().length);
  readonly externalDepartmentPoints = computed<DashboardExternalDepartmentPoint[]>(() => {
    const categories = this.externalCategoryCodes();
    const categoryColors = [
      'color-mix(in srgb, var(--color-primary) 35%, var(--color-surface))',
      'color-mix(in srgb, var(--color-primary) 50%, var(--color-surface))',
      'color-mix(in srgb, var(--color-primary) 65%, var(--color-surface))',
      'color-mix(in srgb, var(--color-primary) 80%, var(--color-surface))',
      'var(--color-primary)',
    ];
    return this.externalDepartmentCodes().map((departmentCode) => {
      const records = this.submittedRecords().filter(
        (record) => this.departmentCode(record) === departmentCode,
      );
      return {
        departmentCode,
        totalApplications: records.length,
        budgetRequested: records
          .filter((record) => !this.isRejected(record))
          .reduce(
            (total, record) => total + Math.max(0, record.analytics?.budgetRequested ?? 0),
            0,
          ),
        categories: categories.map((category, index) => ({
          key: category,
          label: category.replaceAll('_', ' '),
          value: records.filter((record) => record.analytics?.externalGrantCategory === category)
            .length,
          color: categoryColors[index % categoryColors.length],
        })),
      };
    });
  });

  readonly customCostSeries = computed<DashboardChartDatum[]>(() => {
    const totals = this.completedRecords().reduce(
      (result, record) => {
        const breakdown = record.analytics?.costBreakdown;
        if (!breakdown) {
          result.applicant += record.cost;
          return result;
        }
        result.apu += breakdown.apu;
        result.external += breakdown.external;
        result.applicant += breakdown.applicant;
        return result;
      },
      { apu: 0, external: 0, applicant: 0 },
    );
    return [
      { key: 'apu', label: 'APU', value: totals.apu, color: DASHBOARD_FORM_COLORS[0] },
      {
        key: 'external',
        label: 'External',
        value: totals.external,
        color: DASHBOARD_FORM_COLORS[1],
      },
      {
        key: 'applicant',
        label: 'Applicant',
        value: totals.applicant,
        color: DASHBOARD_FORM_COLORS[2],
      },
    ];
  });

  readonly projectTypeSeries = computed(() =>
    this.dimensionSeries(
      ['External', 'Non-Research'],
      (record) => record.analytics?.projectType,
      this.completedRecords(),
    ),
  );

  readonly conferenceTypeSeries = computed(() =>
    this.dimensionSeries(
      ['International', 'National'],
      (record) => record.analytics?.conferenceType,
      this.completedRecords(),
    ),
  );

  readonly scopusQuartileSeries = computed(() =>
    this.dimensionSeries(
      ['Q1', 'Q2', 'Q3'],
      (record) => record.analytics?.scopusQuartile,
      this.completedRecords(),
    ),
  );

  private readonly departmentMetrics = computed(() => {
    const totals = new Map<string, { approvedApplications: number; fundApproved: number }>();
    for (const record of this.submittedRecords()) {
      const code = this.departmentCode(record);
      const metric = totals.get(code) ?? { approvedApplications: 0, fundApproved: 0 };
      if (record.isCompleted && !this.isRejected(record)) {
        metric.approvedApplications += 1;
        metric.fundApproved += Math.max(0, record.analytics?.fundApproved ?? record.cost);
      }
      totals.set(code, metric);
    }

    return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right));
  });

  readonly departmentComparisonPoints = computed<DashboardDepartmentComparisonPoint[]>(() =>
    this.departmentMetrics().map(([departmentCode, metric]) => ({
      departmentCode,
      approvedApplications: metric.approvedApplications,
      fundApproved: metric.fundApproved,
    })),
  );

  readonly barMetricLabel = computed(() => this.metricLabel(this.barTrendMode()));
  readonly lineMetricLabel = computed(() => this.metricLabel(this.lineTrendMode()));

  constructor() {
    effect(() => {
      const codes = this.formOptions().map((form) => form.code);
      if (codes.length && !this.formSelectionInitialized()) {
        const initialSelection = this.allFormSelection();
        this.selectedForms.set(initialSelection);
        this.draftSelectedForms.set([...initialSelection]);
        this.formSelectionInitialized.set(true);
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
    const requestId = ++this.analyticsRequestId;
    this.loading.set(true);
    this.error.set(null);
    this.analytics
      .loadPortfolio({
        startDate: this.startDate(),
        endDate: this.endDate(),
        formCodes: this.selectedForms(),
      })
      .pipe(
        finalize(() => {
          if (requestId === this.analyticsRequestId) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (portfolio) => {
          if (requestId !== this.analyticsRequestId) return;
          this.records.set(portfolio.records);
          if (!portfolio.records.length) {
            this.error.set('No submitted applications match the selected filters.');
          }
        },
        error: () => {
          if (requestId !== this.analyticsRequestId) return;
          this.error.set(
            'Detailed portfolio data is unavailable. Summary totals are shown where possible.',
          );
        },
      });
  }

  onFormSelectionChange(values: string[] | null): void {
    const next = values ?? [];
    const codes = this.formOptions().map((form) => form.code);
    const selectedCodes = next.filter((value) => codes.includes(value));

    if (!next.length) {
      this.draftSelectedForms.set([]);
      return;
    }

    const externalSelected = selectedCodes.includes('EXTERNAL');
    const externalWasSelected = this.draftSelectedForms().includes('EXTERNAL');
    if (externalSelected && !externalWasSelected) {
      this.draftSelectedForms.set(['EXTERNAL']);
      return;
    }
    if (externalSelected && selectedCodes.length > 1) {
      this.draftSelectedForms.set(selectedCodes.filter((code) => code !== 'EXTERNAL'));
      return;
    }

    this.draftSelectedForms.set(selectedCodes);
  }

  onStartDateChange(value: string): void {
    if (!value) return;
    this.draftStartDate.set(value);
    this.dateRangeNotice.set(null);
    if (value > this.draftEndDate()) {
      this.draftEndDate.set(value);
      return;
    }
    const maximumEnd = dashboardMaxEndDate(value);
    if (this.draftEndDate() > maximumEnd) {
      this.draftEndDate.set(maximumEnd);
      this.dateRangeNotice.set('The end date was adjusted to the maximum 10-year range.');
    }
  }

  onEndDateChange(value: string): void {
    if (!value) return;
    this.dateRangeNotice.set(null);
    const maximumEnd = dashboardMaxEndDate(this.draftStartDate());
    if (value > maximumEnd) {
      this.draftEndDate.set(maximumEnd);
      this.dateRangeNotice.set('Date ranges cannot exceed 10 years.');
      return;
    }
    this.draftEndDate.set(value);
    if (value < this.draftStartDate()) this.draftStartDate.set(value);
  }

  setBarTrendMode(mode: DashboardTrendMode | null): void {
    if (mode && mode !== 'spend') this.barTrendMode.set(mode);
  }

  setLineTrendMode(mode: DashboardTrendMode | null): void {
    if (mode) this.lineTrendMode.set(mode);
  }

  openFilters(): void {
    this.resetDraftFilters();
    this.filtersOpen.set(true);
  }

  closeFilters(): void {
    this.resetDraftFilters();
    this.filtersOpen.set(false);
  }

  applyFilters(): void {
    const nextForms = [...this.draftSelectedForms()];
    const nextStartDate = this.draftStartDate();
    const nextEndDate = this.draftEndDate();
    const changed =
      nextStartDate !== this.startDate() ||
      nextEndDate !== this.endDate() ||
      !this.sameFormSelection(nextForms, this.selectedForms());

    this.selectedForms.set(nextForms);
    this.startDate.set(nextStartDate);
    this.endDate.set(nextEndDate);
    this.filtersOpen.set(false);
    this.dateRangeNotice.set(null);

    if (changed) this.loadAnalytics();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeFilters();
  }

  private resetDraftFilters(): void {
    this.draftSelectedForms.set([...this.selectedForms()]);
    this.draftStartDate.set(this.startDate());
    this.draftEndDate.set(this.endDate());
    this.dateRangeNotice.set(null);
  }

  private sameFormSelection(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((code) => rightSet.has(code));
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
      .filter((form) => this.isFormSelected(form.code))
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
      .filter((form) => this.isFormSelected(form.code))
      .map((form) => ({
        key: form.code,
        label: form.code,
        color: form.color,
        value: records
          .filter((record) => record.formCode === form.code)
          .reduce((total, record) => total + value(record), 0),
      }));
  }

  private dimensionSeries(
    labels: readonly string[],
    dimension: (record: RmcDashboardRecord) => string | null | undefined,
    records: RmcDashboardRecord[] = this.submittedRecords(),
  ): DashboardChartDatum[] {
    return labels.map((label, index) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      color: DASHBOARD_FORM_COLORS[index % DASHBOARD_FORM_COLORS.length],
      value: records.filter((record) => dimension(record) === label).length,
    }));
  }

  private departmentCode(record: RmcDashboardRecord): string {
    return dashboardDepartmentCode(
      record.analytics?.departmentCode?.trim() || record.request.applicant_department,
    );
  }

  private matchesForm(record: RmcDashboardRecord): boolean {
    return this.isFormSelected(record.formCode);
  }

  private isFormSelected(formCode: string): boolean {
    return this.selectedForms().includes(formCode);
  }

  private recordsForTrend(mode: DashboardTrendMode): RmcDashboardRecord[] {
    if (mode === 'all') return this.submittedRecords();
    if (mode === 'in_progress') return this.inProgressRecords();
    return mode === 'rejected' ? this.rejectedTrendRecords() : this.completedTrendRecords();
  }

  private trendDate(record: RmcDashboardRecord, mode: DashboardTrendMode): Date | null {
    return mode === 'all' || mode === 'in_progress'
      ? record.submittedAt
      : (record.completedAt ?? record.submittedAt);
  }

  private metricLabel(mode: DashboardTrendMode): string {
    if (mode === 'all') return 'Total Submissions';
    if (mode === 'spend') return 'Total money spend';
    if (mode === 'rejected') return 'Rejected forms';
    if (mode === 'in_progress') return 'In Progress';
    return 'Approved Forms';
  }

  private allFormSelection(): string[] {
    return this.formOptions()
      .map((form) => form.code)
      .filter((code) => code !== 'EXTERNAL');
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
