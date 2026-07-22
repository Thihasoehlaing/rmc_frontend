import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ResearchClusterOption {
  id: number;
  cluster_name: string;
  is_active: boolean;
}

export interface ResearchDomainOption {
  id: number;
  domain_name: string;
  is_active: boolean;
}

export interface SubResearchDomainOption {
  id: number;
  research_domain_id: number;
  sub_domain_name: string;
  is_active: boolean;
}

export interface EsgOption {
  id: number;
  esg_code: string;
  esg_name: string;
  is_active: boolean;
}

export interface SdgOption {
  id: number;
  sdg_code: string;
  sdg_name: string;
  is_active: boolean;
}

export interface RegionOption {
  id: number;
  region_name: string;
  percentage: string;
  limit_amount: string;
  description: string;
  is_active: boolean;
}

export interface AcademicStaffOption {
  id: number;
  username: string;
  fullname: string;
  email: string;
  department: string;
}

export interface DepartmentOption {
  id: number;
  department_name: string;
  department_type: string;
  is_active: boolean;
}

export interface CodeOption {
  id: number;
  code: string;
  description: string;
}

export interface AccountCodeOption extends CodeOption {
  location_type: 'LOCAL' | 'FOREIGN';
  category_name: string;
}

export interface DropdownOptionRecord {
  id: number;
  dropdown_category_id: number;
  category_code: string;
  option_name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Read-only master/lookup data shared by the Conference and RDIG application forms. */
@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly base = this.apiUrl;

  getResearchClusters(): Observable<ApiResponse<ResearchClusterOption[]>> {
    return this.http.get<ApiResponse<ResearchClusterOption[]>>(
      `${this.base}/master-data/research-clusters`,
    );
  }

  getResearchDomains(): Observable<ApiResponse<ResearchDomainOption[]>> {
    return this.http.get<ApiResponse<ResearchDomainOption[]>>(
      `${this.base}/master-data/research-domains`,
    );
  }

  getSubResearchDomains(domainId: number): Observable<ApiResponse<SubResearchDomainOption[]>> {
    return this.http.get<ApiResponse<SubResearchDomainOption[]>>(
      `${this.base}/master-data/research-domains/${domainId}/sub-domains`,
    );
  }

  getEsgs(): Observable<ApiResponse<EsgOption[]>> {
    return this.http.get<ApiResponse<EsgOption[]>>(`${this.base}/master-data/esgs`);
  }

  getSdgs(): Observable<ApiResponse<SdgOption[]>> {
    return this.http.get<ApiResponse<SdgOption[]>>(`${this.base}/master-data/sdgs`);
  }

  getRegions(): Observable<ApiResponse<RegionOption[]>> {
    return this.http.get<ApiResponse<RegionOption[]>>(`${this.base}/master-data/regions`);
  }

  getVoteNumbers(formCode?: string): Observable<ApiResponse<CodeOption[]>> {
    return this.http.get<ApiResponse<CodeOption[]>>(`${this.base}/master-data/vote-numbers`, {
      params: this.toFormCodeParams(formCode),
    });
  }

  getProjectAccountCodes(formCode?: string): Observable<ApiResponse<CodeOption[]>> {
    return this.http.get<ApiResponse<CodeOption[]>>(
      `${this.base}/master-data/project-account-codes`,
      { params: this.toFormCodeParams(formCode) },
    );
  }

  getAccountCodes(formCode?: string): Observable<ApiResponse<AccountCodeOption[]>> {
    return this.http.get<ApiResponse<AccountCodeOption[]>>(
      `${this.base}/master-data/account-codes`,
      { params: this.toFormCodeParams(formCode) },
    );
  }

  searchAcademicStaff(search?: string): Observable<ApiResponse<AcademicStaffOption[]>> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<AcademicStaffOption[]>>(`${this.base}/academic-staff`, {
      params,
    });
  }

  getDepartments(includeInactive = false): Observable<ApiResponse<DepartmentOption[]>> {
    const params = new HttpParams().set('include_inactive', includeInactive ? 'true' : 'false');
    return this.http.get<ApiResponse<DepartmentOption[]>>(`${this.base}/master-data/departments`, {
      params,
    });
  }

  getDropdownOptions(
    categoryCode: string,
    formCode?: string,
  ): Observable<ApiResponse<DropdownOptionRecord[]>> {
    return this.http.get<ApiResponse<DropdownOptionRecord[]>>(
      `${this.base}/dropdowns/${categoryCode}/options`,
      { params: this.toFormCodeParams(formCode) },
    );
  }

  private toFormCodeParams(formCode?: string): HttpParams {
    let params = new HttpParams();
    if (formCode?.trim()) {
      params = params.set('form_code', formCode.trim().toUpperCase());
    }
    return params;
  }
}
