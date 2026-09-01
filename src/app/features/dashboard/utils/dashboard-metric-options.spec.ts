import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_BAR_METRIC_OPTIONS,
  DASHBOARD_TREND_METRIC_OPTIONS,
} from './dashboard-metric-options';

describe('dashboard metric options', () => {
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
