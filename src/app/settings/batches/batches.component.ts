import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule,
  ValidationErrors, Validators,
} from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';

import { BatchSittingService } from '../batch-sitting.service';
import {
  BatchSitting, WORKFLOW_STAGE_META, WorkflowStageKey,
} from '../../interfaces/batch-sitting.interface';
import { AuthService } from '../../services/auth.service';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { ValidationMessageComponent } from '../../shared/components/validation-message/validation-message.component';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';

// ── Validators ────────────────────────────────────────────────────────────────

function endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const s = group.get('startDate')?.value as string | null;
  const e = group.get('endDate')?.value as string | null;
  if (!s || !e) return null;
  return e >= s ? null : { endBeforeStart: true };
}

function stageWithinBatchValidator(startFn: () => string, endFn: () => string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const ss = group.get('startDate')?.value as string | null;
    const se = group.get('endDate')?.value as string | null;
    const ps = startFn();
    const pe = endFn();
    const err: ValidationErrors = {};
    if (ss && se && se < ss) err['endBeforeStart'] = true;
    if (ss && ps && ss < ps) err['startBeforeBatch'] = true;
    if (se && pe && se > pe) err['endAfterBatch'] = true;
    return Object.keys(err).length ? err : null;
  };
}

@Component({
  selector: 'app-batches',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ActionButtonComponent, ValidationMessageComponent, DialogComponent],
  templateUrl: './batches.component.html',
  styleUrl: './batches.component.scss',
})
export class BatchesComponent implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(BatchSittingService);
  private readonly auth     = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly stageMeta = WORKFLOW_STAGE_META;
  readonly today     = new Date().toISOString().substring(0, 10);

  // ── Data signals ──────────────────────────────────────────────────────────
  activeBatch    = signal<BatchSitting | null>(null);
  plannedBatches = signal<BatchSitting[]>([]);
  historyBatches = signal<BatchSitting[]>([]);

  // ── UI signals ────────────────────────────────────────────────────────────
  isLoading          = signal(true);
  isSaving           = signal(false);
  isEditingActive    = signal(false);
  editingPlannedId   = signal<number | null>(null);
  isAddingPlanned    = signal(false);
  showEndConfirm     = signal(false);
  viewingBatch       = signal<BatchSitting | null>(null);
  feedback           = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────────────
  activeForm!:  FormGroup;
  plannedForm!: FormGroup;

  ngOnInit() {
    this.initForms();
    this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms() {
    this.activeForm = this.fb.group({
      batchName: ['', [Validators.required, Validators.minLength(3)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    }, { validators: endAfterStartValidator });

    this.plannedForm = this.fb.group({
      batchName: ['', [Validators.required, Validators.minLength(3)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    }, { validators: endAfterStartValidator });
  }

  private load() {
    this.isLoading.set(true);
    this.svc.loadAll()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (batches: BatchSitting[]) => {
          const active = batches.find((b: BatchSitting) => b.status === 'active');
          const planned = batches.filter((b: BatchSitting) => b.status === 'planned').sort((a: BatchSitting, b: BatchSitting) => a.startDate.localeCompare(b.startDate));
          const history = batches.filter((b: BatchSitting) => b.status === 'completed').sort((a: BatchSitting, b: BatchSitting) => (b.endedAt?.localeCompare(a.endedAt!) ?? 0));

          this.activeBatch.set(active ?? null);
          this.plannedBatches.set(planned);
          this.historyBatches.set(history);

          if (active) {
            this.populateActiveForm(active);
          }
        },
        error: () => this.setFeedback('error', 'Failed to load batches'),
      });
  }

  private populateActiveForm(batch: BatchSitting) {
    this.activeForm.patchValue({
      batchName: batch.batchName,
      startDate: batch.startDate,
      endDate: batch.endDate,
    });
  }

  startEditActive() {
    this.isEditingActive.set(true);
    this.activeForm.enable();
  }

  saveActiveForm() {
    if (!this.activeForm.valid) {
      this.activeForm.markAllAsTouched();
      this.setFeedback('error', 'Please fix validation errors before saving. Batch Name must be at least 3 characters.');
      return;
    }

    this.isSaving.set(true);
    const payload = this.activeForm.value;
    const isFutureStart = typeof payload.startDate === 'string' && payload.startDate > this.currentDateIso();

    const obs$ = this.activeBatch()
      ? this.svc.update({ ...this.activeBatch()!, ...payload })
      : this.svc.create({
        ...this.svc.buildBlankBatch(this.auth.currentUser()?.email || 'system', isFutureStart ? 'planned' : 'active'),
        ...payload,
        status: isFutureStart ? 'planned' : 'active',
      } as any);

    obs$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (batch: BatchSitting) => {
          if (isFutureStart && !this.activeBatch()) {
            this.plannedBatches.update((list: BatchSitting[]) =>
              [...list, batch].sort((a: BatchSitting, b: BatchSitting) => a.startDate.localeCompare(b.startDate))
            );
          } else {
            this.activeBatch.set(batch);
          }
          this.isEditingActive.set(false);
          this.setFeedback('success', isFutureStart
            ? 'Start date is in the future. Batch was added to Upcoming Batches.'
            : 'Batch saved successfully');
        },
        error: (err) => this.handleError(err, 'Failed to save batch'),
      });
  }

  cancelEditActive() {
    this.isEditingActive.set(false);
    if (this.activeBatch()) {
      this.populateActiveForm(this.activeBatch()!);
    } else {
      this.activeForm.reset();
    }
  }

  openEndConfirm() {
    this.showEndConfirm.set(true);
  }

  confirmEndBatch() {
    if (!this.activeBatch()) return;

    this.isSaving.set(true);
    const batch = this.activeBatch()!;
    const endedBatch: BatchSitting = {
      ...batch,
      status: 'completed',
      endedAt: new Date().toISOString(),
    };

    this.svc.update(endedBatch)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.showEndConfirm.set(false);
          this.load();
          this.setFeedback('success', 'Batch ended successfully');
        },
        error: () => this.setFeedback('error', 'Failed to end batch'),
      });
  }

  endBatchTooltip(): string {
    return this.activeBatch() ? 'End the current batch (cannot be undone)' : '';
  }

  startAddPlanned() {
    this.isAddingPlanned.set(true);
    this.plannedForm.reset();
    this.plannedForm.enable();
  }

  savePlannedForm() {
    if (!this.plannedForm.valid) {
      this.plannedForm.markAllAsTouched();
      this.setFeedback('error', 'Please fix validation errors before saving. Batch Name must be at least 3 characters.');
      return;
    }

    this.isSaving.set(true);
    const payload = this.plannedForm.value;
    this.svc.create({ ...this.svc.buildBlankBatch(this.auth.currentUser()?.email || 'system', 'planned'), ...payload, status: 'planned' } as any)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.plannedForm.reset();
          this.isAddingPlanned.set(false);
          this.load();
          this.setFeedback('success', 'Planned batch created');
        },
        error: (err) => this.handleError(err, 'Failed to create planned batch'),
      });
  }

  cancelAddPlanned() {
    this.isAddingPlanned.set(false);
    this.plannedForm.reset();
  }

  deletePlanned(id: number) {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    this.isSaving.set(true);
    this.svc.delete(id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.load();
          this.setFeedback('success', 'Planned batch deleted');
        },
        error: () => this.setFeedback('error', 'Failed to delete batch'),
      });
  }

  retrieveCompleted(id: number) {
    if (this.activeBatch()) {
      this.setFeedback('error', 'Cannot retrieve while an active batch exists');
      return;
    }

    const completedBatch = this.historyBatches().find((b: BatchSitting) => b.id === id);
    if (!completedBatch) return;

    this.isSaving.set(true);
    const retrievedBatch: BatchSitting = {
      ...completedBatch,
      status: 'active',
      endedAt: undefined,
      updatedAt: new Date().toISOString(),
    };

    this.svc.update(retrievedBatch)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.load();
          this.setFeedback('success', 'Batch retrieved as active');
        },
        error: () => this.setFeedback('error', 'Failed to retrieve batch'),
      });
  }

  viewBatch(batch: BatchSitting) {
    this.viewingBatch.set(batch);
  }

  closeViewBatch() {
    this.viewingBatch.set(null);
  }

  setFeedback(type: 'success' | 'error', text: string) {
    this.feedback.set({ type, text });
    setTimeout(() => this.feedback.set(null), 3000);
  }

  private handleError(err: any, defaultMsg: string) {
    console.error('[BatchesComponent] Server error:', err);
    let msg = defaultMsg;
    if (err?.error && typeof err.error === 'object') {
      try {
        msg += ': ' + (err.error.message || JSON.stringify(err.error));
      } catch {
        msg += ': Server returned an error';
      }
    } else if (err?.message) {
      msg += ': ' + err.message;
    } else if (typeof err === 'string') {
      msg += ': ' + err;
    }
    this.setFeedback('error', msg);
  }

  fmt(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  stagesForBatch(batch: BatchSitting): Array<{ key: WorkflowStageKey; meta: any; window: any }> {
    return this.stageMeta.map((meta) => ({
      key: meta.key,
      meta,
      window: batch.stages[meta.key],
    }));
  }

  private currentDateIso(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
