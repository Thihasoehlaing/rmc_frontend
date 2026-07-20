/**
 * batch-sitting.service.ts
 *
 * Wraps the real backend (/<prefix>/admin-settings/batches) behind the same public
 * API the component already expects (loadAll/create/update/delete returning
 * BatchSitting[]/BatchSitting), so batch-sitting.component.ts needed no changes.
 *
 * Backend shape differs from the frontend model in three ways this file bridges:
 *  1. GET /batches returns {active_batch, planned_batches, completed_batches}
 *     (grouped) — loadAll() flattens this into a single array, since the
 *     component does its own grouping via hydrate().
 *  2. Stage windows are keyed by a human-readable stage_name string on the
 *     backend (e.g. "HOS First Review"), not the machine key used in
 *     WORKFLOW_STAGE_META (e.g. 'hos_first_review'). Every RDIG_DEFAULT_STAGES
 *     label matches a WORKFLOW_STAGE_META label exactly, so the two are mapped
 *     via that shared label.
 *  3. There is no single "create/update batch with status" endpoint — creating
 *     an active vs. planned batch are two different POST routes, and status
 *     transitions (complete/activate) are their own POST routes separate from
 *     the general field-editing PUT. update() detects which is being requested
 *     by comparing the incoming status against the cached previous status.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BatchSitting,
  BatchStatus,
  WORKFLOW_STAGE_META,
  WorkflowStageKey,
  WorkflowStageWindow,
} from '../../core/interfaces/batch-sitting.interface';

const BASE_URL = `${environment.apiBaseUrl}/admin-settings/batches`;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiStageWindow {
  id: number;
  stage_name: string;
  stage_start_date: string | null;
  stage_end_date: string | null;
}

interface ApiBatch {
  id: number;
  batch_name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  submission_count: number;
  stage_windows: ApiStageWindow[];
}

interface ApiBatchListData {
  active_batch: ApiBatch | null;
  planned_batches: ApiBatch[];
  completed_batches: ApiBatch[];
}

const STAGE_LABEL_TO_KEY: Record<string, WorkflowStageKey> = Object.fromEntries(
  WORKFLOW_STAGE_META.map((m) => [m.label, m.key]),
);

function emptyStages(): Record<WorkflowStageKey, WorkflowStageWindow> {
  const keys: WorkflowStageKey[] = WORKFLOW_STAGE_META.map((m) => m.key);
  return Object.fromEntries(keys.map((k) => [k, { startDate: null, endDate: null }])) as Record<
    WorkflowStageKey,
    WorkflowStageWindow
  >;
}

@Injectable({ providedIn: 'root' })
export class BatchSittingService {
  private readonly http = inject(HttpClient);
  private batchesSubject = new BehaviorSubject<BatchSitting[]>([]);
  readonly batches$ = this.batchesSubject.asObservable();

  // ── Backend <-> frontend model translation ────────────────────────────────

  /**
   * <input type="datetime-local"> works in "YYYY-MM-DDTHH:mm" (no seconds),
   * while the backend returns/expects full ISO datetimes with seconds — these
   * two convert between the two at the service boundary so nothing above
   * this file needs to think about it.
   */
  private fromApiDateTime(value: string | null): string | null {
    if (!value) return null;
    return value.length > 16 ? value.substring(0, 16) : value;
  }

  private toApiDateTime(value: string | null | undefined): string | null {
    if (!value) return null;
    return value.length === 16 ? `${value}:00` : value;
  }

  private toBatchSitting(api: ApiBatch): BatchSitting {
    const stages = emptyStages();
    for (const sw of api.stage_windows ?? []) {
      const key = STAGE_LABEL_TO_KEY[sw.stage_name];
      if (key) {
        stages[key] = {
          startDate: this.fromApiDateTime(sw.stage_start_date),
          endDate: this.fromApiDateTime(sw.stage_end_date),
        };
      }
    }

    // The backend compares status case-insensitively everywhere
    // (func.lower(Batch.status) == "active", etc.) and the DB has inconsistent
    // casing as a result (some rows "ACTIVE", others "planned"). The component
    // does a strict === 'active' check, so normalize here or active batches
    // silently vanish from every bucket (not active, not planned, not history).
    const status = (api.status ?? 'planned').toLowerCase() as BatchStatus;

    return {
      id: api.id,
      batchName: api.batch_name,
      status,
      startDate: this.fromApiDateTime(api.start_date) ?? '',
      endDate: this.fromApiDateTime(api.end_date) ?? '',
      stages,
      createdAt: api.created_at ?? '',
      updatedAt: api.updated_at ?? '',
      createdBy: api.created_by ?? '',
      // No dedicated ended_at field on the backend — updated_at is stamped the
      // same moment a batch is completed, so it's a faithful stand-in for the
      // history-sort ordering the component uses this field for.
      endedAt: status === 'completed' ? (api.updated_at ?? undefined) : undefined,
      // submission_count is a number server-side (no per-application IDs are
      // exposed here); the component only ever reads applicationIds.length,
      // so a placeholder array of the right length keeps that working.
      applicationIds: Array.from({ length: api.submission_count ?? 0 }, (_, i) => i),
    };
  }

  private toStageWindowsPayload(stages: Record<WorkflowStageKey, WorkflowStageWindow>) {
    return WORKFLOW_STAGE_META.map((m) => ({
      stage_name: m.label,
      stage_start_date: this.toApiDateTime(stages[m.key]?.startDate),
      stage_end_date: this.toApiDateTime(stages[m.key]?.endDate),
    }));
  }

  private toFieldsPayload(batch: Pick<BatchSitting, 'batchName' | 'startDate' | 'endDate' | 'stages'>) {
    return {
      batch_name: batch.batchName,
      start_date: this.toApiDateTime(batch.startDate),
      end_date: this.toApiDateTime(batch.endDate),
      stage_windows: this.toStageWindowsPayload(batch.stages),
    };
  }

  private updateCache(updated: BatchSitting): void {
    const list = this.batchesSubject.getValue();
    const exists = list.some((b) => b.id === updated.id);
    const next = exists
      ? list.map((b) => (b.id === updated.id ? updated : b))
      : [...list, updated];
    this.batchesSubject.next(next);
  }

  // ── Public API (unchanged surface for batch-sitting.component.ts) ────────

  loadAll(): Observable<BatchSitting[]> {
    return this.http.get<ApiResponse<ApiBatchListData>>(BASE_URL).pipe(
      map((res) => {
        const { active_batch, planned_batches, completed_batches } = res.data;
        const all = [
          ...(active_batch ? [active_batch] : []),
          ...(planned_batches ?? []),
          ...(completed_batches ?? []),
        ];
        return all.map((api) => this.toBatchSitting(api));
      }),
      tap((batches) => this.batchesSubject.next(batches)),
      catchError((err) => {
        console.error('[BatchSittingService] Failed to load batches', err);
        return throwError(() => err);
      }),
    );
  }

  getSnapshot(): BatchSitting[] {
    return this.batchesSubject.getValue();
  }

  /** Returns the currently active batch, or null if none exists. */
  getActiveBatch(): BatchSitting | null {
    return this.batchesSubject.getValue().find((b) => b.status === 'active') ?? null;
  }

  /** Creating an active vs. planned batch are two distinct backend routes. */
  create(batch: Omit<BatchSitting, 'id'>): Observable<BatchSitting> {
    const url = batch.status === 'active' ? `${BASE_URL}/active` : `${BASE_URL}/planned`;
    return this.http.post<ApiResponse<ApiBatch>>(url, this.toFieldsPayload(batch)).pipe(
      map((res) => this.toBatchSitting(res.data)),
      tap((created) => this.updateCache(created)),
      catchError((err) => throwError(() => err)),
    );
  }

  /**
   * A single PUT handles plain field edits (name/dates/stages). Status
   * transitions go through their own endpoints (/complete, /activate) —
   * detected here by comparing the incoming status against the cached
   * previous status, since every call site in the component only ever
   * changes status OR fields, never both at once.
   */
  update(batch: BatchSitting): Observable<BatchSitting> {
    const previousStatus = this.batchesSubject.getValue().find((b) => b.id === batch.id)?.status;

    if (previousStatus && previousStatus !== batch.status) {
      if (batch.status === 'completed') {
        return this.http.post<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}/complete`, {}).pipe(
          map((res) => this.toBatchSitting(res.data)),
          tap((updated) => this.updateCache(updated)),
          catchError((err) => throwError(() => err)),
        );
      }
      if (batch.status === 'active') {
        return this.http.post<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}/activate`, {}).pipe(
          map((res) => this.toBatchSitting(res.data)),
          tap((updated) => this.updateCache(updated)),
          catchError((err) => throwError(() => err)),
        );
      }
    }

    return this.http
      .put<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}`, this.toFieldsPayload(batch))
      .pipe(
        map((res) => this.toBatchSitting(res.data)),
        tap((updated) => this.updateCache(updated)),
        catchError((err) => throwError(() => err)),
      );
  }

  /**
   * Starting a planned batch, or retrieving a completed one, is a field update
   * (start_date -> today) followed by the dedicated activate route, since
   * /activate never touches dates and the general PUT never touches status.
   */
  activateNow(batch: BatchSitting): Observable<BatchSitting> {
    return this.http
      .put<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}`, this.toFieldsPayload(batch))
      .pipe(
        switchMap(() =>
          this.http.post<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}/activate`, {}),
        ),
        map((res) => this.toBatchSitting(res.data)),
        tap((updated) => this.updateCache(updated)),
        catchError((err) => throwError(() => err)),
      );
  }

  /**
   * Moving an active batch back to "planned" (its start date was edited into
   * the future) is a field update followed by the dedicated /plan route,
   * mirroring activateNow() — the plain PUT can't change status, and /plan
   * never touches dates.
   */
  planNow(batch: BatchSitting): Observable<BatchSitting> {
    return this.http
      .put<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}`, this.toFieldsPayload(batch))
      .pipe(
        switchMap(() => this.http.post<ApiResponse<ApiBatch>>(`${BASE_URL}/${batch.id}/plan`, {})),
        map((res) => this.toBatchSitting(res.data)),
        tap((updated) => this.updateCache(updated)),
        catchError((err) => throwError(() => err)),
      );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<ApiBatch>>(`${BASE_URL}/${id}`).pipe(
      map(() => void 0),
      tap(() => {
        this.batchesSubject.next(this.batchesSubject.getValue().filter((b) => b.id !== id));
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  buildBlankBatch(createdBy: string, status: 'active' | 'planned' = 'active'): Omit<BatchSitting, 'id'> {
    const now = new Date().toISOString();
    return {
      batchName: '',
      status,
      startDate: '',
      endDate: '',
      stages: emptyStages(),
      createdAt: now,
      updatedAt: now,
      createdBy,
      applicationIds: [],
    };
  }

  /**
   * No backend endpoint exists for manually attaching an application ID to a
   * batch (submission_count is derived server-side from each request's own
   * batch_id foreign key) — nothing in the live component calls this, so it
   * remains a local-cache-only mutation for API-surface compatibility.
   */
  addApplicationId(batchId: number, appId: number): Observable<BatchSitting> {
    const list = this.batchesSubject.getValue();
    const batch = list.find((item) => item.id === batchId);
    if (!batch) {
      return throwError(() => new Error('Batch not found'));
    }

    const existing = Array.isArray(batch.applicationIds) ? batch.applicationIds : [];
    if (existing.includes(appId)) {
      return of(batch);
    }

    const updatedBatch: BatchSitting = { ...batch, applicationIds: [...existing, appId] };
    this.updateCache(updatedBatch);
    return of(updatedBatch);
  }
}
