/**
 * batch-sitting.service.ts
 * Mock backend: json-server /batches endpoint.
 * Future integration: replace BASE_URL with environment.apiUrl + '/batches'.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { BatchSitting, WorkflowStageKey } from '../interfaces/batch-sitting.interface';

const BASE_URL = 'http://localhost:3000/batches';

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

  loadAll(): Observable<BatchSitting[]> {
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
    return this.http.post<BatchSitting>(BASE_URL, batch).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  /** Full replacement PUT. Future: switch to PATCH for partial updates. */
  update(batch: BatchSitting): Observable<BatchSitting> {
    return this.http.put<BatchSitting>(`${BASE_URL}/${batch.id}`, batch).pipe(
      tap(updated => {
        this.batchesSubject.next(this.getSnapshot().map(b => b.id === updated.id ? updated : b));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`).pipe(
      tap(() => {
        this.batchesSubject.next(this.getSnapshot().filter(b => b.id !== id));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  buildBlankBatch(createdBy: string, status: 'active' | 'planned' = 'active'): Omit<BatchSitting, 'id'> {
    const now = new Date().toISOString();
    return { batchName: '', status, startDate: '', endDate: '', stages: emptyStages(), createdAt: now, updatedAt: now, createdBy };
  }
}
