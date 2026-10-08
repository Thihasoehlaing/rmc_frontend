// @vitest-environment jsdom

import '@angular/compiler';

import { TestBed, getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

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
  const component = TestBed.runInInjectionContext(
    () => new RmcAdminAnalyticsDashboardComponent(),
  );
  component.summary = {
    form_breakdown: [
      { form_code: 'CONFERENCE', form_name: 'Conference' },
      { form_code: 'JOURNAL', form_name: 'Journal' },
    ],
  } as DashboardSummaryDto;
  return { component, loadPortfolio };
}

describe('RmcAdminAnalyticsDashboardComponent filters', () => {
  beforeAll(() => {
    getTestBed().initTestEnvironment(
      BrowserTestingModule,
      platformBrowserTesting(),
    );
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses title case for the approved metric headings', () => {
    const { component } = createComponent();

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

  it('counts only approved Journal records in the Scopus Quartile chart', () => {
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

    expect(component.scopusQuartileSeries().map((item) => item.value)).toEqual([1, 0, 0]);
  });
});
