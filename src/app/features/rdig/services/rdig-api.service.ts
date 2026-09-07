import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type RdigTrack = 'social-innovation' | 'fundamental-research';

/** Payload/response shape for the RDIG request's own fields (snake_case — mirrors schemas/rdig.py). */
export interface RdigRequestDto {
  id?: number;
  request_id?: number;
  application_type?: string | null;
  project_category?: string | null;
  track?: RdigTrack | null;
  project_duration_months?: number | null;
  project_title?: string | null;
  research_area?: string | null;
  research_cluster_id?: number | null;
  research_domain_id?: number | null;
  sub_research_domain_id?: number | null;
  executive_summary?: string | null;
  keywords?: string | null;
  introduction?: string | null;
  problem_statement?: string | null;
  research_aim_objectives?: string | null;
  research_questions?: string | null;
  hypothesis_propositions?: string | null;
  literature_review?: string | null;
  research_methodology?: string | null;
  references_text?: string | null;
  benefit_to_apu?: string | null;
  benefit_to_students?: string | null;
  benefit_to_stakeholders?: string | null;
  vision_mission_alignment?: string | null;
  project_leader_staff_id?: string | null;
  project_leader_name?: string | null;
  project_leader_email?: string | null;
  project_leader_department?: string | null;
  project_leader_job_position?: string | null;
  project_leader_role_in_project?: string | null;
  declaration_no_ongoing_rdig_self?: boolean;
  declaration_no_ongoing_rdig_coresearchers?: boolean;
  declaration_agreement_accepted?: boolean;
  novelty_justification?: string | null;
  budget_remarks?: string | null;
  total_budget_request?: string | null;
  indexed_journal_selected?: boolean;
  indexed_journal_quantity?: number | null;
  conceptual_design_selected?: boolean;
  knowledge_transfer_programme_selected?: boolean;
  application_external_grant_selected?: boolean;
  other_output_selected?: boolean;
  other_output_specification?: string | null;
  [key: string]: unknown;
}

export interface RdigCoResearcherDto {
  id?: number;
  staff_id?: string | null;
  staff_name?: string | null;
  staff_email?: string | null;
  staff_department?: string | null;
  area_of_expertise?: string | null;
  role_in_project?: string | null;
  display_order?: number | null;
}

export interface RdigCollaboratorDto {
  id?: number;
  staff_id?: string | null;
  full_name?: string | null;
  title?: string | null;
  email?: string | null;
  institution_company_name?: string | null;
  organisation_type?: string | null;
  position?: string | null;
  department?: string | null;
  country_code?: string | null;
  matched_funding_amount?: string | null;
  role_in_project?: string | null;
  display_order?: number | null;
  support_letter_attachment_id?: number | null;
}

export interface RdigResearchActivityDto {
  id?: number;
  activity_name?: string | null;
  start_month?: number | null;
  end_month?: number | null;
  duration_months?: number | null;
  display_order?: number | null;
}

export interface RdigBudgetSectionDto {
  id?: number;
  budget_section_id?: number;
  section_code: string;
  section_name?: string;
  display_order?: number;
}

export interface RdigBudgetItemDto {
  id?: number;
  rdig_budget_section_id: number;
  description?: string | null;
  amount_rm?: string | null;
  remarks?: string | null;
  display_order?: number | null;
  quotation_attachment_id?: number | null;
}

export interface RdigAttachmentDto {
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
}

export interface RdigActiveBatchResponse {
  has_active_batch: boolean;
  can_submit: boolean;
  message: string;
  batch: {
    id: number;
    batch_name: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'planned' | 'completed';
    /**
     * The "Applicant" stage window within the batch. Applicant users are gated
     * on this window's start (when it opens for submissions), not the overall
     * batch start. When absent, the frontend shows the no-window state and does
     * not substitute the batch start or end dates.
     */
    applicant_start_date?: string | null;
    applicant_end_date?: string | null;
    applicant_stage_start_date?: string | null;
    applicant_stage_end_date?: string | null;
    submission_start_date?: string | null;
    submission_end_date?: string | null;
    stage_windows?: Array<{
      stage_name: string;
      stage_start_date: string | null;
      stage_end_date: string | null;
    }>;
  } | null;
}

/** Thin wrapper over the real RDIG backend API (routes/rdig.py) — mirrors the wire contract 1:1. */
@Injectable({ providedIn: 'root' })
export class RdigApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly base = `${this.apiUrl}/rdig`;

  // ── Lifecycle ────────────────────────────────────────────────────
  createDraft(payload: Partial<RdigRequestDto>): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/drafts`, payload);
  }

  getForm(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/${id}`);
  }

  updateDraft(id: number, payload: Partial<RdigRequestDto>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/${id}/draft`, payload);
  }

  submit(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${id}/submit`, {});
  }

  resubmit(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${id}/resubmit`, {});
  }

  getActiveBatch(): Observable<ApiResponse<RdigActiveBatchResponse>> {
    return this.http.get<ApiResponse<RdigActiveBatchResponse>>(`${this.base}/active-batch`);
  }

  // ── APU Co-Researchers ──────────────────────────────────────────
  listCoResearchers(id: number): Observable<ApiResponse<RdigCoResearcherDto[]>> {
    return this.http.get<ApiResponse<RdigCoResearcherDto[]>>(`${this.base}/${id}/apu-co-researchers`);
  }

  createCoResearcher(
    id: number,
    payload: RdigCoResearcherDto,
  ): Observable<ApiResponse<RdigCoResearcherDto>> {
    return this.http.post<ApiResponse<RdigCoResearcherDto>>(
      `${this.base}/${id}/apu-co-researchers`,
      payload,
    );
  }

  updateCoResearcher(
    id: number,
    itemId: number,
    payload: Partial<RdigCoResearcherDto>,
  ): Observable<ApiResponse<RdigCoResearcherDto>> {
    return this.http.put<ApiResponse<RdigCoResearcherDto>>(
      `${this.base}/${id}/apu-co-researchers/${itemId}`,
      payload,
    );
  }

  deleteCoResearcher(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/apu-co-researchers/${itemId}`);
  }

  // ── Collaborators ────────────────────────────────────────────────
  listCollaborators(id: number): Observable<ApiResponse<RdigCollaboratorDto[]>> {
    return this.http.get<ApiResponse<RdigCollaboratorDto[]>>(`${this.base}/${id}/collaborators`);
  }

  createCollaborator(
    id: number,
    payload: RdigCollaboratorDto,
  ): Observable<ApiResponse<RdigCollaboratorDto>> {
    return this.http.post<ApiResponse<RdigCollaboratorDto>>(`${this.base}/${id}/collaborators`, payload);
  }

  updateCollaborator(
    id: number,
    itemId: number,
    payload: Partial<RdigCollaboratorDto>,
  ): Observable<ApiResponse<RdigCollaboratorDto>> {
    return this.http.put<ApiResponse<RdigCollaboratorDto>>(
      `${this.base}/${id}/collaborators/${itemId}`,
      payload,
    );
  }

  deleteCollaborator(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/collaborators/${itemId}`);
  }

  // ── ESG / SDG selections (bulk replace) ─────────────────────────
  listEsgSelections(id: number): Observable<ApiResponse<{ esg_ids: number[] }>> {
    return this.http.get<ApiResponse<{ esg_ids: number[] }>>(`${this.base}/${id}/esg-selections`);
  }

  replaceEsgSelections(id: number, esgIds: number[]): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${id}/esg-selections`, {
      esg_ids: esgIds,
    });
  }

  listSdgSelections(id: number): Observable<ApiResponse<{ sdg_ids: number[] }>> {
    return this.http.get<ApiResponse<{ sdg_ids: number[] }>>(`${this.base}/${id}/sdg-selections`);
  }

  replaceSdgSelections(id: number, sdgIds: number[]): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${id}/sdg-selections`, {
      sdg_ids: sdgIds,
    });
  }

  // ── Research Activities ─────────────────────────────────────────
  listResearchActivities(id: number): Observable<ApiResponse<RdigResearchActivityDto[]>> {
    return this.http.get<ApiResponse<RdigResearchActivityDto[]>>(
      `${this.base}/${id}/research-activities`,
    );
  }

  createResearchActivity(
    id: number,
    payload: RdigResearchActivityDto,
  ): Observable<ApiResponse<RdigResearchActivityDto>> {
    return this.http.post<ApiResponse<RdigResearchActivityDto>>(
      `${this.base}/${id}/research-activities`,
      payload,
    );
  }

  updateResearchActivity(
    id: number,
    itemId: number,
    payload: Partial<RdigResearchActivityDto>,
  ): Observable<ApiResponse<RdigResearchActivityDto>> {
    return this.http.put<ApiResponse<RdigResearchActivityDto>>(
      `${this.base}/${id}/research-activities/${itemId}`,
      payload,
    );
  }

  deleteResearchActivity(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/research-activities/${itemId}`);
  }

  // ── Budget Sections (auto-created on draft creation) ────────────
  listBudgetSections(id: number): Observable<ApiResponse<RdigBudgetSectionDto[]>> {
    return this.http.get<ApiResponse<RdigBudgetSectionDto[]>>(`${this.base}/${id}/budget-sections`);
  }

  // ── Budget Items ─────────────────────────────────────────────────
  listBudgetItems(id: number): Observable<ApiResponse<RdigBudgetItemDto[]>> {
    return this.http.get<ApiResponse<RdigBudgetItemDto[]>>(`${this.base}/${id}/budget-items`);
  }

  createBudgetItem(
    id: number,
    payload: RdigBudgetItemDto,
  ): Observable<ApiResponse<RdigBudgetItemDto>> {
    return this.http.post<ApiResponse<RdigBudgetItemDto>>(`${this.base}/${id}/budget-items`, payload);
  }

  updateBudgetItem(
    id: number,
    itemId: number,
    payload: Partial<RdigBudgetItemDto>,
  ): Observable<ApiResponse<RdigBudgetItemDto>> {
    return this.http.put<ApiResponse<RdigBudgetItemDto>>(
      `${this.base}/${id}/budget-items/${itemId}`,
      payload,
    );
  }

  deleteBudgetItem(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/budget-items/${itemId}`);
  }

  // ── Attachments ──────────────────────────────────────────────────
  listAttachments(id: number): Observable<ApiResponse<RdigAttachmentDto[]>> {
    return this.http.get<ApiResponse<RdigAttachmentDto[]>>(`${this.base}/${id}/attachments`);
  }

  uploadAttachment(
    id: number,
    file: File,
    entityType?: string,
    entityId?: number,
    uploadGroupId?: string,
  ): Observable<ApiResponse<RdigAttachmentDto>> {
    const formData = new FormData();
    formData.append('file', file);
    if (entityType) formData.append('entity_type', entityType);
    if (entityId !== undefined) formData.append('entity_id', String(entityId));
    if (uploadGroupId) formData.append('upload_group_id', uploadGroupId);
    return this.http.post<ApiResponse<RdigAttachmentDto>>(`${this.base}/${id}/attachments`, formData);
  }

  getAttachmentDownloadUrl(
    id: number,
    attachmentId: number,
  ): Observable<ApiResponse<RdigAttachmentDto & { download_url: string }>> {
    return this.http.get<ApiResponse<RdigAttachmentDto & { download_url: string }>>(
      `${this.base}/${id}/attachments/${attachmentId}/download-url`,
    );
  }

  deleteAttachment(id: number, attachmentId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/attachments/${attachmentId}`);
  }
}
