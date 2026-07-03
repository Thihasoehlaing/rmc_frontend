import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

export interface FormOption {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
}

export interface RoleOption {
  id: number;
  role_code: string;
  role_name: string;
  is_active: boolean;
}

export interface StaffOption {
  id: number;
  staff_id: number;
  username: string;
  fullname: string | null;
  email: string | null;
  staff_email: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
}

export interface WorkflowActorType {
  id: number;
  actor_code: string;
  actor_name: string;
  description: string | null;
  is_active: boolean;
}

export interface WorkflowProcess {
  id: number;
  form_id: number;
  form_code: string | null;
  form_name: string | null;
  workflow_code: string;
  workflow_name: string;
  version_no: number;
  is_active: boolean;
}

export interface WorkflowStep {
  id: number;
  workflow_process_id: number;
  step_no: number;
  step_code: string;
  step_name: string;
  actor_type_id: number | null;
  actor_code: string | null;
  actor_name: string | null;
  status_code: string;
  is_required: boolean;
  is_final_step: boolean;
  display_order: number;
}

export interface WorkflowStepAction {
  id: number;
  workflow_step_id: number;
  action_code: string;
  action_name: string;
  next_status_code: string | null;
  requires_remarks: boolean;
  is_active: boolean;
}

export interface WorkflowActorAssignment {
  id: number;
  workflow_process_id: number;
  actor_type_id: number;
  actor_code: string | null;
  actor_name: string | null;
  assignment_type: string;
  staff_id: string | null;
  role_id: number | null;
  role_code: string | null;
  role_name: string | null;
  job_title_keyword: string | null;
  can_view: boolean;
  can_act: boolean;
  notes: string | null;
  is_active: boolean;
}

export interface WorkflowDelegation {
  id: number;
  workflow_process_id: number;
  actor_type_id: number;
  actor_code: string | null;
  actor_name: string | null;
  delegator_staff_id: string | null;
  delegate_staff_id: string;
  can_view: boolean;
  can_act: boolean;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
}

export type WorkflowTabKey =
  | 'processes'
  | 'steps'
  | 'step-actions'
  | 'actor-types'
  | 'actor-assignments'
  | 'delegations';

const ENDPOINTS: Record<WorkflowTabKey, string> = {
  'actor-types': 'workflow-actor-types',
  processes: 'workflow-processes',
  steps: 'workflow-steps',
  'step-actions': 'workflow-step-actions',
  'actor-assignments': 'workflow-actor-assignments',
  delegations: 'workflow-delegations',
};

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly settingsUrl = `${this.apiUrl}/api/settings`;

  list<T>(
    tab: WorkflowTabKey,
    params: {
      page: number;
      perPage: number;
      search?: string;
      status?: '' | 'Active' | 'Inactive';
    },
  ): Observable<ApiResponse<PaginatedData<T>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<T>>>(this.url(tab), { params: httpParams });
  }

  get<T>(tab: WorkflowTabKey, id: number): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.url(tab)}/${id}`);
  }

  create<T>(tab: WorkflowTabKey, payload: Record<string, unknown>): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.url(tab), payload);
  }

  update<T>(
    tab: WorkflowTabKey,
    id: number,
    payload: Record<string, unknown>,
  ): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.url(tab)}/${id}`, payload);
  }

  delete<T>(tab: WorkflowTabKey, id: number): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.url(tab)}/${id}`);
  }

  listForms(): Observable<ApiResponse<FormOption[]>> {
    return this.http.get<ApiResponse<FormOption[]>>(`${this.apiUrl}/api/forms`);
  }

  listRoles(): Observable<ApiResponse<PaginatedData<RoleOption>>> {
    const params = new HttpParams()
      .set('page', 1)
      .set('per_page', 100)
      .set('status', 'Active');
    return this.http.get<ApiResponse<PaginatedData<RoleOption>>>(`${this.settingsUrl}/roles`, {
      params,
    });
  }

  listStaff(search = ''): Observable<ApiResponse<PaginatedData<StaffOption>>> {
    let params = new HttpParams()
      .set('page', 1)
      .set('per_page', 100)
      .set('status', 'Active');
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<PaginatedData<StaffOption>>>(`${this.settingsUrl}/staff`, {
      params,
    });
  }

  private url(tab: WorkflowTabKey): string {
    return `${this.settingsUrl}/${ENDPOINTS[tab]}`;
  }
}
