import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';

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

interface FormCacheEntry {
  cachedAt: number;
  forms: CachedFormOption[];
}

@Injectable({ providedIn: 'root' })
export class FormCacheService {
  private readonly http = inject(HttpClient);
  private readonly legacyStorageKey = 'rmc.forms.cache';
  private readonly storageKey = 'rmc.forms.cache.v2';
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly apiUrl = `${environment.apiUrl}/forms?include_inactive=true`;
  private readonly formsSignal = signal<CachedFormOption[]>(this.readCache({ allowStale: true })?.forms ?? []);

  readonly forms = this.formsSignal.asReadonly();
  readonly activeFormCodes = computed(
    () =>
      new Set(
        this.formsSignal()
          .filter((form) => form.is_active !== false)
          .map((form) => form.form_code.toUpperCase()),
      ),
  );

  getForms(forceRefresh = false): Observable<ApiResponse<CachedFormOption[]>> {
    if (!forceRefresh) {
      const cached = this.readCache();
      if (cached) {
        this.formsSignal.set(cached.forms);
        return of({
          success: true,
          message: 'Forms loaded from cache',
          data: cached.forms,
        });
      }
    }

    return this.refresh();
  }

  getActiveForms(forceRefresh = false): Observable<ApiResponse<CachedFormOption[]>> {
    return this.getForms(forceRefresh).pipe(
      map((response) => ({
        ...response,
        data: (response.data ?? []).filter((form) => form.is_active !== false),
      })),
    );
  }

  refresh(): Observable<ApiResponse<CachedFormOption[]>> {
    return this.http
      .get<ApiResponse<CachedFormOption[]>>(this.apiUrl)
      .pipe(tap((response) => this.writeCache(response.data ?? [])));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.legacyStorageKey);
    this.formsSignal.set([]);
  }

  private readCache(options: { allowStale?: boolean } = {}): FormCacheEntry | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedFormOption[] | FormCacheEntry;
      if (Array.isArray(parsed)) {
        return options.allowStale && parsed.length ? { cachedAt: 0, forms: parsed } : null;
      }

      if (!parsed || !Array.isArray(parsed.forms) || !Number.isFinite(parsed.cachedAt)) {
        return null;
      }

      const isFresh = Date.now() - parsed.cachedAt < this.cacheTtlMs;
      return options.allowStale || isFresh ? parsed : null;
    } catch {
      this.clear();
      return null;
    }
  }

  private writeCache(forms: CachedFormOption[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify({ cachedAt: Date.now(), forms }));
    this.formsSignal.set(forms);
  }
}
