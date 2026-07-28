import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  SKIP_API_SUCCESS_TOAST,
  SKIP_API_TOAST,
} from '../../core/interceptors/api-message.interceptor';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ExternalGrantCategory {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface StaffOption {
  id: number;
  username: string | null;
  fullname: string | null;
  email: string | null;
  staff_type: string | null;
  department: string | null;
}

export interface ExternalProjectPayload {
  external_grant_category_id?: number | null;
  project_account_code?: string | null;
  reference_code?: string | null;
  description?: string | null;
  staff_name?: string | null;
  school_department?: string | null;
  sponsor_name?: string | null;
  grant_name?: string | null;
  client_stakeholder?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number | null;
  research_title?: string | null;
  consultancy_title?: string | null;
  total_budget_request?: string | null;
  remark?: string | null;
  is_billing_required?: boolean;
}

export interface ExternalProjectFormData {
  request: any;
  external_project: any | null;
  internal_co_researchers: any[];
  external_collaborators: any[];
  expected_outcomes: any[];
  budget_sections: any[];
  budget_items: any[];
  billing: any | null;
  billing_items: any[];
  attachments: any[];
}

export interface ProjectAccountCodeAvailability {
  code: string;
  available: boolean;
  is_current_request_code: boolean;
}

export interface InternalCoResearcherPayload {
  staff_name: string;
  school_department?: string | null;
  display_order?: number;
}

export interface ExternalCollaboratorPayload {
  full_name: string;
  affiliation?: string | null;
  display_order?: number;
}

export interface ExpectedOutcomePayload {
  description?: string | null;
  display_order?: number;
}

export interface BudgetSectionPayload {
  section_code: string;
  section_name: string;
  total_amount_rm?: string | null;
  requires_quotation?: boolean;
  quotation_attachment_id?: number | null;
  display_order?: number;
}

export interface BudgetItemPayload {
  external_form_budget_section_id: number;
  description?: string | null;
  amount_rm?: string | null;
  display_order?: number;
}

export interface BillingPayload {
  billing_amount?: string | null;
  billing_date?: string | null;
}

export interface BillingItemPayload {
  description?: string | null;
  amount_rm?: string | null;
  display_order?: number;
}

@Injectable({ providedIn: 'root' })
export class ExternalProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly externalProjectUrl = `${this.apiUrl}/requests/external-project`;
  private readonly masterDataUrl = `${this.apiUrl}/master-data`;
  private readonly mutationOptions = {
    context: new HttpContext().set(SKIP_API_SUCCESS_TOAST, true),
  };

  listGrantCategories(): Observable<ApiResponse<ExternalGrantCategory[]>> {
    return this.http.get<ApiResponse<ExternalGrantCategory[]>>(
      `${this.masterDataUrl}/external-grant-categories`,
      { params: new HttpParams().set('include_inactive', false) },
    );
  }

  listStaffOptions(search?: string): Observable<ApiResponse<StaffOption[]>> {
    let params = new HttpParams().set('include_inactive', false);
    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      params = params.set('search', normalizedSearch);
    }

    return this.http.get<ApiResponse<StaffOption[]>>(`${this.masterDataUrl}/staff`, { params });
  }

  checkProjectAccountCodeAvailability(
    code: string,
    requestId?: number | null,
  ): Observable<ApiResponse<ProjectAccountCodeAvailability>> {
    let params = new HttpParams().set('code', code.trim());
    if (requestId) {
      params = params.set('request_id', requestId);
    }

    return this.http.get<ApiResponse<ProjectAccountCodeAvailability>>(
      `${this.externalProjectUrl}/project-account-code-availability`,
      {
        params,
        context: new HttpContext().set(SKIP_API_TOAST, true),
      },
    );
  }

  createDraft(payload: ExternalProjectPayload): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.post<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/drafts`,
      payload,
      this.mutationOptions,
    );
  }

  getForm(requestId: number): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.get<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/${requestId}`,
    );
  }

  updateDraft(
    requestId: number,
    payload: ExternalProjectPayload,
  ): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.put<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/${requestId}/draft`,
      payload,
      this.mutationOptions,
    );
  }

  submit(requestId: number): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.post<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/${requestId}/submit`,
      {},
      this.mutationOptions,
    );
  }

  createInternalCoResearcher(
    requestId: number,
    payload: InternalCoResearcherPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/internal-co-researchers`,
      payload,
      this.mutationOptions,
    );
  }

  deleteInternalCoResearcher(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/internal-co-researchers/${itemId}`,
      this.mutationOptions,
    );
  }

  createExternalCollaborator(
    requestId: number,
    payload: ExternalCollaboratorPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/external-collaborators`,
      payload,
      this.mutationOptions,
    );
  }

  deleteExternalCollaborator(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/external-collaborators/${itemId}`,
      this.mutationOptions,
    );
  }

  createExpectedOutcome(
    requestId: number,
    payload: ExpectedOutcomePayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/expected-outcomes`,
      payload,
      this.mutationOptions,
    );
  }

  deleteExpectedOutcome(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/expected-outcomes/${itemId}`,
      this.mutationOptions,
    );
  }

  createBudgetSection(
    requestId: number,
    payload: BudgetSectionPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-sections`,
      payload,
      this.mutationOptions,
    );
  }

  deleteBudgetSection(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-sections/${itemId}`,
      this.mutationOptions,
    );
  }

  createBudgetItem(requestId: number, payload: BudgetItemPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-items`,
      payload,
      this.mutationOptions,
    );
  }

  deleteBudgetItem(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-items/${itemId}`,
      this.mutationOptions,
    );
  }

  createBilling(requestId: number, payload: BillingPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing`,
      payload,
      this.mutationOptions,
    );
  }

  deleteBilling(requestId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing`,
      this.mutationOptions,
    );
  }

  createBillingItem(requestId: number, payload: BillingItemPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing-items`,
      payload,
      this.mutationOptions,
    );
  }

  deleteBillingItem(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing-items/${itemId}`,
      this.mutationOptions,
    );
  }
}
