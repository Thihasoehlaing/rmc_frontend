import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface CachedFormOption {
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
export class FormCacheService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'rmc.forms.cache';
  private readonly apiUrl = `${environment.apiUrl.replace(/\/$/, '')}/rmc/forms`;

  getForms(forceRefresh = false): Observable<ApiResponse<CachedFormOption[]>> {
    if (!forceRefresh) {
      const cached = this.readCache();
      if (cached) {
        return of({
          success: true,
          message: 'Forms loaded from cache',
          data: cached,
        });
      }
    }

    return this.refresh();
  }

  refresh(): Observable<ApiResponse<CachedFormOption[]>> {
    return this.http
      .get<ApiResponse<CachedFormOption[]>>(this.apiUrl)
      .pipe(tap((response) => this.writeCache(response.data ?? [])));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  private readCache(): CachedFormOption[] | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedFormOption[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      this.clear();
      return null;
    }
  }

  private writeCache(forms: CachedFormOption[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(forms));
  }
}
