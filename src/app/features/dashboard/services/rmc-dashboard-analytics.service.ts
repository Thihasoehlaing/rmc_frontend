import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { RMC_ANALYSIS_MOCK_DATA } from '../data/rmc-analysis-dashboard.mock';
import { RmcDashboardPortfolio } from '../models/rmc-dashboard-analytics.model';

@Injectable({ providedIn: 'root' })
export class RmcDashboardAnalyticsService {
  loadPortfolio(): Observable<RmcDashboardPortfolio> {
    return of(RMC_ANALYSIS_MOCK_DATA.portfolio);
  }
}
