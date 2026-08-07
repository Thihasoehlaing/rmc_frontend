import '@angular/compiler';

import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { RmcDashboardAnalyticsService } from './rmc-dashboard-analytics.service';

describe('RmcDashboardAnalyticsService', () => {
  it('provides a large frontend-only mock portfolio for design testing', async () => {
    const result = await firstValueFrom(new RmcDashboardAnalyticsService().loadPortfolio());

    expect(result.records.length).toBeGreaterThanOrEqual(720);
    expect(new Set(result.records.map((record) => record.formCode)).size).toBeGreaterThan(3);
    expect(result.records.some((record) => record.cost > 100_000)).toBe(true);
    expect(result.costsAvailable).toBe(true);

    const travel = result.records.filter((record) => record.formCode === 'TRAVEL');
    expect(travel).toHaveLength(5);
    expect(travel.filter((record) => record.isCompleted)).toHaveLength(2);
    expect(travel.filter((record) => record.request.status_code === 'REJECTED')).toHaveLength(2);
    expect(travel.filter((record) => record.request.status_code === 'IN_PROGRESS')).toHaveLength(1);
  });
});
