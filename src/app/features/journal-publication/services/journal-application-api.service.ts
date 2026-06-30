import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface JournalRequestPayload {
  author_role?: string | null;
  journal_name?: string | null;
  scopus_quartile?: string | null;
  project_type?: string | null;
  project_account_code?: string | null;
  is_restricted_publisher?: boolean;
  cited_apu_jati_ejbm?: boolean;
  cited_apu_jati_ejbm_explanation?: string | null;
  paper_title?: string | null;
  sdg_keyword_1?: string | null;
  sdg_keyword_2?: string | null;
  sdg_keyword_3?: string | null;
  reviewer_name?: string | null;
  is_manuscript_internally_reviewed?: boolean;
  is_published_elsewhere?: boolean;
  declaration_terms_accepted?: boolean;
  declaration_funder_acknowledged?: boolean;
  external_sponsorship_amount?: string | null;
  external_sponsored_by?: string | null;
  apu_sponsorship_percentage?: string | null;
  apu_sponsorship_amount?: string | null;
  cost_to_be_borne_by_applicant?: string | null;
  remarks?: string | null;
}

export interface JournalCostingPayload {
  project_account_code_id?: number | null;
  vote_number_id?: number | null;
  account_code_id?: number | null;
  supporting_document_attachment_id?: number | null;
  cost_in_foreign_currency?: string | null;
  exchange_rate?: string | null;
  cost_in_rm?: string | null;
  description?: string | null;
}

export interface JournalStaffAuthorPayload {
  staff_name?: string | null;
  staff_department?: string | null;
  affiliation?: string | null;
  display_order?: number | null;
}

export interface JournalStudentAuthorPayload {
  tp_number?: string | null;
  full_name?: string | null;
  school_department?: string | null;
  affiliation?: string | null;
  display_order?: number | null;
}

export interface JournalNonApuAuthorPayload {
  full_name?: string | null;
  country?: string | null;
  email?: string | null;
  organisation_type?: string | null;
  school_department?: string | null;
  institution_company_name?: string | null;
  display_order?: number | null;
}

export interface JournalFormData {
  request: any;
  journal: any | null;
  apu_staff_co_authors: any[];
  apu_student_co_authors: any[];
  non_apu_co_authors: any[];
  costing_items: any[];
  attachments: any[];
}

export interface FinanceOption {
  id: number;
  code: string;
  description: string | null;
  location_type?: string | null;
  category_name?: string | null;
}

export interface JournalOptionsData {
  projectAccountCodes: FinanceOption[];
  voteNumbers: FinanceOption[];
  accountCodes: FinanceOption[];
}

@Injectable({ providedIn: 'root' })
export class JournalApplicationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly journalUrl = `${this.apiUrl}/api/journal`;
  private readonly masterDataUrl = `${this.apiUrl}/api/master-data`;

  createDraft(payload: JournalRequestPayload): Observable<ApiResponse<JournalFormData>> {
    return this.http.post<ApiResponse<JournalFormData>>(`${this.journalUrl}/drafts`, payload);
  }

  getForm(requestId: number): Observable<ApiResponse<JournalFormData>> {
    return this.http.get<ApiResponse<JournalFormData>>(`${this.journalUrl}/${requestId}`);
  }

  updateDraft(
    requestId: number,
    payload: JournalRequestPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.journalUrl}/${requestId}/draft`, payload);
  }

  submit(requestId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.journalUrl}/${requestId}/submit`, {});
  }

  createCostingItem(
    requestId: number,
    payload: JournalCostingPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/costing-items`,
      payload,
    );
  }

  deleteCostingItem(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/costing-items/${itemId}`,
    );
  }

  createStaffAuthor(
    requestId: number,
    payload: JournalStaffAuthorPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/apu-staff-co-authors`,
      payload,
    );
  }

  deleteStaffAuthor(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/apu-staff-co-authors/${itemId}`,
    );
  }

  createStudentAuthor(
    requestId: number,
    payload: JournalStudentAuthorPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/apu-student-co-authors`,
      payload,
    );
  }

  deleteStudentAuthor(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/apu-student-co-authors/${itemId}`,
    );
  }

  createNonApuAuthor(
    requestId: number,
    payload: JournalNonApuAuthorPayload,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/non-apu-co-authors`,
      payload,
    );
  }

  deleteNonApuAuthor(requestId: number, itemId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.journalUrl}/${requestId}/non-apu-co-authors/${itemId}`,
    );
  }

  listProjectAccountCodes(): Observable<ApiResponse<FinanceOption[]>> {
    return this.http.get<ApiResponse<FinanceOption[]>>(
      `${this.masterDataUrl}/project-account-codes`,
      { params: new HttpParams().set('form_code', 'JOURNAL') },
    );
  }

  listVoteNumbers(): Observable<ApiResponse<FinanceOption[]>> {
    return this.http.get<ApiResponse<FinanceOption[]>>(
      `${this.masterDataUrl}/vote-numbers`,
      { params: new HttpParams().set('form_code', 'JOURNAL') },
    );
  }

  listAccountCodes(): Observable<ApiResponse<FinanceOption[]>> {
    return this.http.get<ApiResponse<FinanceOption[]>>(
      `${this.masterDataUrl}/account-codes`,
      { params: new HttpParams().set('form_code', 'JOURNAL') },
    );
  }
}
