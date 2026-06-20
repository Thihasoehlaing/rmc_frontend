/**
 * batch-sitting.service.ts
 * Mock backend: json-server /batches endpoint.
 * Future integration: replace BASE_URL with environment.apiUrl + '/batches'.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, switchMap, of, tap, catchError, throwError } from 'rxjs';
import { BatchSitting, WorkflowStageKey } from '../../core/interfaces/batch-sitting.interface';

const BASE_URL = 'http://localhost:3000/batches';
const LOCAL_KEY = 'rmc_batches';
const USE_LOCAL_STORAGE = true;

function emptyStages(): Record<WorkflowStageKey, { startDate: null; endDate: null }> {
  const keys: WorkflowStageKey[] = [
    'hos_first_review', 'applicant_resubmission', 'hos_review_again',
    'rmc', 'reviewers', 'rmc_again', 'rdig_chair', 'vc', 'ceo',
  ];
  return Object.fromEntries(keys.map(k => [k, { startDate: null, endDate: null }])) as Record<WorkflowStageKey, { startDate: null; endDate: null }>;
}

@Injectable({ providedIn: 'root' })
export class BatchSittingService {
  private readonly http = inject(HttpClient);
  private batchesSubject = new BehaviorSubject<BatchSitting[]>([]);
  readonly batches$ = this.batchesSubject.asObservable();

  private getLocalList(): BatchSitting[] {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) as BatchSitting[] : [];
  }

  private saveLocalList(list: BatchSitting[]): void {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }

  loadAll(): Observable<BatchSitting[]> {
    if (USE_LOCAL_STORAGE) {
      const batches = this.getLocalList();
      this.batchesSubject.next(batches);
      return of(batches);
    }

    return this.http.get<BatchSitting[]>(BASE_URL).pipe(
      tap(batches => this.batchesSubject.next(batches)),
      catchError(err => {
        console.error('[BatchSittingService] Failed to load batches', err);
        return throwError(() => err);
      }),
    );
  }

  getSnapshot(): BatchSitting[] { return this.batchesSubject.getValue(); }

  /** Returns the currently active batch, or null if none exists. */
  getActiveBatch(): BatchSitting | null {
    return this.batchesSubject.getValue().find(b => b.status === 'active') ?? null;
  }

  create(batch: Omit<BatchSitting, 'id'>): Observable<BatchSitting> {
    if (USE_LOCAL_STORAGE) {
      const list = this.getLocalList();
      const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const created = { ...batch, id: nextId } as BatchSitting;
      const updated = [...list, created];
      this.saveLocalList(updated);
      this.batchesSubject.next(updated);
      return of(created);
    }

    return this.http.post<BatchSitting>(BASE_URL, batch).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  /** Full replacement PUT. Future: switch to PATCH for partial updates. */
  update(batch: BatchSitting): Observable<BatchSitting> {
    if (USE_LOCAL_STORAGE) {
      const updated = this.getLocalList().map(item => item.id === batch.id ? batch : item);
      this.saveLocalList(updated);
      this.batchesSubject.next(updated);
      return of(batch);
    }

    return this.http.put<BatchSitting>(`${BASE_URL}/${batch.id}`, batch).pipe(
      tap(updated => {
        this.batchesSubject.next(this.getSnapshot().map(b => b.id === updated.id ? updated : b));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  delete(id: number): Observable<void> {
    if (USE_LOCAL_STORAGE) {
      const updated = this.getLocalList().filter(item => item.id !== id);
      this.saveLocalList(updated);
      this.batchesSubject.next(updated);
      return of(void 0);
    }

    return this.http.delete<void>(`${BASE_URL}/${id}`).pipe(
      tap(() => {
        this.batchesSubject.next(this.getSnapshot().filter(b => b.id !== id));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  buildBlankBatch(createdBy: string, status: 'active' | 'planned' = 'active'): Omit<BatchSitting, 'id'> {
    const now = new Date().toISOString();
    return { batchName: '', status, startDate: '', endDate: '', stages: emptyStages(), createdAt: now, updatedAt: now, createdBy, applicationIds: [] };
  }

  /**
   * Appends an application ID to the batch's applicationIds array.
   * Called client-side when an applicant formally submits for the first time.
   */
  addApplicationId(batchId: number, appId: number): Observable<BatchSitting> {
    if (USE_LOCAL_STORAGE) {
      const list = this.getLocalList();
      const batch = list.find(item => item.id === batchId);
      if (!batch) {
        return throwError(() => new Error('Batch not found'));
      }

      const existing = Array.isArray(batch.applicationIds) ? batch.applicationIds : [];
      if (existing.includes(appId)) {
        return of(batch);
      }

      const updatedBatch: BatchSitting = { ...batch, applicationIds: [...existing, appId] };
      const updatedList = list.map(item => item.id === batchId ? updatedBatch : item);
      this.saveLocalList(updatedList);
      this.batchesSubject.next(updatedList);
      return of(updatedBatch);
    }

    return this.http.get<BatchSitting>(`${BASE_URL}/${batchId}`).pipe(
      switchMap(batch => {
        const existing = Array.isArray(batch.applicationIds) ? batch.applicationIds : [];
        if (existing.includes(appId)) return of(batch);
        return this.http.put<BatchSitting>(`${BASE_URL}/${batchId}`, { ...batch, applicationIds: [...existing, appId] });
      }),
      catchError(err => throwError(() => err)),
    );
  }
}
