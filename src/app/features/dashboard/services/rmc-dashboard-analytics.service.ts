import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/services/workflow-requests.service';
import {
  RmcDashboardAnalyticsQuery,
  RmcDashboardDimensionsDto,
  RmcDashboardPortfolio,
  RmcDashboardPortfolioDto,
} from '../models/rmc-dashboard-analytics.model';

function toNumber(value: number | string | null | undefined): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapDimensions(source: RmcDashboardDimensionsDto | null | undefined) {
  if (!source) return undefined;
  const breakdown = source.cost_breakdown;
  return {
    departmentCode: source.department_code,
    departmentName: source.department_name,
    externalGrantCategory: source.external_grant_category,
    fundApproved: toNumber(source.fund_approved),
    budgetRequested: toNumber(source.budget_requested),
    fundingRecorded: source.funding_recorded,
    decisionDateEstimated: source.decision_date_estimated,
    waitingSince: toDate(source.waiting_since ?? null),
    stageName: source.stage_name,
    batchName: source.batch_name,
    researchCategory: source.research_category,
    applicationType: source.application_type,
    track: source.track,
    researchCluster: source.research_cluster,
    projectType: source.project_type,
    conferenceType: source.conference_type,
    scopusQuartile: source.scopus_quartile,
    costBreakdown: breakdown
      ? {
          apu: toNumber(breakdown.apu),
          external: toNumber(breakdown.external),
          applicant: toNumber(breakdown.applicant),
        }
      : null,
  };
}

export function mapAnalysisPortfolio(source: RmcDashboardPortfolioDto): RmcDashboardPortfolio {
  return {
    costsAvailable: source.costs_available,
    records: source.records.map((record) => ({
      request: record.request,
      requestId: record.request_id,
      formCode: record.form_code.toUpperCase(),
      formName: record.form_name,
      submittedAt: toDate(record.submitted_at),
      completedAt: toDate(record.completed_at),
      requiresAction: record.requires_action,
      isCompleted: record.is_completed,
      cost: toNumber(record.cost),
      analytics: mapDimensions(record.analytics),
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class RmcDashboardAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/dashboard/analysis`;

  loadPortfolio(query: RmcDashboardAnalyticsQuery): Observable<RmcDashboardPortfolio> {
    let params = new HttpParams()
      .set('start_date', query.startDate)
      .set('end_date', query.endDate);
    for (const formCode of query.formCodes ?? []) {
      params = params.append('form_code', formCode);
    }

    return this.http
      .get<ApiResponse<RmcDashboardPortfolioDto>>(this.endpoint, { params })
      .pipe(map((response) => mapAnalysisPortfolio(response.data)));
  }
}
