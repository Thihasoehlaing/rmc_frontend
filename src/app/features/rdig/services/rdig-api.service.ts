import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SKIP_API_SUCCESS_TOAST } from '../../../core/interceptors/api-message.interceptor';
import {
  PaginatedData,
  RequestSummaryDto,
} from '../../../core/services/workflow-requests.service';

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
  knowledge_transfer_community?: string | null;
  application_external_grant_selected?: boolean;
  external_grant_scheme?: string | null;
  other_output_selected?: boolean;
  other_output_specification?: string | null;
  research_cluster_name?: string | null;
  research_domain_name?: string | null;
  sub_research_domain_name?: string | null;
  esg_names?: string | null;
  esgs?: string | null;
  sdg_names?: string | null;
  sdgs?: string | null;
  ethics_declaration?: boolean | null;
  ethics_approval_required?: boolean;
  ethics_approval_attachment_id?: number | null;
  coresearchers_declaration?: boolean | null;
  justification?: string | null;
  novelty_statement?: string | null;
  [key: string]: unknown;
}

export interface RdigCoResearcherDto {
  id?: number;
  rdig_request_id?: number;
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
  rdig_request_id?: number;
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

export interface RdigEsgSelectionDto {
  id?: number;
  rdig_request_id?: number;
  esg_id: number;
  esg_name_snapshot?: string | null;
}

export interface RdigSdgSelectionDto {
  id?: number;
  rdig_request_id?: number;
  sdg_id: number;
  sdg_name_snapshot?: string | null;
}

export interface RdigResearchActivityDto {
  id?: number;
  rdig_request_id?: number;
  activity_name?: string | null;
  start_month?: number | null;
  end_month?: number | null;
  duration_months?: number | null;
  display_order?: number | null;
}

export interface RdigBudgetSectionDto {
  id?: number;
  rdig_request_id?: number;
  budget_section_id?: number;
  section_code: string;
  section_name?: string;
  display_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RdigBudgetItemDto {
  id?: number;
  rdig_budget_section_id: number;
  description?: string | null;
  amount_rm?: string | null;
  remarks?: string | null;
  display_order?: number | null;
  quotation_attachment_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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

export interface RdigFormData {
  request: RequestSummaryDto;
  rdig: RdigRequestDto | null;
  apu_co_researchers: RdigCoResearcherDto[];
  collaborators: RdigCollaboratorDto[];
  esg_selections: RdigEsgSelectionDto[];
  sdg_selections: RdigSdgSelectionDto[];
  research_activities: RdigResearchActivityDto[];
  budget_sections: RdigBudgetSectionDto[];
  budget_items: RdigBudgetItemDto[];
  attachments: RdigAttachmentDto[];
}

/** Thin wrapper over the real RDIG backend API (routes/rdig.py) — mirrors the wire contract 1:1. */
@Injectable({ providedIn: 'root' })
export class RdigApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly base = `${this.apiUrl}/rdig`;

  // ── Lifecycle ────────────────────────────────────────────────────
  createDraft(payload: Partial<RdigRequestDto>): Observable<ApiResponse<RdigFormData>> {
    return this.http.post<ApiResponse<RdigFormData>>(
      `${this.base}/drafts`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  getForm(id: number): Observable<ApiResponse<RdigFormData>> {
    return this.http.get<ApiResponse<RdigFormData>>(`${this.base}/${id}`);
  }

  updateDraft(id: number, payload: Partial<RdigRequestDto>): Observable<ApiResponse<RdigFormData>> {
    return this.http.put<ApiResponse<RdigFormData>>(
      `${this.base}/${id}/draft`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  submit(id: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.post<ApiResponse<RequestSummaryDto>>(`${this.base}/${id}/submit`, {});
  }

  resubmit(id: number): Observable<ApiResponse<RequestSummaryDto>> {
    return this.http.post<ApiResponse<RequestSummaryDto>>(`${this.base}/${id}/resubmit`, {});
  }

  getActiveBatch(): Observable<ApiResponse<RdigActiveBatchResponse>> {
    return this.http.get<ApiResponse<RdigActiveBatchResponse>>(`${this.base}/active-batch`);
  }

  // ── APU Co-Researchers ──────────────────────────────────────────
  listCoResearchers(id: number): Observable<ApiResponse<PaginatedData<RdigCoResearcherDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigCoResearcherDto>>>(
      `${this.base}/${id}/apu-co-researchers`,
    );
  }

  createCoResearcher(
    id: number,
    payload: RdigCoResearcherDto,
  ): Observable<ApiResponse<RdigCoResearcherDto>> {
    return this.http.post<ApiResponse<RdigCoResearcherDto>>(
      `${this.base}/${id}/apu-co-researchers`,
      payload,
      this.skipSuccessToastOptions(),
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
      this.skipSuccessToastOptions(),
    );
  }

  deleteCoResearcher(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/apu-co-researchers/${itemId}`,
      this.skipSuccessToastOptions(),
    );
  }

  // ── Collaborators ────────────────────────────────────────────────
  listCollaborators(id: number): Observable<ApiResponse<PaginatedData<RdigCollaboratorDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigCollaboratorDto>>>(
      `${this.base}/${id}/collaborators`,
    );
  }

  createCollaborator(
    id: number,
    payload: RdigCollaboratorDto,
  ): Observable<ApiResponse<RdigCollaboratorDto>> {
    return this.http.post<ApiResponse<RdigCollaboratorDto>>(
      `${this.base}/${id}/collaborators`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  updateCollaborator(
    id: number,
    itemId: number,
    payload: Partial<RdigCollaboratorDto>,
  ): Observable<ApiResponse<RdigCollaboratorDto>> {
    return this.http.put<ApiResponse<RdigCollaboratorDto>>(
      `${this.base}/${id}/collaborators/${itemId}`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  deleteCollaborator(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/collaborators/${itemId}`,
      this.skipSuccessToastOptions(),
    );
  }

  // ── ESG / SDG selections (bulk replace) ─────────────────────────
  listEsgSelections(id: number): Observable<ApiResponse<PaginatedData<RdigEsgSelectionDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigEsgSelectionDto>>>(
      `${this.base}/${id}/esg-selections`,
    );
  }

  replaceEsgSelections(id: number, esgIds: number[]): Observable<ApiResponse<RdigEsgSelectionDto[]>> {
    return this.http.put<ApiResponse<RdigEsgSelectionDto[]>>(
      `${this.base}/${id}/esg-selections`,
      { esg_ids: esgIds },
      this.skipSuccessToastOptions(),
    );
  }

  listSdgSelections(id: number): Observable<ApiResponse<PaginatedData<RdigSdgSelectionDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigSdgSelectionDto>>>(
      `${this.base}/${id}/sdg-selections`,
    );
  }

  replaceSdgSelections(id: number, sdgIds: number[]): Observable<ApiResponse<RdigSdgSelectionDto[]>> {
    return this.http.put<ApiResponse<RdigSdgSelectionDto[]>>(
      `${this.base}/${id}/sdg-selections`,
      { sdg_ids: sdgIds },
      this.skipSuccessToastOptions(),
    );
  }

  // ── Research Activities ─────────────────────────────────────────
  listResearchActivities(id: number): Observable<ApiResponse<PaginatedData<RdigResearchActivityDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigResearchActivityDto>>>(
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
      this.skipSuccessToastOptions(),
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
      this.skipSuccessToastOptions(),
    );
  }

  deleteResearchActivity(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/research-activities/${itemId}`,
      this.skipSuccessToastOptions(),
    );
  }

  // ── Budget Sections (auto-created on draft creation) ────────────
  listBudgetSections(id: number): Observable<ApiResponse<{ items: RdigBudgetSectionDto[] }>> {
    return this.http.get<ApiResponse<{ items: RdigBudgetSectionDto[] }>>(
      `${this.base}/${id}/budget-sections`,
    );
  }

  createBudgetSection(
    id: number,
    payload: RdigBudgetSectionDto,
  ): Observable<ApiResponse<RdigBudgetSectionDto>> {
    return this.http.post<ApiResponse<RdigBudgetSectionDto>>(
      `${this.base}/${id}/budget-sections`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  updateBudgetSection(
    id: number,
    sectionId: number,
    payload: Partial<RdigBudgetSectionDto>,
  ): Observable<ApiResponse<RdigBudgetSectionDto>> {
    return this.http.put<ApiResponse<RdigBudgetSectionDto>>(
      `${this.base}/${id}/budget-sections/${sectionId}`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  deleteBudgetSection(id: number, sectionId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/budget-sections/${sectionId}`,
      this.skipSuccessToastOptions(),
    );
  }

  // ── Budget Items ─────────────────────────────────────────────────
  listBudgetItems(id: number): Observable<ApiResponse<PaginatedData<RdigBudgetItemDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigBudgetItemDto>>>(
      `${this.base}/${id}/budget-items`,
    );
  }

  createBudgetItem(
    id: number,
    payload: RdigBudgetItemDto,
  ): Observable<ApiResponse<RdigBudgetItemDto>> {
    return this.http.post<ApiResponse<RdigBudgetItemDto>>(
      `${this.base}/${id}/budget-items`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  updateBudgetItem(
    id: number,
    itemId: number,
    payload: Partial<RdigBudgetItemDto>,
  ): Observable<ApiResponse<RdigBudgetItemDto>> {
    return this.http.put<ApiResponse<RdigBudgetItemDto>>(
      `${this.base}/${id}/budget-items/${itemId}`,
      payload,
      this.skipSuccessToastOptions(),
    );
  }

  deleteBudgetItem(id: number, itemId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/budget-items/${itemId}`,
      this.skipSuccessToastOptions(),
    );
  }

  // ── Attachments ──────────────────────────────────────────────────
  listAttachments(id: number): Observable<ApiResponse<PaginatedData<RdigAttachmentDto>>> {
    return this.http.get<ApiResponse<PaginatedData<RdigAttachmentDto>>>(
      `${this.base}/${id}/attachments`,
    );
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
    return this.http.post<ApiResponse<RdigAttachmentDto>>(
      `${this.base}/${id}/attachments`,
      formData,
      this.skipSuccessToastOptions(),
    );
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
    return this.http.delete<ApiResponse<unknown>>(
      `${this.base}/${id}/attachments/${attachmentId}`,
      this.skipSuccessToastOptions(),
    );
  }

  private skipSuccessToastOptions(): { context: HttpContext } {
    return {
      context: new HttpContext().set(SKIP_API_SUCCESS_TOAST, true),
    };
  }
}
