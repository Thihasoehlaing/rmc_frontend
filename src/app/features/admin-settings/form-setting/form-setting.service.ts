import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface FormSettingItem {
  id: number;
  form_code: string;
  form_name: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class FormSettingService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/forms`;

  listAll(): Observable<ApiResponse<FormSettingItem[]>> {
    const params = new HttpParams().set('include_inactive', true);
    return this.http.get<ApiResponse<FormSettingItem[]>>(this.endpoint, { params });
  }
}
