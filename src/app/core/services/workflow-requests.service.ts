import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * workflow-requests.service.ts
 *
 * Thin wrapper over the backend's generic request/workflow engine (routes in
 * blueprint.py under the configured API prefix). This drives every form's post-submit lifecycle:
 *  - the inbox / pending / history / my-requests list views
 *  - a request's current workflow state + the actions available to *this* user
 *  - performing an action (approve / reject / return / resubmit / …)
 *  - the approval (audit) history
 *
 * The workflow itself (steps, actions, transitions, who can act) is configured
 * server-side in System Settings → Workflow Configuration, so the frontend never
 * hardcodes transitions — it renders whatever `available_actions` the backend
 * returns for the current user and posts the chosen action_code back.
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

/** One entry in a request's approval/audit trail (services/requests.py::_serialize_approval). */
export interface ApprovalDto {
  id: number;
  request_id: number;
  workflow_step_id: number | null;
  step_no: number | null;
  actor_type_code: string | null;
  staff_username: string | null;
  staff_name: string | null;
  staff_email: string | null;
  action_code: string | null;
  action_name: string | null;
  from_status_code: string | null;
  to_status_code: string | null;
  action_at: string | null;
}

/** An RDIG reviewer assigned to a request (services/requests.py::_serialize_rdig_request_reviewer). */
export interface RdigRequestReviewerDto {
  id: number;
  rdig_request_id: number;
  academic_staff_id: number;
  reviewer_no: number | null;
  username: string | null;
  name: string | null;
  email: string | null;
  is_active: boolean;
}

/** A request row as returned by list/detail endpoints (services/requests.py::_serialize_request). */
export interface RequestSummaryDto {
  id?: number;
  request_id?: number;
  form_id: number;
  form_code: string | null;
  form_name: string | null;
  request_code: string | null;
  batch_id: number | null;
  batch: {
    id: number;
    batch_name: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
  applicant_staff_username: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_department: string | null;
  status_code: string;
  status_name: string;
  current_actor_role: string | null;
  last_action: ApprovalDto | null;
  created_at: string | null;
  updated_at: string | null;
  submitted_at: string | null;
  title: string | null;
  project_title?: string | null;
  rdig_request_id: number | null;
  conference_request_id: number | null;
  journal_request_id: number | null;
  external_form_request_id: number | null;
  rdig_reviewers?: RdigRequestReviewerDto[];
  available_actions?: WorkflowActionDto[];
  can_act?: boolean;
}

/** A workflow action available to the current user (services/workflows.py::_serialize_step_action). */
export interface WorkflowActionDto {
  action_code: string;
  action_name: string;
  next_status_code: string | null;
  requires_remarks: boolean;
  requires_reviewer_selection: boolean;
  reviewer_selection_count: number | null;
  reviewer_source: string | null;
}

export interface RequestStatusDto {
  id: number;
  form_id: number | null;
  status_code: string;
  status_name: string;
  actor_type_id: number | null;
  actor: { id: number; actor_code: string; actor_name: string; description: string | null } | null;
  is_initial: boolean;
  is_final: boolean;
  display_order: number | null;
  is_active: boolean;
}

/** A request's workflow state (services/workflows.py::get_request_workflow). */
export interface RequestWorkflowDto {
  id: number;
  form_id: number;
  form_code: string | null;
  status_code: string;
  current_status: RequestStatusDto | null;
  workflow_process: unknown | null;
  current_step: unknown | null;
  available_actions: WorkflowActionDto[];
  can_view: boolean;
  can_act: boolean;
}

export interface AvailableActionsDto {
  available_actions: WorkflowActionDto[];
  can_act: boolean;
}

export interface RequestCommentDto {
  id: number;
  request_id: number;
  approval_id: number | null;
  workflow_step_id: number | null;
  actor_type_code: string | null;
  action_code: string | null;
  comment_type: 'workflow_action' | 'section_review' | string;
  section_code: string | null;
  section_name: string | null;
  staff_username: string | null;
  staff_name: string | null;
  staff_email: string | null;
  comment_text: string;
  created_at: string | null;
}

export interface CreateSectionCommentPayload {
  comment_type?: 'section_review';
  section_code: string;
  section_name?: string | null;
  comment_text: string;
}

export interface UpdateSectionCommentPayload {
  comment_text: string;
}

/** Body for POST /requests/{id}/actions (schemas/requests.py::RequestActionSchema). */
export interface ActOnRequestPayload {
  action_code: string;
  comment_text?: string | null;
  /** RMC reviewer selection — usernames chosen when a step requires it. */
  selected_reviewer_usernames?: string[];
  reviewers?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface ListQuery {
  page?: number;
  perPage?: number;
  formCode?: string;
  statusCode?: string;
  admin?: boolean;
  search?: string;
}

export type DashboardAudience =
  | 'applicant'
  | 'workflow_actor'
  | 'finance'
  | 'rmc_admin'
  | 'system_admin';

export interface DashboardSummaryDto {
  audience: DashboardAudience;
  view_type?: DashboardAudience;
  metrics: {
    required_action: number;
    pending: number;
    completed_rejected: number;
    all_applications: number;
    approved_by_me: number;
    rejected_by_me: number;
    decided_by_me: number;
    total_submitted: number;
    new_today: number;
    history: number;
    drafts: number;
    failed_mail: number;
  };
  form_breakdown: DashboardFormBreakdownDto[];
  status_distribution: DashboardStatusDistributionDto;
  monthly_submissions: DashboardTrendPointDto[];
  recent: RequestSummaryDto[];
}

export interface DashboardFormBreakdownDto {
  form_code: string;
  form_name: string;
  required_action: number;
  pending: number;
  completed_rejected: number;
  all_applications: number;
  approved_by_me: number;
  rejected_by_me: number;
  total_submitted: number;
  new_today: number;
}

export interface DashboardStatusDistributionDto {
  approved: number;
  rejected: number;
  pending: number;
}

export interface DashboardTrendPointDto {
  month: string;
  label: string;
  count: number;
}

export interface RequestContextDto {
  request?: RequestSummaryDto;
  rdig?: Record<string, unknown>;
  conference?: Record<string, unknown>;
  journal?: Record<string, unknown>;
  external_project?: Record<string, unknown>;
  form_detail?: Record<string, unknown> | null;
  comments?: unknown[];
  approvals?: unknown[];
  attachments?: unknown[];
  available_actions?: WorkflowActionDto[];
  can_act?: boolean;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class WorkflowRequestsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private toParams(query: ListQuery | undefined): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    if (query.page != null) params = params.set('page', query.page);
    if (query.perPage != null) params = params.set('per_page', query.perPage);
    if (query.formCode) params = params.set('form_code', query.formCode);
    if (query.statusCode) params = params.set('status_code', query.statusCode);
    if (query.admin != null) params = params.set('admin', query.admin);
    if (query.search) params = params.set('search', query.search);
    return params;
  }

  getDashboard(): Observable<ApiResponse<DashboardSummaryDto>> {
    return this.http.get<ApiResponse<DashboardSummaryDto>>(`${this.base}/dashboard`);
  }

  // ── Status catalogue ──────────────────────────────────────────────────────
  getRequestStatuses(formCode?: string): Observable<ApiResponse<RequestStatusDto[]>> {
    const params = formCode ? new HttpParams().set('form_code', formCode) : undefined;
    return this.http.get<ApiResponse<RequestStatusDto[]>>(`${this.base}/request-statuses`, {
      params,
    });
  }

  // ── List views ────────────────────────────────────────────────────────────
  /** Requests awaiting an action from the current user (reviewers/approvers). */
  getInbox(query?: ListQuery): Observable<ApiResponse<PaginatedData<RequestSummaryDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RequestSummaryDto>>>(`${this.base}/inbox`, {
      params: this.toParams(query),
    });
  }

  /** The current user's own requests (applicant view). */
  getMyRequests(query?: ListQuery): Observable<ApiResponse<PaginatedData<RequestSummaryDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RequestSummaryDto>>>(`${this.base}/requests`, {
      params: this.toParams(query),
    });
  }

  deleteDraftRequest(requestId: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.delete<ApiResponse<RequestSummaryDto>>(`${this.base}/requests/${requestId}`);
  }

  getPendingRequests(query?: ListQuery): Observable<ApiResponse<PaginatedData<RequestSummaryDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RequestSummaryDto>>>(
      `${this.base}/requests/pending`,
      {
        params: this.toParams(query),
      },
    );
  }

  getHistoryRequests(query?: ListQuery): Observable<ApiResponse<PaginatedData<RequestSummaryDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RequestSummaryDto>>>(
      `${this.base}/requests/history`,
      {
        params: this.toParams(query),
      },
    );
  }

  getAdminHistory(query?: ListQuery): Observable<ApiResponse<PaginatedData<RequestSummaryDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RequestSummaryDto>>>(
      `${this.base}/requests/admin-history`,
      {
        params: this.toParams(query),
      },
    );
  }

  // ── Single request ────────────────────────────────────────────────────────
  getRequest(requestId: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.get<ApiResponse<RequestSummaryDto>>(`${this.base}/requests/${requestId}`);
  }

  getRequestByCode(requestCode: string): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.get<ApiResponse<RequestSummaryDto>>(
      `${this.base}/requests/code/${encodeURIComponent(requestCode)}`,
    );
  }

  getAdminHistoryDetail(requestId: number): Observable<ApiResponse<RequestContextDto>> {
    return this.http.get<ApiResponse<RequestContextDto>>(
      `${this.base}/requests/admin-history/${requestId}`,
    );
  }

  getFormContext(
    formCode: string | null | undefined,
    requestId: number,
  ): Observable<ApiResponse<RequestContextDto>> {
    switch ((formCode ?? '').toUpperCase()) {
      case 'CONFERENCE':
        return this.http.get<ApiResponse<RequestContextDto>>(
          `${this.base}/conference/${requestId}`,
        );
      case 'JOURNAL':
        return this.http.get<ApiResponse<RequestContextDto>>(`${this.base}/journal/${requestId}`);
      case 'EXTERNAL':
        return this.http.get<ApiResponse<RequestContextDto>>(
          `${this.base}/requests/external-project/${requestId}`,
        );
      case 'RDIG':
      default:
        return this.http.get<ApiResponse<RequestContextDto>>(`${this.base}/rdig/${requestId}`);
    }
  }

  getRequestWorkflow(requestId: number): Observable<ApiResponse<RequestWorkflowDto>> {
    return this.http.get<ApiResponse<RequestWorkflowDto>>(
      `${this.base}/requests/${requestId}/workflow`,
    );
  }

  /** Actions the current user may take on this request right now. */
  getAvailableActions(requestId: number): Observable<ApiResponse<AvailableActionsDto>> {
    return this.http.get<ApiResponse<AvailableActionsDto>>(
      `${this.base}/requests/${requestId}/actions`,
    );
  }

  /** Perform a workflow action (approve/reject/return/resubmit/…) on a request. */
  actOnRequest(requestId: number, payload: ActOnRequestPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${this.base}/requests/${requestId}/actions`,
      payload,
    );
  }

  getApprovals(
    requestId: number,
    query?: ListQuery,
  ): Observable<ApiResponse<PaginatedData<ApprovalDto>>> {
    return this.http.get<ApiResponse<PaginatedData<ApprovalDto>>>(
      `${this.base}/requests/${requestId}/approvals`,
      { params: this.toParams(query) },
    );
  }

  getComments(requestId: number): Observable<ApiResponse<RequestCommentDto[]>> {
    return this.http.get<ApiResponse<RequestCommentDto[]>>(
      `${this.base}/requests/${requestId}/comments`,
    );
  }

  createSectionComment(
    requestId: number,
    payload: CreateSectionCommentPayload,
  ): Observable<ApiResponse<RequestCommentDto>> {
    return this.http.post<ApiResponse<RequestCommentDto>>(
      `${this.base}/requests/${requestId}/comments`,
      {
        ...payload,
        comment_type: 'section_review',
      },
    );
  }

  updateSectionComment(
    requestId: number,
    commentId: number,
    payload: UpdateSectionCommentPayload,
  ): Observable<ApiResponse<RequestCommentDto>> {
    return this.http.patch<ApiResponse<RequestCommentDto>>(
      `${this.base}/requests/${requestId}/comments/${commentId}`,
      payload,
    );
  }

  deleteSectionComment(
    requestId: number,
    commentId: number,
  ): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/requests/${requestId}/comments/${commentId}`,
    );
  }

  getPrintUrl(requestId: number): string {
    return `${this.base}/requests/${requestId}/print`;
  }

  downloadPrint(requestId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(this.getPrintUrl(requestId), {
      observe: 'response',
      responseType: 'blob',
    });
  }
}
