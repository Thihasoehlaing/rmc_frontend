import { describe, expect, it } from 'vitest';

import { buildDashboardTimeBuckets, dashboardMaxEndDate } from './dashboard-date-range';

describe('dashboard date range', () => {
  it('uses weekly buckets for a single selected month', () => {
    const buckets = buildDashboardTimeBuckets('2026-08-01', '2026-08-31');

    expect(buckets).toHaveLength(5);
    expect(buckets[0].intervalLabel).toBe('Weekly');
    expect(buckets[0].label).toBe('Aug ’26 – Week 1');
    expect(buckets[4].label).toBe('Aug ’26 – Week 5');
  });

  it('uses weekly edge months and monthly middle buckets for a one-year range', () => {
    const buckets = buildDashboardTimeBuckets('2025-09-01', '2026-08-31');

    expect(buckets[0].label).toBe('Sept ’25 – Week 1');
    expect(buckets.some((bucket) => bucket.label === 'Oct ’25')).toBe(true);
    expect(buckets.at(-1)?.label).toBe('Aug ’26 – Week 5');
    expect(buckets[0].intervalLabel).toBe('Weekly first/last month · Monthly middle');
  });

  it('keeps weekly edges while adapting the middle to grouped intervals', () => {
    expect(buildDashboardTimeBuckets('2024-01-01', '2026-12-31')[0].intervalLabel).toContain(
      'Every 3 months middle',
    );
    expect(buildDashboardTimeBuckets('2021-01-01', '2026-12-31')[0].intervalLabel).toContain(
      'Every 6 months middle',
    );
    expect(buildDashboardTimeBuckets('2017-01-01', '2026-12-31')[0].intervalLabel).toContain(
      'Yearly middle',
    );
  });

  it('rejects ranges longer than ten calendar years', () => {
    expect(dashboardMaxEndDate('2016-08-06')).toBe('2026-08-06');
    expect(buildDashboardTimeBuckets('2016-08-06', '2026-08-07')).toEqual([]);
  });
});
