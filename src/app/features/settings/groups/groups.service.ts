import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface GroupMember {
  user_id: number;
  staff_id: number | null;
  username: string;
  fullname: string;
  email: string;
}

export interface Group {
  id: number;
  group_code: string;
  group_name: string;
  user_count: number;
  code_locked: boolean;
  can_delete: boolean;
  restriction_reason: string | null;
  members?: GroupMember[];
}

export interface GroupPayload {
  staff_ids: number[];
  group_code: string;
  group_name: string;
}

interface GroupListData {
  items: Group[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings/groups`;

  list(params: {
    page: number;
    perPage: number;
    search?: string;
  }): Observable<ApiResponse<GroupListData>> {
    let httpParams = new HttpParams().set('page', params.page).set('per_page', params.perPage);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<ApiResponse<GroupListData>>(this.baseUrl, {
      params: httpParams,
    });
  }

  get(id: number): Observable<ApiResponse<Group>> {
    return this.http.get<ApiResponse<Group>>(`${this.baseUrl}/${id}`);
  }

  create(payload: GroupPayload): Observable<ApiResponse<Group>> {
    return this.http.post<ApiResponse<Group>>(this.baseUrl, payload);
  }

  update(id: number, payload: GroupPayload): Observable<ApiResponse<Group>> {
    return this.http.put<ApiResponse<Group>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<Group>> {
    return this.http.delete<ApiResponse<Group>>(`${this.baseUrl}/${id}`);
  }
}
