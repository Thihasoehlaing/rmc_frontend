import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_BAR_METRIC_OPTIONS,
  DASHBOARD_TREND_METRIC_OPTIONS,
} from './dashboard-metric-options';

describe('dashboard metric options', () => {
  it('uses approved terminology for the completed-record metric', () => {
    const trendApprovedOption = DASHBOARD_TREND_METRIC_OPTIONS.find(
      (option) => option.value === 'completed',
    );
    const barApprovedOption = DASHBOARD_BAR_METRIC_OPTIONS.find(
      (option) => option.value === 'completed',
    );

    expect(trendApprovedOption?.label).toBe('Approved Forms');
    expect(barApprovedOption?.label).toBe('Approved Forms');
  });

  it('uses title case for the rejected metric', () => {
    const rejectedOption = DASHBOARD_TREND_METRIC_OPTIONS.find(
      (option) => option.value === 'rejected',
    );

    expect(rejectedOption?.label).toBe('Rejected Forms');
  });

  it('excludes Fund Approved from the bar chart while retaining it for the line chart', () => {
    expect(DASHBOARD_BAR_METRIC_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'completed',
      'rejected',
      'in_progress',
    ]);
    expect(DASHBOARD_TREND_METRIC_OPTIONS.some((option) => option.value === 'in_progress')).toBe(
      true,
    );
    expect(DASHBOARD_TREND_METRIC_OPTIONS.some((option) => option.value === 'spend')).toBe(true);
  });
});
