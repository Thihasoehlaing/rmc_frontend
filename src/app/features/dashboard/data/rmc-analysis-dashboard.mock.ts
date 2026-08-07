import {
  DashboardSummaryDto,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';
import { RmcDashboardPortfolio, RmcDashboardRecord } from '../models/rmc-dashboard-analytics.model';

interface MockFormDefinition {
  code: string;
  name: string;
  minimumCost: number;
}

const RANDOM_FORMS: readonly MockFormDefinition[] = [
  { code: 'CONFERENCE', name: 'Conference Application', minimumCost: 8_000 },
  { code: 'EXTERNAL', name: 'External Project Data Entry', minimumCost: 45_000 },
  { code: 'JOURNAL', name: 'Journal Publication', minimumCost: 2_500 },
  { code: 'RDIG', name: 'Research Development & Innovation Grant', minimumCost: 25_000 },
];

const TRAVEL_FORM: MockFormDefinition = {
  code: 'TRAVEL',
  name: 'Travel Authorisation',
  minimumCost: 6_000,
};

const FORM_CATALOG: readonly MockFormDefinition[] = [...RANDOM_FORMS, TRAVEL_FORM];

interface MockAnalysisData {
  summary: DashboardSummaryDto;
  portfolio: RmcDashboardPortfolio;
}

function randomInteger(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function createRequest(
  id: number,
  form: MockFormDefinition,
  statusCode: string,
  submittedAt: Date,
): RequestSummaryDto {
  return {
    id,
    form_id: id,
    form_code: form.code,
    form_name: form.name,
    request_code: `MOCK-${String(id).padStart(5, '0')}`,
    batch_id: null,
    batch: null,
    applicant_staff_username: `mock.user.${id}`,
    applicant_name: `Design Test Applicant ${id}`,
    applicant_email: `mock.user.${id}@example.test`,
    applicant_department: 'Mock Research Department',
    status_code: statusCode,
    status_name: statusCode.replaceAll('_', ' '),
    current_actor_role: statusCode === 'IN_PROGRESS' ? 'RMC_ADMIN' : null,
    last_action: null,
    created_at: submittedAt.toISOString(),
    updated_at: submittedAt.toISOString(),
    submitted_at: submittedAt.toISOString(),
    title: `Mock ${form.name} ${id}`,
    project_title: `Large dataset design test ${id}`,
    rdig_request_id: form.code === 'RDIG' ? id : null,
    conference_request_id: form.code === 'CONFERENCE' ? id : null,
    journal_request_id: form.code === 'JOURNAL' ? id : null,
    external_form_request_id: form.code === 'EXTERNAL' ? id : null,
  };
}

function buildMockAnalysisData(): MockAnalysisData {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const recordCount = randomInteger(720, 960);
  const records: RmcDashboardRecord[] = [];

  for (let index = 1; index <= recordCount; index += 1) {
    const form = RANDOM_FORMS[randomInteger(0, RANDOM_FORMS.length - 1)];
    const submittedAt =
      index <= 32
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), randomInteger(0, 20))
        : randomDate(start, now);
    const statusRoll = Math.random();
    const statusCode =
      statusRoll < 0.56 ? 'APPROVED' : statusRoll < 0.7 ? 'REJECTED' : 'IN_PROGRESS';
    const isCompleted = statusCode === 'APPROVED';
    const isRejected = statusCode === 'REJECTED';
    const completedAt =
      isCompleted || isRejected
        ? new Date(
            Math.min(
              now.getTime(),
              submittedAt.getTime() + randomInteger(1, 28) * 24 * 60 * 60 * 1_000,
            ),
          )
        : null;
    const request = createRequest(index, form, statusCode, submittedAt);

    records.push({
      request,
      requestId: index,
      formCode: form.code,
      formName: form.name,
      submittedAt,
      completedAt,
      requiresAction: statusCode === 'IN_PROGRESS' && Math.random() < 0.42,
      isCompleted,
      cost: randomInteger(form.minimumCost, form.minimumCost * 12),
    });
  }

  const travelStatuses = ['APPROVED', 'APPROVED', 'REJECTED', 'REJECTED', 'IN_PROGRESS'];
  travelStatuses.forEach((statusCode, index) => {
    const id = recordCount + index + 1;
    const submittedAt = new Date(now.getFullYear(), index + 1, 8 + index, 10, 0, 0);
    const isCompleted = statusCode === 'APPROVED';
    const isRejected = statusCode === 'REJECTED';
    const request = createRequest(id, TRAVEL_FORM, statusCode, submittedAt);

    records.push({
      request,
      requestId: id,
      formCode: TRAVEL_FORM.code,
      formName: TRAVEL_FORM.name,
      submittedAt,
      completedAt:
        isCompleted || isRejected
          ? new Date(submittedAt.getTime() + 5 * 24 * 60 * 60 * 1_000)
          : null,
      requiresAction: statusCode === 'IN_PROGRESS',
      isCompleted,
      cost: TRAVEL_FORM.minimumCost * (index + 1),
    });
  });

  const todayKey = now.toISOString().slice(0, 10);
  const completed = records.filter((record) => record.isCompleted);
  const rejected = records.filter((record) => record.request.status_code === 'REJECTED');
  const pending = records.filter((record) => record.request.status_code === 'IN_PROGRESS');
  const newToday = records.filter(
    (record) => record.submittedAt?.toISOString().slice(0, 10) === todayKey,
  );

  const summary: DashboardSummaryDto = {
    audience: 'rmc_admin',
    view_type: 'rmc_admin',
    metrics: {
      required_action: records.filter((record) => record.requiresAction).length,
      pending: pending.length,
      completed_rejected: completed.length + rejected.length,
      all_applications: records.length,
      approved_by_me: completed.length,
      rejected_by_me: rejected.length,
      decided_by_me: completed.length + rejected.length,
      total_submitted: records.length,
      new_today: newToday.length,
      history: completed.length + rejected.length,
      drafts: 0,
      failed_mail: 0,
    },
    form_breakdown: FORM_CATALOG.map((form) => {
      const formRecords = records.filter((record) => record.formCode === form.code);
      return {
        form_code: form.code,
        form_name: form.name,
        required_action: formRecords.filter((record) => record.requiresAction).length,
        pending: formRecords.filter((record) => record.request.status_code === 'IN_PROGRESS')
          .length,
        completed_rejected: formRecords.filter(
          (record) => record.isCompleted || record.request.status_code === 'REJECTED',
        ).length,
        all_applications: formRecords.length,
        approved_by_me: formRecords.filter((record) => record.isCompleted).length,
        rejected_by_me: formRecords.filter((record) => record.request.status_code === 'REJECTED')
          .length,
        total_submitted: formRecords.length,
        new_today: formRecords.filter(
          (record) => record.submittedAt?.toISOString().slice(0, 10) === todayKey,
        ).length,
      };
    }),
    status_distribution: {
      approved: completed.length,
      rejected: rejected.length,
      pending: pending.length,
    },
    monthly_submissions: [],
    recent: records.slice(0, 10).map((record) => record.request),
  };

  return {
    summary,
    portfolio: { records, costsAvailable: true },
  };
}

export const RMC_ANALYSIS_MOCK_DATA = buildMockAnalysisData();
