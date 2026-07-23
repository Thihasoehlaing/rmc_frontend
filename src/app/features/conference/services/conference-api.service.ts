import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RequestSummaryDto } from '../../../core/services/workflow-requests.service';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Payload/response shape for the Conference request's own fields (snake_case — mirrors schemas/conference.py). */
export interface ConferenceRequestDto {
  id?: number;
  request_id?: number;
  conference_funding_request_type?: string | null;
  conference_type?: string | null;
  is_travelling_required?: boolean;
  author_role?: string | null;
  is_scopus_indexed?: boolean;
  is_restricted_publisher?: boolean;
  cited_apu_jati_ejbm?: boolean;
  cited_apu_jati_ejbm_explanation?: string | null;
  sdg_keyword_1?: string | null;
  sdg_keyword_2?: string | null;
  sdg_keyword_3?: string | null;
  conference_name?: string | null;
  conference_start_date?: string | null;
  conference_end_date?: string | null;
  location_type?: string | null;
  conference_location?: string | null;
  project_type?: string | null;
  project_account_code?: string | null;
  paper_title?: string | null;
  region_id?: number | null;
  is_manuscript_internally_reviewed?: boolean;
  reviewer_name?: string | null;
  is_published_elsewhere?: boolean;
  declaration_terms_accepted?: boolean;
  declaration_funder_acknowledged?: boolean;
  external_sponsorship_amount?: string | null;
  external_sponsored_by?: string | null;
  apu_sponsorship_percentage?: string | null;
  apu_sponsorship_amount?: string | null;
  cost_to_be_borne_by_applicant?: string | null;
  remarks?: string | null;
  purpose_of_business_travel?: string | null;
  bookings_done_by_type?: 'SELF' | 'OTHER' | null;
  bookings_done_by_username?: string | null;
  bookings_done_by_other_name?: string | null;
  is_cash_advance_required?: boolean;
  cash_advance_reason?: string | null;
  has_travelling_colleagues?: boolean;
  travel_events?: ConferenceTravelEventDto[];
  travelling_colleagues?: ConferenceTravellingColleagueDto[];
  [key: string]: unknown;
}

export interface ConferenceStaffCoAuthorDto {
  id?: number;
  staff_name?: string | null;
  staff_department?: string | null;
  affiliation?: string | null;
  display_order?: number | null;
}

export interface ConferenceStudentCoAuthorDto {
  id?: number;
  tp_number?: string | null;
  full_name?: string | null;
  school_department?: string | null;
  affiliation?: string | null;
  display_order?: number | null;
}

export interface ConferenceNonApuCoAuthorDto {
  id?: number;
  full_name?: string | null;
  country?: string | null;
  email?: string | null;
  organisation_type?: string | null;
  school_department?: string | null;
  institution_company_name?: string | null;
  display_order?: number | null;
}

export interface ConferenceCostingItemDto {
  id?: number;
  project_account_code_id?: number | null;
  project_account_code_snapshot?: string | null;
  project_account_code_description_snapshot?: string | null;
  vote_number_id?: number | null;
  vote_number_snapshot?: string | null;
  vote_number_description_snapshot?: string | null;
  account_code_id?: number | null;
  account_code_snapshot?: string | null;
  account_code_description_snapshot?: string | null;
  supporting_document_attachment_id?: number | null;
  cost_in_rm?: string | null;
  cost_in_foreign_currency?: string | null;
  exchange_rate?: string | null;
  description?: string | null;
}

export interface ConferenceAttachmentDto {
  id: number;
  request_id: number;
  entity_type?: string | null;
  entity_id?: number | null;
  upload_group_id?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_by_username?: string | null;
  uploaded_at?: string | null;
  file_url?: string | null;
  download_url?: string | null;
  url?: string | null;
}

export interface ConferenceTravelEventDto {
  id?: number;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  /** Legacy response field retained while older Conference drafts are migrated. */
  event_time?: string | null;
  description?: string | null;
  display_order?: number | null;
}

export interface ConferenceTravellingColleagueDto {
  id?: number;
  staff_username?: string | null;
  staff_name_snapshot?: string | null;
  department_name_snapshot?: string | null;
  display_order?: number | null;
}

export interface ConferenceFormData {
  request: RequestSummaryDto;
  conference: ConferenceRequestDto | null;
  apu_staff_co_authors: ConferenceStaffCoAuthorDto[];
  apu_student_co_authors: ConferenceStudentCoAuthorDto[];
  non_apu_co_authors: ConferenceNonApuCoAuthorDto[];
  costing_items: ConferenceCostingItemDto[];
  travel_events: ConferenceTravelEventDto[];
  travelling_colleagues: ConferenceTravellingColleagueDto[];
  attachments: ConferenceAttachmentDto[];
}

/** Thin wrapper over the real Conference backend API (routes/conference.py) — mirrors the wire contract 1:1. */
@Injectable({ providedIn: 'root' })
export class ConferenceApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly base = `${this.apiUrl}/conference`;

  // ── Lifecycle ────────────────────────────────────────────────────
  createDraft(
    payload: Partial<ConferenceRequestDto>,
  ): Observable<ApiResponse<ConferenceFormData>> {
    return this.http.post<ApiResponse<ConferenceFormData>>(`${this.base}/drafts`, payload);
  }

  getForm(id: number): Observable<ApiResponse<ConferenceFormData>> {
    return this.http.get<ApiResponse<ConferenceFormData>>(`${this.base}/${id}`);
  }

  updateDraft(
    id: number,
    payload: Partial<ConferenceRequestDto>,
  ): Observable<ApiResponse<ConferenceFormData>> {
    return this.http.put<ApiResponse<ConferenceFormData>>(`${this.base}/${id}/draft`, payload);
  }

  submit(id: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.post<ApiResponse<RequestSummaryDto>>(`${this.base}/${id}/submit`, {});
  }

  resubmit(id: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.post<ApiResponse<RequestSummaryDto>>(`${this.base}/${id}/resubmit`, {});
  }

  // ── APU Staff Co-Authors ─────────────────────────────────────────
  listStaffCoAuthors(id: number): Observable<ApiResponse<ConferenceStaffCoAuthorDto[]>> {
    return this.http.get<ApiResponse<ConferenceStaffCoAuthorDto[]>>(
      `${this.base}/${id}/apu-staff-co-authors`,
    );
  }

  createStaffCoAuthor(
    id: number,
    payload: ConferenceStaffCoAuthorDto,
  ): Observable<ApiResponse<ConferenceStaffCoAuthorDto>> {
    return this.http.post<ApiResponse<ConferenceStaffCoAuthorDto>>(
      `${this.base}/${id}/apu-staff-co-authors`,
      payload,
    );
  }

  updateStaffCoAuthor(
    id: number,
    itemId: number,
    payload: Partial<ConferenceStaffCoAuthorDto>,
  ): Observable<ApiResponse<ConferenceStaffCoAuthorDto>> {
    return this.http.put<ApiResponse<ConferenceStaffCoAuthorDto>>(
      `${this.base}/${id}/apu-staff-co-authors/${itemId}`,
      payload,
    );
  }

  deleteStaffCoAuthor(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/apu-staff-co-authors/${itemId}`,
    );
  }

  // ── APU Student Co-Authors ───────────────────────────────────────
  listStudentCoAuthors(id: number): Observable<ApiResponse<ConferenceStudentCoAuthorDto[]>> {
    return this.http.get<ApiResponse<ConferenceStudentCoAuthorDto[]>>(
      `${this.base}/${id}/apu-student-co-authors`,
    );
  }

  createStudentCoAuthor(
    id: number,
    payload: ConferenceStudentCoAuthorDto,
  ): Observable<ApiResponse<ConferenceStudentCoAuthorDto>> {
    return this.http.post<ApiResponse<ConferenceStudentCoAuthorDto>>(
      `${this.base}/${id}/apu-student-co-authors`,
      payload,
    );
  }

  updateStudentCoAuthor(
    id: number,
    itemId: number,
    payload: Partial<ConferenceStudentCoAuthorDto>,
  ): Observable<ApiResponse<ConferenceStudentCoAuthorDto>> {
    return this.http.put<ApiResponse<ConferenceStudentCoAuthorDto>>(
      `${this.base}/${id}/apu-student-co-authors/${itemId}`,
      payload,
    );
  }

  deleteStudentCoAuthor(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/apu-student-co-authors/${itemId}`,
    );
  }

  // ── Non-APU Co-Authors ───────────────────────────────────────────
  listNonApuCoAuthors(id: number): Observable<ApiResponse<ConferenceNonApuCoAuthorDto[]>> {
    return this.http.get<ApiResponse<ConferenceNonApuCoAuthorDto[]>>(
      `${this.base}/${id}/non-apu-co-authors`,
    );
  }

  createNonApuCoAuthor(
    id: number,
    payload: ConferenceNonApuCoAuthorDto,
  ): Observable<ApiResponse<ConferenceNonApuCoAuthorDto>> {
    return this.http.post<ApiResponse<ConferenceNonApuCoAuthorDto>>(
      `${this.base}/${id}/non-apu-co-authors`,
      payload,
    );
  }

  updateNonApuCoAuthor(
    id: number,
    itemId: number,
    payload: Partial<ConferenceNonApuCoAuthorDto>,
  ): Observable<ApiResponse<ConferenceNonApuCoAuthorDto>> {
    return this.http.put<ApiResponse<ConferenceNonApuCoAuthorDto>>(
      `${this.base}/${id}/non-apu-co-authors/${itemId}`,
      payload,
    );
  }

  deleteNonApuCoAuthor(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/non-apu-co-authors/${itemId}`,
    );
  }

  // ── Costing Items ─────────────────────────────────────────────────
  listCostingItems(id: number): Observable<ApiResponse<ConferenceCostingItemDto[]>> {
    return this.http.get<ApiResponse<ConferenceCostingItemDto[]>>(
      `${this.base}/${id}/costing-items`,
    );
  }

  createCostingItem(
    id: number,
    payload: ConferenceCostingItemDto,
  ): Observable<ApiResponse<ConferenceCostingItemDto>> {
    return this.http.post<ApiResponse<ConferenceCostingItemDto>>(
      `${this.base}/${id}/costing-items`,
      payload,
    );
  }

  updateCostingItem(
    id: number,
    itemId: number,
    payload: Partial<ConferenceCostingItemDto>,
  ): Observable<ApiResponse<ConferenceCostingItemDto>> {
    return this.http.put<ApiResponse<ConferenceCostingItemDto>>(
      `${this.base}/${id}/costing-items/${itemId}`,
      payload,
    );
  }

  deleteCostingItem(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/costing-items/${itemId}`);
  }

  // ── Attachments ──────────────────────────────────────────────────
  listAttachments(id: number): Observable<ApiResponse<ConferenceAttachmentDto[]>> {
    return this.http.get<ApiResponse<ConferenceAttachmentDto[]>>(`${this.base}/${id}/attachments`);
  }

  uploadAttachment(
    id: number,
    file: File,
    entityType?: string,
    entityId?: number,
    uploadGroupId?: string,
  ): Observable<ApiResponse<ConferenceAttachmentDto>> {
    const formData = new FormData();
    formData.append('file', file);
    if (entityType) formData.append('entity_type', entityType);
    if (entityId !== undefined) formData.append('entity_id', String(entityId));
    if (uploadGroupId) formData.append('upload_group_id', uploadGroupId);
    return this.http.post<ApiResponse<ConferenceAttachmentDto>>(
      `${this.base}/${id}/attachments`,
      formData,
    );
  }

  getAttachmentDownloadUrl(
    id: number,
    attachmentId: number,
  ): Observable<ApiResponse<ConferenceAttachmentDto & { download_url: string }>> {
    return this.http.get<ApiResponse<ConferenceAttachmentDto & { download_url: string }>>(
      `${this.base}/${id}/attachments/${attachmentId}/download-url`,
    );
  }

  deleteAttachment(id: number, attachmentId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/attachments/${attachmentId}`);
  }
}
