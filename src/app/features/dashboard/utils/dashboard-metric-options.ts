import { DropdownOption } from '../../../core/interfaces/components.interface';
import { DashboardTrendMode } from '../models/rmc-dashboard-analytics.model';

export const DASHBOARD_TREND_METRIC_OPTIONS: DropdownOption<DashboardTrendMode>[] = [
  { value: 'all', label: 'Total Submissions' },
  { value: 'completed', label: 'Approved Forms' },
  { value: 'rejected', label: 'Rejected Forms' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'spend', label: 'Fund Approved by APU' },
];

export const DASHBOARD_BAR_METRIC_OPTIONS = DASHBOARD_TREND_METRIC_OPTIONS.filter(
  (option) => option.value !== 'spend',
);
