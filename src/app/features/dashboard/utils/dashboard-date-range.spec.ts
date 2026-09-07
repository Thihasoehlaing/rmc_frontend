import { describe, expect, it } from 'vitest';

import { buildDashboardTimeBuckets, dashboardMaxEndDate } from './dashboard-date-range';

describe('dashboard date range', () => {
  it('uses consecutive ten-day buckets for ranges shorter than one month', () => {
    const buckets = buildDashboardTimeBuckets('2026-01-05', '2026-01-29');

    expect(buckets.map((bucket) => bucket.label)).toEqual([
      '05 Jan ’26–14 Jan ’26',
      '15 Jan ’26–24 Jan ’26',
      '25 Jan ’26–29 Jan ’26',
    ]);
    expect(buckets.every((bucket) => bucket.intervalLabel === 'Every 10 days')).toBe(true);
  });

  it('uses one monthly bucket for a single selected month', () => {
    const buckets = buildDashboardTimeBuckets('2026-08-01', '2026-08-31');

    expect(buckets).toHaveLength(1);
    expect(buckets[0].intervalLabel).toBe('Monthly');
    expect(buckets[0].label).toBe('Aug ’26');
  });

  it('shows each month for a six-month range', () => {
    const buckets = buildDashboardTimeBuckets('2026-01-01', '2026-06-30');

    expect(buckets.map((bucket) => bucket.label)).toEqual([
      'Jan ’26',
      'Feb ’26',
      'Mar ’26',
      'Apr ’26',
      'May ’26',
      'Jun ’26',
    ]);
    expect(buckets.every((bucket) => bucket.intervalLabel === 'Monthly')).toBe(true);
  });

  it('adapts multi-month ranges to the requested grouped intervals', () => {
    const quarterlyBuckets = buildDashboardTimeBuckets('2026-01-01', '2026-12-31');
    expect(quarterlyBuckets.map((bucket) => bucket.label)).toEqual([
      'Jan–Mar ’26',
      'Apr–Jun ’26',
      'Jul–Sep ’26',
      'Oct–Dec ’26',
    ]);
    expect(quarterlyBuckets[0].intervalLabel).toBe('Every 3 months');
    const threeYearBuckets = buildDashboardTimeBuckets('2024-01-01', '2026-12-31');
    expect(threeYearBuckets.map((bucket) => bucket.label)).toEqual(['2024', '2025', '2026']);
    expect(threeYearBuckets[0].intervalLabel).toBe('Yearly');

    const tenYearBuckets = buildDashboardTimeBuckets('2017-01-01', '2026-12-31');
    expect(tenYearBuckets).toHaveLength(10);
    expect(tenYearBuckets[0].label).toBe('2017');
    expect(tenYearBuckets.at(-1)?.label).toBe('2026');
  });

  it('rejects ranges longer than ten calendar years', () => {
    expect(dashboardMaxEndDate('2016-08-06')).toBe('2026-08-06');
    expect(buildDashboardTimeBuckets('2016-08-06', '2026-08-07')).toEqual([]);
  });
});
