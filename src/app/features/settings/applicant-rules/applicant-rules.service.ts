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

export interface ApplicantRule {
  id: number;
  form_id: number;
  form_code: string | null;
  form_name: string | null;
  rule_type: string;
  rule_value: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApplicantRulePayload {
  form_code: string;
  rule_type: string;
  rule_value: string;
  description: string | null;
  is_active: boolean;
}

export interface FormOption {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
}

export interface DepartmentOption {
  id: number;
  department_name: string;
  department_type: string;
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

export interface ApplicantRuleListParams {
  page: number;
  perPage: number;
  ruleValue?: string;
  formCode?: string | null;
  ruleType?: string;
  status?: '' | 'Active' | 'Inactive';
}

interface PaginatedData<T> {
  items: T[];
  pagination: ApiPagination;
}

@Injectable({ providedIn: 'root' })
export class ApplicantRulesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/settings/applicant-rules`;
  private readonly formsUrl = `${this.apiUrl}/forms`;
  private readonly departmentsUrl = `${this.apiUrl}/master-data/departments`;
  private readonly staffUrl = `${this.apiUrl}/master-data/staff`;

  list(params: ApplicantRuleListParams): Observable<ApiResponse<PaginatedData<ApplicantRule>>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('per_page', params.perPage);

    if (params.ruleValue?.trim()) {
      httpParams = httpParams.set('rule_value', params.ruleValue.trim());
    }
    if (params.formCode) {
      httpParams = httpParams.set('form_code', params.formCode);
    }
    if (params.ruleType?.trim()) {
      httpParams = httpParams.set('rule_type', params.ruleType.trim());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<PaginatedData<ApplicantRule>>>(this.baseUrl, {
      params: httpParams,
    });
  }

  get(id: number): Observable<ApiResponse<ApplicantRule>> {
    return this.http.get<ApiResponse<ApplicantRule>>(`${this.baseUrl}/${id}`);
  }

  create(payload: ApplicantRulePayload): Observable<ApiResponse<ApplicantRule>> {
    return this.http.post<ApiResponse<ApplicantRule>>(this.baseUrl, payload);
  }

  update(id: number, payload: ApplicantRulePayload): Observable<ApiResponse<ApplicantRule>> {
    return this.http.put<ApiResponse<ApplicantRule>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<ApplicantRule>> {
    return this.http.delete<ApiResponse<ApplicantRule>>(`${this.baseUrl}/${id}`);
  }

  listForms(): Observable<ApiResponse<FormOption[]>> {
    return this.http.get<ApiResponse<FormOption[]>>(this.formsUrl);
  }

  listDepartments(): Observable<ApiResponse<DepartmentOption[]>> {
    return this.http.get<ApiResponse<DepartmentOption[]>>(this.departmentsUrl);
  }

  listStaffOptions(): Observable<ApiResponse<StaffOption[]>> {
    return this.http.get<ApiResponse<StaffOption[]>>(this.staffUrl);
  }
}
