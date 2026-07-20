import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

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
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly externalProjectUrl = `${this.apiUrl}/requests/external-project`;
  private readonly masterDataUrl = `${this.apiUrl}/master-data`;

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

  createDraft(payload: ExternalProjectPayload): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.post<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/drafts`,
      payload,
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
    );
  }

  submit(requestId: number): Observable<ApiResponse<ExternalProjectFormData>> {
    return this.http.post<ApiResponse<ExternalProjectFormData>>(
      `${this.externalProjectUrl}/${requestId}/submit`,
      {},
    );
  }

  createInternalCoResearcher(
    requestId: number,
    payload: InternalCoResearcherPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/internal-co-researchers`,
      payload,
    );
  }

  deleteInternalCoResearcher(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/internal-co-researchers/${itemId}`,
    );
  }

  createExternalCollaborator(
    requestId: number,
    payload: ExternalCollaboratorPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/external-collaborators`,
      payload,
    );
  }

  deleteExternalCollaborator(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/external-collaborators/${itemId}`,
    );
  }

  createExpectedOutcome(
    requestId: number,
    payload: ExpectedOutcomePayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/expected-outcomes`,
      payload,
    );
  }

  deleteExpectedOutcome(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/expected-outcomes/${itemId}`,
    );
  }

  createBudgetSection(
    requestId: number,
    payload: BudgetSectionPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-sections`,
      payload,
    );
  }

  deleteBudgetSection(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-sections/${itemId}`,
    );
  }

  createBudgetItem(requestId: number, payload: BudgetItemPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-items`,
      payload,
    );
  }

  deleteBudgetItem(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/budget-items/${itemId}`,
    );
  }

  createBilling(requestId: number, payload: BillingPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing`,
      payload,
    );
  }

  deleteBilling(requestId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.externalProjectUrl}/${requestId}/billing`);
  }

  createBillingItem(requestId: number, payload: BillingItemPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing-items`,
      payload,
    );
  }

  deleteBillingItem(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.externalProjectUrl}/${requestId}/billing-items/${itemId}`,
    );
  }
}
