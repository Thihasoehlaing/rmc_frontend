import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CorrectionRequestSummary {
  id: number;
  request_id: number;
  request_code: string;
  form_code: 'CONFERENCE' | 'JOURNAL';
  form_name: string;
  status_code: string;
  applicant_staff_username: string;
  applicant_name: string;
  applicant_email: string;
  applicant_department: string | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApuStaffCoAuthorCorrectionRow {
  id: number;
  staff_name: string | null;
  staff_department: string | null;
  affiliation: string | null;
  display_order: number | null;
}

export interface FormCorrectionLookupData {
  request: CorrectionRequestSummary;
  correction_type: 'apu_staff_co_authors';
  apu_staff_co_authors: ApuStaffCoAuthorCorrectionRow[];
}

export interface ApuStaffCoAuthorCorrectionPayload {
  staff_name: string;
  staff_department: string | null;
  affiliation: string | null;
  display_order?: number | null;
  correction_reason: string;
}

@Injectable({ providedIn: 'root' })
export class FormCorrectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings/form-corrections`;

  lookup(requestCode: string): Observable<ApiResponse<FormCorrectionLookupData>> {
    const params = new HttpParams().set('request_code', requestCode.trim());
    return this.http.get<ApiResponse<FormCorrectionLookupData>>(`${this.baseUrl}/lookup`, {
      params,
    });
  }

  createApuStaffCoAuthor(
    requestId: number,
    payload: ApuStaffCoAuthorCorrectionPayload,
  ): Observable<ApiResponse<FormCorrectionLookupData>> {
    return this.http.post<ApiResponse<FormCorrectionLookupData>>(
      `${this.baseUrl}/${requestId}/apu-staff-co-authors`,
      payload,
    );
  }

  updateApuStaffCoAuthor(
    requestId: number,
    itemId: number,
    payload: ApuStaffCoAuthorCorrectionPayload,
  ): Observable<ApiResponse<FormCorrectionLookupData>> {
    return this.http.put<ApiResponse<FormCorrectionLookupData>>(
      `${this.baseUrl}/${requestId}/apu-staff-co-authors/${itemId}`,
      payload,
    );
  }

  deleteApuStaffCoAuthor(
    requestId: number,
    itemId: number,
    correctionReason: string,
  ): Observable<ApiResponse<FormCorrectionLookupData>> {
    return this.http.delete<ApiResponse<FormCorrectionLookupData>>(
      `${this.baseUrl}/${requestId}/apu-staff-co-authors/${itemId}`,
      { body: { correction_reason: correctionReason } },
    );
  }
}
