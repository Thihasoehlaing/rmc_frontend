// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardSummaryDto } from '../../../../core/services/workflow-requests.service';
import { RmcDashboardRecord } from '../../models/rmc-dashboard-analytics.model';
import { RmcDashboardAnalyticsService } from '../../services/rmc-dashboard-analytics.service';
import { RmcAdminAnalyticsDashboardComponent } from './rmc-admin-dashboard.component';
function createComponent() {
  const loadPortfolio = vi.fn().mockReturnValue(
    of({
      records: [],
      costsAvailable: true,
    }),
  );
  TestBed.configureTestingModule({
    providers: [
      {
        provide: RmcDashboardAnalyticsService,
        useValue: { loadPortfolio },
      },
    ],
  });
  const component = TestBed.runInInjectionContext(() => new RmcAdminAnalyticsDashboardComponent());
  component.summary = {
    form_breakdown: [
      { form_code: 'CONFERENCE', form_name: 'Conference' },
      { form_code: 'JOURNAL', form_name: 'Journal' },
    ],
  } as DashboardSummaryDto;
  return { component, loadPortfolio };
}
describe('RmcAdminAnalyticsDashboardComponent filters', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('uses title case for the approved metric headings', () => {
    const { component } = createComponent();
    component.setBarTrendMode('completed');
    component.setLineTrendMode('completed');
    expect(component.barMetricLabel()).toBe('Approved Forms');
    expect(component.lineMetricLabel()).toBe('Approved Forms');
  });
  it('waits for Apply Filters before loading analytics with draft filters', () => {
    const { component, loadPortfolio } = createComponent();
    component.selectedForms.set(['CONFERENCE', 'JOURNAL']);
    expect(component.showMultiFormCharts()).toBe(true);
    component.loadAnalytics();
    component.openFilters();
    component.onFormSelectionChange(['CONFERENCE']);
    component.onStartDateChange('2026-02-01');
    component.onEndDateChange('2026-07-31');
    expect(loadPortfolio).toHaveBeenCalledTimes(1);
    expect(component.selectedForms()).toEqual(['CONFERENCE', 'JOURNAL']);
    expect(component.startDate()).not.toBe('2026-02-01');
    component.applyFilters();
    expect(loadPortfolio).toHaveBeenCalledTimes(2);
    expect(loadPortfolio).toHaveBeenLastCalledWith({
      startDate: '2026-02-01',
      endDate: '2026-07-31',
      formCodes: ['CONFERENCE'],
    });
    expect(component.selectedForms()).toEqual(['CONFERENCE']);
    expect(component.startDate()).toBe('2026-02-01');
    expect(component.showMultiFormCharts()).toBe(false);
  });
  it('blocks Apply Filters when no application form is selected', () => {
    const { component, loadPortfolio } = createComponent();
    component.selectedForms.set(['CONFERENCE']);
    component.openFilters();
    component.onFormSelectionChange([]);
    expect(component.formSelectionError()).toBeNull();
    component.applyFilters();
    expect(component.formSelectionError()).toBe('Select at least one application form.');
    expect(component.filtersOpen()).toBe(true);
    expect(component.selectedForms()).toEqual(['CONFERENCE']);
    expect(loadPortfolio).not.toHaveBeenCalled();
    component.onFormSelectionChange(['JOURNAL']);
    expect(component.formSelectionError()).toBeNull();
    component.applyFilters();
    expect(component.filtersOpen()).toBe(false);
    expect(component.selectedForms()).toEqual(['JOURNAL']);
  });
  it('counts all submitted Journal records in the Scopus Quartile chart', () => {
    const { component } = createComponent();
    component.selectedForms.set(['JOURNAL']);
    component.startDate.set('2026-01-01');
    component.endDate.set('2026-12-31');
    component.records.set([
      {
        request: { status_code: 'approved', status_name: 'Approved' },
        requestId: 1,
        formCode: 'JOURNAL',
        formName: 'Journal',
        submittedAt: new Date('2026-03-01T00:00:00'),
        completedAt: new Date('2026-03-05T00:00:00'),
        requiresAction: false,
        isCompleted: true,
        cost: 0,
        analytics: { scopusQuartile: 'Q1' },
      } as RmcDashboardRecord,
      {
        request: { status_code: 'pending_rmc', status_name: 'Pending RMC' },
        requestId: 2,
        formCode: 'JOURNAL',
        formName: 'Journal',
        submittedAt: new Date('2026-04-01T00:00:00'),
        completedAt: null,
        requiresAction: true,
        isCompleted: false,
        cost: 0,
        analytics: { scopusQuartile: 'Q2' },
      } as RmcDashboardRecord,
    ]);
    expect(component.scopusQuartileSeries().map((item) => item.value)).toEqual([1, 1, 0]);
  });
  it('keeps empty date ranges at zero instead of using all-time summary counts', () => {
    const { component } = createComponent();
    component.summary = {
      form_breakdown: [
        {
          form_code: 'CONFERENCE',
          form_name: 'Conference',
          total_submitted: 99,
          completed_rejected: 50,
        },
      ],
    } as DashboardSummaryDto;
    component.selectedForms.set(['CONFERENCE']);
    component.records.set([]);
    expect(component.applicationsTotal()).toBe(0);
    expect(component.completedTotal()).toBe(0);
    expect(component.rejectedTotal()).toBe(0);
    expect(component.approvalRate()).toBeNull();
  });
  it('separates a submission cohort from decisions in the period', () => {
    const { component } = createComponent();
    component.selectedForms.set(['RDIG']);
    component.startDate.set('2026-03-01');
    component.endDate.set('2026-03-31');
    component.records.set([
      {
        request: { status_code: 'approved', status_name: 'Approved' },
        requestId: 3,
        formCode: 'RDIG',
        formName: 'RDIG',
        submittedAt: new Date('2026-02-01T00:00:00'),
        completedAt: new Date('2026-03-10T00:00:00'),
        requiresAction: false,
        isCompleted: true,
        cost: 30000,
        analytics: { fundApproved: 24000, budgetRequested: 30000 },
      } as RmcDashboardRecord,
    ]);
    expect(component.applicationsTotal()).toBe(0);
    expect(component.completedTotal()).toBe(0);
    expect(component.totalCostAmount()).toBe(24000);
    expect(component.requestedAmount()).toBe(0);
    component.setApplicationListScope('approved');
    expect(component.listedApplications()).toHaveLength(1);
  });
  it('shows missing RDIG dimensions rather than silently dropping applications', () => {
    const { component } = createComponent();
    component.selectedForms.set(['RDIG']);
    component.startDate.set('2026-01-01');
    component.endDate.set('2026-12-31');
    component.records.set([
      {
        request: { status_code: 'pending_cfo', status_name: 'Pending CFO Approval' },
        requestId: 4,
        formCode: 'RDIG',
        formName: 'RDIG',
        submittedAt: new Date('2026-03-01T00:00:00'),
        completedAt: null,
        requiresAction: true,
        isCompleted: false,
        cost: 0,
        analytics: {
          researchCategory: 'S&T',
          batchName: 'Batch 1',
          waitingSince: new Date('2026-03-02T00:00:00'),
        },
      } as RmcDashboardRecord,
    ]);
    expect(component.rdigCategorySeries()[0].value).toBe(1);
    expect(component.rdigTrackSeries()[0].label).toBe('Not recorded');
    expect(component.pendingSeries()[0].label).toBe('Pending CFO Approval');
    expect(component.chartPanels().some((panel) => panel.title === 'Batch')).toBe(true);
  });
  it('clears stale records when loading fails', () => {
    const { component, loadPortfolio } = createComponent();
    component.records.set([{} as RmcDashboardRecord]);
    loadPortfolio.mockReturnValue(throwError(() => new Error('failed')));
    component.loadAnalytics();
    expect(component.records()).toEqual([]);
    expect(component.error()).toContain('couldn’t load');
  });
  it('uses the full form-specific department name rather than its code', () => {
    const {component}=createComponent();
    const record={request:{applicant_department:'Research Management Centre'}, analytics:{departmentCode:'SOC',departmentName:'School of Computing'}} as RmcDashboardRecord;
    expect(component.departmentName(record)).toBe('School of Computing');
    expect(component.departmentName({...record,analytics:undefined})).toBe('Research Management Centre');
  });

});
