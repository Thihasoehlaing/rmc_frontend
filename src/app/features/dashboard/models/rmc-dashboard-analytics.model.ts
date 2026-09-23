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

export interface DashboardDepartmentComparisonPoint {
  departmentCode: string;
  approvedApplications: number;
  fundApproved: number;
}

export interface DashboardExternalDepartmentPoint {
  departmentCode: string;
  categories: DashboardChartDatum[];
  totalApplications: number;
  budgetRequested: number;
}

export type DashboardProjectType = 'External' | 'Non-Research';
export type DashboardConferenceType = 'International' | 'National';
export type DashboardScopusQuartile = 'Q1' | 'Q2' | 'Q3';

export interface DashboardCostBreakdown {
  apu: number;
  external: number;
  applicant: number;
}

export interface RmcDashboardDimensions {
  departmentCode?: string | null;
  externalGrantCategory?: string | null;
  fundApproved?: number | null;
  budgetRequested?: number | null;
  projectType?: DashboardProjectType | null;
  conferenceType?: DashboardConferenceType | null;
  scopusQuartile?: DashboardScopusQuartile | null;
  costBreakdown?: DashboardCostBreakdown | null;
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
  analytics?: RmcDashboardDimensions;
}

export interface RmcDashboardPortfolio {
  records: RmcDashboardRecord[];
  costsAvailable: boolean;
}

export interface RmcDashboardAnalyticsQuery {
  startDate: string;
  endDate: string;
  formCodes?: string[];
}

export interface RmcDashboardCostBreakdownDto {
  apu: number | string;
  external: number | string;
  applicant: number | string;
}

export interface RmcDashboardDimensionsDto {
  department_code?: string | null;
  external_grant_category?: string | null;
  fund_approved?: number | string | null;
  budget_requested?: number | string | null;
  project_type?: DashboardProjectType | null;
  conference_type?: DashboardConferenceType | null;
  scopus_quartile?: DashboardScopusQuartile | null;
  cost_breakdown?: RmcDashboardCostBreakdownDto | null;
}

export interface RmcDashboardRecordDto {
  request: RequestSummaryDto;
  request_id: number;
  form_code: string;
  form_name: string;
  submitted_at: string | null;
  completed_at: string | null;
  requires_action: boolean;
  is_completed: boolean;
  cost: number | string;
  analytics?: RmcDashboardDimensionsDto | null;
}

export interface RmcDashboardPortfolioDto {
  start_date: string;
  end_date: string;
  form_codes: string[];
  record_count: number;
  records: RmcDashboardRecordDto[];
  costs_available: boolean;
}

export type DashboardTrendMode = 'all' | 'completed' | 'rejected' | 'in_progress' | 'spend';
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
