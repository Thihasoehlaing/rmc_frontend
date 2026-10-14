import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { finalize } from 'rxjs';
import { DashboardSummaryDto } from '../../../../core/services/workflow-requests.service';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
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
import { DashboardDepartmentComparisonChartComponent } from '../dashboard-department-comparison-chart/dashboard-department-comparison-chart.component';
import { DashboardExternalDepartmentChartComponent } from '../dashboard-external-department-chart/dashboard-external-department-chart.component';
import { buildDashboardTimeBuckets, dashboardMaxEndDate } from '../../utils/dashboard-date-range';
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
    RouterLink,
    DataTableComponent,
    NoteComponent,
    SearchableDropdownComponent,
    ValidationMessageComponent,
    DashboardBarChartComponent,
    DashboardLineChartComponent,
    DashboardHorizontalBarComponent,
    DashboardDepartmentComparisonChartComponent,
    DashboardExternalDepartmentChartComponent,
  ],
  templateUrl: './rmc-admin-dashboard.component.html',
  styleUrls: ['./rmc-admin-dashboard.component.scss'],
})
export class RmcAdminAnalyticsDashboardComponent implements OnInit {
  private readonly analytics = inject(RmcDashboardAnalyticsService);
  private analyticsRequestId = 0;
  @Input({ required: true }) summary!: DashboardSummaryDto;

  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
  readonly records = signal<RmcDashboardRecord[]>([]);
  readonly loading = signal(true);
  readonly applicationListScope = signal<'submitted' | 'approved' | 'pending' | 'rejected'>(
    'submitted',
  );
  readonly error = signal<string | null>(null);
  readonly selectedForms = signal<string[]>(['CONFERENCE', 'JOURNAL', 'RDIG']);
  readonly barTrendMode = signal<DashboardTrendMode>('all');
  readonly lineTrendMode = signal<DashboardTrendMode>('all');
  readonly filtersOpen = signal(false);
  readonly startDate = signal(this.toInputDate(new Date(new Date().getFullYear(), 0, 1)));
  readonly endDate = signal(this.toInputDate(new Date()));
  readonly draftSelectedForms = signal<string[]>([]);
  readonly draftStartDate = signal(this.startDate());
  readonly draftEndDate = signal(this.endDate());
  readonly dateRangeNotice = signal<string | null>(null);
  readonly formSelectionError = signal<string | null>(null);
  readonly maxEndDate = computed(() => dashboardMaxEndDate(this.draftStartDate()));
  private readonly trendBuckets = computed(() =>
    buildDashboardTimeBuckets(this.startDate(), this.endDate()),
  );
  readonly formOptions = computed<FormFilterOption[]>(() => {
    const forms = new Map<string, string>([
      ['CONFERENCE', 'Conference'],
      ['JOURNAL', 'Journal'],
      ['RDIG', 'RDIG'],
      ['EXTERNAL', 'External Research Projects'],
    ]);
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
    this.seriesFor(this.completedTrendRecords(), (record) => record.analytics?.fundApproved ?? 0),
  );
  readonly totalCostAmount = computed(() => this.seriesTotal(this.totalCostSeries()));
  readonly applicationsSeries = computed(() => this.seriesFor(this.submittedRecords(), () => 1));
  readonly completedSeries = computed(() => this.seriesFor(this.completedRecords(), () => 1));
  readonly rejectedSeries = computed(() => this.seriesFor(this.rejectedRecords(), () => 1));
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
    [...new Set(this.submittedRecords().map((record) => this.departmentName(record)))].sort(),
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
        (record) => this.departmentName(record) === departmentCode,
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
      this.customDashboardForm() === 'JOURNAL'
        ? ['External', 'Internal', 'Non-Research']
        : ['External', 'Non-Research'],
      (record) => record.analytics?.projectType,
      this.submittedRecords(),
    ),
  );
  readonly conferenceTypeSeries = computed(() =>
    this.dimensionSeries(
      ['International', 'National'],
      (record) => record.analytics?.conferenceType,
      this.submittedRecords(),
    ),
  );
  readonly scopusQuartileSeries = computed(() =>
    this.dimensionSeries(
      ['Q1', 'Q2', 'Q3'],
      (record) => record.analytics?.scopusQuartile,
      this.submittedRecords(),
    ),
  );
  private readonly departmentMetrics = computed(() => {
    const totals = new Map<string, { approvedApplications: number; fundApproved: number }>();
    for (const record of this.submittedRecords()) {
      const code = this.departmentName(record);
      const metric = totals.get(code) ?? { approvedApplications: 0, fundApproved: 0 };
      if (record.isCompleted && !this.isRejected(record)) {
        metric.approvedApplications += 1;
        metric.fundApproved += Math.max(0, record.analytics?.fundApproved ?? 0);
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
            ? matching.reduce((total, record) => total + (record.analytics?.fundApproved ?? 0), 0)
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
  readonly requestedAmount = computed(() =>
    this.submittedRecords().reduce(
      (sum, record) => sum + (record.analytics?.budgetRequested ?? 0),
      0,
    ),
  );
  readonly cohortApprovedAmount = computed(() =>
    this.completedRecords().reduce((sum, record) => sum + (record.analytics?.fundApproved ?? 0), 0),
  );
  readonly approvalRate = computed(() => {
    const decided = this.completedTotal() + this.rejectedTotal();
    return decided ? (this.completedTotal() / decided) * 100 : null;
  });
  readonly fundingMissing = computed(
    () =>
      this.completedTrendRecords().filter((record) => record.analytics?.fundingRecorded === false)
        .length,
  );
  readonly estimatedDecisions = computed(
    () =>
      this.records().filter(
        (record) => this.matchesForm(record) && record.analytics?.decisionDateEstimated,
      ).length,
  );
  readonly statusSeries = computed(() =>
    this.groupSeries(
      this.submittedRecords(),
      (record) => record.request.status_name || record.request.status_code,
    ),
  );
  readonly pendingSeries = computed(() =>
    this.groupSeries(
      this.inProgressRecords(),
      (record) => record.analytics?.stageName || record.request.status_name || record.request.status_code,
    ),
  );
  readonly pendingAgeSeries = computed(() =>
    this.dimensionSeries(
      ['0–7 days', '8–30 days', '31–90 days', 'Over 90 days'],
      (record) => {
        const days = this.waitingDays(record);
        return days <= 7
          ? '0–7 days'
          : days <= 30
            ? '8–30 days'
            : days <= 90
              ? '31–90 days'
              : 'Over 90 days';
      },
      this.inProgressRecords(),
    ),
  );
  readonly schoolSeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => this.departmentName(record)),
  );
  readonly externalCategorySeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => record.analytics?.externalGrantCategory),
  );
  readonly rdigCategorySeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => record.analytics?.researchCategory),
  );
  readonly rdigTrackSeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) =>
      record.analytics?.track?.replaceAll('-', ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase()),
    ),
  );
  readonly rdigBatchSeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => record.analytics?.batchName),
  );
  readonly rdigClusterSeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => record.analytics?.researchCluster),
  );
  readonly rdigApplicationTypeSeries = computed(() =>
    this.groupSeries(this.submittedRecords(), (record) => record.analytics?.applicationType),
  );
  readonly chartPanels = computed(() => {
    const panels: { title: string; series: DashboardChartDatum[]; currency: boolean }[] = [
      {
        title: 'Applications by School / Department',
        series: this.schoolSeries(),
        currency: false,
      },
      { title: 'Current Workflow Status', series: this.statusSeries(), currency: false },
    ];
    if (this.customDashboardForm()) {
      panels.push({ title: 'Project Type', series: this.projectTypeSeries(), currency: false });
      panels.push({
        title: this.customDashboardForm() === 'JOURNAL' ? 'Scopus Quartile' : 'Conference Type',
        series:
          this.customDashboardForm() === 'JOURNAL'
            ? this.scopusQuartileSeries()
            : this.conferenceTypeSeries(),
        currency: false,
      });
      panels.push({
        title: 'Recorded Cost Contributions — Approved Applications',
        series: this.customCostSeries(),
        currency: true,
      });
    }
    if (this.selectedForms().length === 1 && this.selectedForms()[0] === 'RDIG') {
      panels.push(
        ...[
          ['Research Category', this.rdigCategorySeries()],
          ['Research Track', this.rdigTrackSeries()],
          ['Batch', this.rdigBatchSeries()],
          ['Research Cluster', this.rdigClusterSeries()],
          ['Application Type', this.rdigApplicationTypeSeries()],
        ].map(([title, series]) => ({
          title: title as string,
          series: series as DashboardChartDatum[],
          currency: false,
        })),
      );
    }
    if (this.isExternalDashboard())
      panels.push({
        title: 'External Grant Category',
        series: this.externalCategorySeries(),
        currency: false,
      });
    return panels;
  });
  private readonly allApplicationListOptions: DropdownOption<string>[] = [
    { value: 'submitted', label: 'Submitted in Period' },
    { value: 'approved', label: 'Approved in Period' },
    { value: 'pending', label: 'In Progress — Period Submissions' },
    { value: 'rejected', label: 'Rejected in Period' },
  ];
  readonly applicationListOptions = computed(() =>
    this.isExternalDashboard()
      ? this.allApplicationListOptions.filter((option) => option.value === 'submitted')
      : this.allApplicationListOptions,
  );
  readonly listedApplications = computed(() => {
    const scope = this.applicationListScope();
    return scope === 'approved'
      ? this.completedTrendRecords()
      : scope === 'pending'
        ? this.inProgressRecords()
        : scope === 'rejected'
          ? this.rejectedTrendRecords()
          : this.submittedRecords();
  });
  setApplicationListScope(scope: string | null): void {
    if (
      scope === 'submitted' ||
      scope === 'approved' ||
      scope === 'pending' ||
      scope === 'rejected'
    )
      this.applicationListScope.set(scope);
  }
  private readonly baseApplicationColumns: DataTableColumn[] = [
    { key: 'request', label: 'Application', width: '24%' },
    { key: 'form', label: 'Form' },
    { key: 'school', label: 'School / Department' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'status', label: 'Current Status', width: '20%' },
    { key: 'funding', label: 'Approved APU Funding (RM)' },
  ];
  readonly applicationColumns = computed(() =>
    this.baseApplicationColumns.map((column) =>
      column.key === 'funding' && this.isExternalDashboard()
        ? { ...column, label: 'Recorded Grant Budget (RM)' }
        : column,
    ),
  );
  trendBasis(mode: DashboardTrendMode): string {
    return mode === 'all' || mode === 'in_progress'
      ? 'By submission date; status reflects the current workflow.'
      : 'By final decision date within the selected period.';
  }
  waitingDays(record: RmcDashboardRecord): number {
    const since = record.analytics?.waitingSince ?? record.submittedAt;
    return since ? Math.max(0, Math.floor((Date.now() - since.getTime()) / 86400000)) : 0;
  }
  detailLink(record: RmcDashboardRecord): string[] {
    const prefix: Record<string, string> = {
      CONFERENCE: 'conference',
      JOURNAL: 'journal',
      RDIG: 'rdig',
      EXTERNAL: 'external-project-data-entry',
    };
    return ['/', prefix[record.formCode], 'detail', record.request.request_code ?? ''];
  }
  resetFilters(): void {
    this.selectedForms.set(this.allFormSelection());
    this.startDate.set(this.toInputDate(new Date(new Date().getFullYear(), 0, 1)));
    this.endDate.set(this.toInputDate(new Date()));
    this.closeFilters();
    this.loadAnalytics();
  }
  selectForm(code: string): void {
    this.selectedForms.set(code === 'ALL' ? this.allFormSelection() : [code]);
    if (code === 'EXTERNAL') {
      this.barTrendMode.set('all');
      this.lineTrendMode.set('all');
      this.applicationListScope.set('submitted');
    }
    this.closeFilters();
    this.loadAnalytics();
  }
  private groupSeries(
    records: RmcDashboardRecord[],
    dimension: (record: RmcDashboardRecord) => string | null | undefined,
  ): DashboardChartDatum[] {
    const labels = [
      ...new Set(records.map((record) => dimension(record)?.trim() || 'Not recorded')),
    ].sort();
    return this.dimensionSeries(
      labels,
      (record) => dimension(record)?.trim() || 'Not recorded',
      records,
    );
  }
  ngOnInit(): void {
    this.loadAnalytics();
  }
  loadAnalytics(): void {
    const requestId = ++this.analyticsRequestId;
    this.loading.set(true);
    this.error.set(null);
    this.records.set([]);
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
        },
        error: () => {
          if (requestId !== this.analyticsRequestId) return;
          this.error.set('We couldn’t load the analysis data. Please try again.');
        },
      });
  }
  onFormSelectionChange(values: string[] | null): void {
    const next = values ?? [];
    if (next.length) this.formSelectionError.set(null);
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
    if (!this.draftSelectedForms().length) {
      this.formSelectionError.set('Select at least one application form.');
      return;
    }
    this.formSelectionError.set(null);
    const nextForms = [...this.draftSelectedForms()];
    const nextStartDate = this.draftStartDate();
    const nextEndDate = this.draftEndDate();
    const changed =
      nextStartDate !== this.startDate() ||
      nextEndDate !== this.endDate() ||
      !this.sameFormSelection(nextForms, this.selectedForms());
    this.selectedForms.set(nextForms);
    if (nextForms.includes('EXTERNAL')) {
      this.barTrendMode.set('all');
      this.lineTrendMode.set('all');
      this.applicationListScope.set('submitted');
    }
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
    this.formSelectionError.set(null);
  }
  private sameFormSelection(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((code) => rightSet.has(code));
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
      value: records.filter((record) => {
        const raw = dimension(record);
        return (raw && labels.includes(raw) ? raw : 'Not recorded') === label;
      }).length,
    }));
  }
  departmentName(record: RmcDashboardRecord): string {
    return record.analytics?.departmentName?.trim() || record.request.applicant_department?.trim() || 'Not recorded';
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
    if (mode === 'spend') return 'APU Funding Approved';
    if (mode === 'rejected') return 'Rejected Forms';
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
