import { RequestSummaryDto } from '../../../core/services/workflow-requests.service';

export const ALL_FORMS_FILTER = 'ALL';

export interface DashboardChartDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface DashboardLinePoint {
  key: string;
  label: string;
  value: number;
}

export interface DashboardStackedBarPoint {
  key: string;
  label: string;
  total: number;
  segments: DashboardChartDatum[];
}

export interface RmcDashboardRecord {
  request: RequestSummaryDto;
  requestId: number;
  formCode: string;
  formName: string;
  submittedAt: Date | null;
  completedAt: Date | null;
  requiresAction: boolean;
  isCompleted: boolean;
  cost: number;
}

export interface RmcDashboardPortfolio {
  records: RmcDashboardRecord[];
  costsAvailable: boolean;
}

export type DashboardTrendMode = 'all' | 'completed' | 'rejected' | 'spend';
export type DashboardChartType = 'bar' | 'line' | 'donut';

export const DASHBOARD_FORM_COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-secondary)',
  'var(--color-error)',
  'var(--color-info)',
  'color-mix(in srgb, var(--color-primary) 58%, var(--color-warning))',
  'color-mix(in srgb, var(--color-secondary) 72%, var(--color-success))',
];
