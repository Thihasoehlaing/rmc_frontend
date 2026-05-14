/**
 * batch-sitting.component.ts
 *
 * Lifecycle rules:
 *  - Batches are never auto-ended by dates alone — only by:
 *      a) RMC clicking "End Batch" (confirmed via dialog), OR
 *      b) The earliest upcoming planned batch's startDate reaching today (auto-complete on load).
 *  - When ended, status → 'completed', endedAt is stamped, and the next planned batch (by date)
 *    automatically becomes 'active'.
 *  - Multiple planned batches are supported (sorted by startDate).
 *  - Planned batches can be deleted only before they start.
 *  - Completed batches appear in history with View (read-only) and Retrieve actions.
 *  - Retrieve is blocked while any active batch exists.
 *
 * Stage fields are DISABLED until global batch start + end dates are both set.
 *
 * Future backend integration: update BASE_URL in BatchSittingService.
 */

import {
  ChangeDetectionStrategy, Component, OnInit, OnDestroy,
  inject, signal, computed,
} from '@angular/core';
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

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-batch-sitting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ActionButtonComponent, ValidationMessageComponent, DialogComponent],
  templateUrl: './batch-sitting.component.html',
  styleUrl: './batch-sitting.component.scss',
})
export class BatchSittingComponent implements OnInit, OnDestroy {
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
  /** Batch currently being edited in the planned list (null = none). */
  editingPlannedId   = signal<number | null>(null);
  /** True when the "new planned batch" creation form is open. */
  isAddingPlanned    = signal(false);
  showEndConfirm     = signal(false);
  /** Batch shown in the read-only history view dialog. */
  viewingBatch       = signal<BatchSitting | null>(null);
  feedback           = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  expandedUpcomingIds = signal<Set<number>>(new Set<number>());
  expandedHistoryIds  = signal<Set<number>>(new Set<number>());

  // ── Forms ─────────────────────────────────────────────────────────────────
  activeForm!:  FormGroup;
  plannedForm!: FormGroup;   // reused for both editing and creating planned batches

  // ── Computed helpers ──────────────────────────────────────────────────────

  readonly canAddPlanned = computed(() => this.activeBatch() !== null);

  readonly endBatchTooltip = computed(() => {
    const a = this.activeBatch();
    if (!a) return '';
    return a.endDate > this.today
      ? `Batch scheduled end date (${this.fmt(a.endDate)}) has not been reached yet. Click to end early.`
      : 'End this batch and move it to history.';
  });

  readonly canRetrieve     = computed(() => this.activeBatch() === null);
  readonly retrieveTooltip = computed(() =>
    this.canRetrieve()
      ? 'Retrieve this batch as the new active batch.'
      : 'Cannot retrieve: an active batch already exists. End it first.',
  );

  /** Min startDate for a brand-new planned batch (day after last planned or active endDate). */
  get newPlannedMinStart(): string {
    const sorted = [...this.plannedBatches()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (sorted.length) return this.addDay(sorted.at(-1)!.endDate);
    const a = this.activeBatch();
    return a ? this.addDay(a.endDate) : '';
  }

  /** Min startDate when editing a specific planned batch. */
  minStartFor(batch: BatchSitting): string {
    const sorted = [...this.plannedBatches()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const idx    = sorted.findIndex(b => b.id === batch.id);
    if (idx > 0) return this.addDay(sorted[idx - 1].endDate);
    const a = this.activeBatch();
    return a ? this.addDay(a.endDate) : '';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.svc.loadAll().pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: batches => this.hydrate(batches),
      error: () => {
        this.buildActiveForm(null);
        this.buildPlannedForm(null, () => '', () => '');
        this.feedback.set({ type: 'error', text: 'Could not connect to server. Start json-server and refresh.' });
      },
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Hydration + auto-complete ─────────────────────────────────────────────

  private hydrate(batches: BatchSitting[]): void {
    const active  = batches.find(b => b.status === 'active') ?? null;
    const planned = batches.filter(b => b.status === 'planned').sort((a, b) => a.startDate.localeCompare(b.startDate));
    const nonActive = batches.filter(b => b.id !== active?.id);
    const upcoming = nonActive
      .filter(b => b.startDate > this.today || (b.status === 'planned' && b.endDate >= this.today))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const history = nonActive
      .filter(b => b.endDate < this.today || b.status === 'completed')
      .sort((a, b) => (b.endedAt ?? b.endDate).localeCompare(a.endedAt ?? a.endDate));

    // Auto-complete: if a planned batch's start date has arrived, complete the active batch and activate the next.
    if (active) {
      const nextToStart = planned.find(b => b.startDate <= this.today);
      if (nextToStart) {
        this.autoTransition(active, planned);
        return;
      }
    }

    this.activeBatch.set(active);
    this.plannedBatches.set(upcoming);
    this.historyBatches.set(history);
    this.expandedUpcomingIds.set(new Set<number>());
    this.expandedHistoryIds.set(new Set<number>());
    this.buildActiveForm(active);
    this.buildPlannedForm(null, () => '', () => '');
  }

  private autoTransition(active: BatchSitting, planned: BatchSitting[]): void {
    const now = new Date().toISOString();
    const completed: BatchSitting = { ...active, status: 'completed', endedAt: now, updatedAt: now };
    this.svc.update(completed).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const sorted    = [...planned].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const newActive = sorted.find(b => b.startDate <= this.today);
      if (newActive) {
        this.svc.update({ ...newActive, status: 'active', updatedAt: now }).pipe(takeUntil(this.destroy$))
          .subscribe(() => this.reload());
      } else {
        this.reload();
      }
    });
  }

  private reload(): void {
    this.svc.loadAll().pipe(takeUntil(this.destroy$)).subscribe(batches => this.hydrate(batches));
  }

  // ── Form builders ─────────────────────────────────────────────────────────

  private buildActiveForm(batch: BatchSitting | null): void {
    this.activeForm = this.makeBatchForm(
      batch,
      () => this.activeForm?.get('startDate')?.value ?? '',
      () => this.activeForm?.get('endDate')?.value   ?? '',
    );
    this.wireGlobalDates(this.activeForm);
    this.syncStageEnabled(this.activeForm);
  }

  private buildPlannedForm(batch: BatchSitting | null, startFn: () => string, endFn: () => string): void {
    this.plannedForm = this.makeBatchForm(batch, startFn, endFn);
    this.wireGlobalDates(this.plannedForm);
    this.syncStageEnabled(this.plannedForm);
  }

  private makeBatchForm(
    batch: BatchSitting | null,
    startFn: () => string,
    endFn: () => string,
  ): FormGroup {
    const stages: Record<string, FormGroup> = {};
    for (const m of WORKFLOW_STAGE_META) {
      const s = batch?.stages?.[m.key];
      stages[m.key] = this.fb.group(
        { startDate: [s?.startDate ?? null], endDate: [s?.endDate ?? null] },
        { validators: stageWithinBatchValidator(startFn, endFn) },
      );
    }
    return this.fb.group(
      {
        batchName: [batch?.batchName ?? '', [Validators.required, Validators.maxLength(100)]],
        startDate: [batch?.startDate ?? '', Validators.required],
        endDate:   [batch?.endDate   ?? '', Validators.required],
        stages:    this.fb.group(stages),
      },
      { validators: endAfterStartValidator },
    );
  }

  private wireGlobalDates(form: FormGroup): void {
    form.get('startDate')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.syncStageEnabled(form);
      this.revalidateStages(form);
    });
    form.get('endDate')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.syncStageEnabled(form);
      this.revalidateStages(form);
    });
  }

  /** Enable stage controls when both global dates are filled, disable otherwise. */
  private syncStageEnabled(form: FormGroup): void {
    const hasRange = !!(form.get('startDate')?.value && form.get('endDate')?.value);
    const stages   = form.get('stages') as FormGroup;
    if (hasRange) stages.enable({ emitEvent: false });
    else          stages.disable({ emitEvent: false });
  }

  private revalidateStages(form: FormGroup): void {
    const stages = form.get('stages') as FormGroup;
    Object.values(stages.controls).forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  // ── Active batch actions ──────────────────────────────────────────────────

  startEditActive(): void {
    this.buildActiveForm(this.activeBatch());
    this.isEditingActive.set(true);
    this.feedback.set(null);
  }

  cancelEditActive(): void {
    this.buildActiveForm(this.activeBatch());
    this.isEditingActive.set(false);
  }

  saveActive(): void {
    this.activeForm.markAllAsTouched();
    if (this.activeForm.invalid) {
      this.feedback.set({ type: 'error', text: 'Please fix validation errors before saving.' });
      return;
    }
    const fv  = this.activeForm.getRawValue();
    const now = new Date().toISOString();
    this.isSaving.set(true);
    this.feedback.set(null);

    const existing = this.activeBatch();
    if (existing) {
      this.svc.update({ ...existing, ...fv, updatedAt: now }).pipe(
        finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
      ).subscribe({
        next: saved => { this.activeBatch.set(saved); this.isEditingActive.set(false); this.feedback.set({ type: 'success', text: 'Active batch saved.' }); },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to save.' }),
      });
    } else {
      const currentDate = this.currentDateIso();
      const isFutureStart = typeof fv.startDate === 'string' && fv.startDate > currentDate;
      const user = this.auth.currentUser();
      this.svc.create({
        ...fv,
        status: isFutureStart ? 'planned' : 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: user?.username ?? 'rmc',
      }).pipe(
        finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
      ).subscribe({
        next: created => {
          if (isFutureStart) {
            this.plannedBatches.update(list =>
              [...list, created].sort((a, b) => a.startDate.localeCompare(b.startDate))
            );
            // Keep upcoming cards minimized by default.
            this.expandedUpcomingIds.update(current => {
              const next = new Set<number>(current);
              next.delete(created.id);
              return next;
            });
            this.buildActiveForm(null);
            this.feedback.set({ type: 'success', text: 'Start date is in the future. Batch was added to Upcoming Batches.' });
          } else {
            this.activeBatch.set(created);
            this.buildActiveForm(created);
            this.feedback.set({ type: 'success', text: 'Active batch created.' });
          }
          this.isEditingActive.set(false);
        },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to create.' }),
      });
    }
  }

  // ── End batch ─────────────────────────────────────────────────────────────

  openEndConfirm():   void { this.showEndConfirm.set(true); }
  cancelEndConfirm(): void { this.showEndConfirm.set(false); }

  confirmEndBatch(): void {
    const active = this.activeBatch();
    if (!active) return;
    const now       = new Date().toISOString();
    const completed = { ...active, status: 'completed' as const, endedAt: now, updatedAt: now };
    this.isSaving.set(true);

    this.svc.update(completed).pipe(
      finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        // Remove immediately from current active view.
        this.activeBatch.set(null);
        this.isEditingActive.set(false);
        // Append into history without replacing unrelated history records.
        this.historyBatches.update(list => {
          const withoutEnded = list.filter(b => b.id !== completed.id);
          return [completed, ...withoutEnded].sort((a, b) => (b.endedAt ?? b.endDate).localeCompare(a.endedAt ?? a.endDate));
        });
        // Remove ended batch from upcoming/planned lists if present.
        this.plannedBatches.update(list => list.filter(b => b.id !== completed.id));

        this.showEndConfirm.set(false);
        // Promote next planned batch (earliest by date) to active
        const sorted      = [...this.plannedBatches()].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const nextPlanned = sorted[0];
        if (nextPlanned) {
          this.svc.update({ ...nextPlanned, status: 'active', updatedAt: now }).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (saved) => {
                this.activeBatch.set(saved);
                this.plannedBatches.update(list => list.filter(b => b.id !== saved.id));
                this.buildActiveForm(saved);
                this.feedback.set({ type: 'success', text: 'Batch ended. Next planned batch is now active.' });
              },
              error: () => {
                this.feedback.set({ type: 'error', text: 'Batch ended, but failed to activate next planned batch.' });
              },
            });
        } else {
          this.buildActiveForm(null);
          this.feedback.set({ type: 'success', text: 'Batch ended and moved to history.' });
        }
      },
      error: () => this.feedback.set({ type: 'error', text: 'Failed to end batch.' }),
    });
  }

  // ── Planned batch actions ─────────────────────────────────────────────────

  startAddPlanned(): void {
    this.editingPlannedId.set(null);
    this.isAddingPlanned.set(true);
    const minStart = this.newPlannedMinStart;
    this.buildPlannedForm(
      null,
      () => this.plannedForm?.get('startDate')?.value ?? '',
      () => this.plannedForm?.get('endDate')?.value   ?? '',
    );
    if (minStart) this.plannedForm.get('startDate')!.setValue(minStart);
    this.feedback.set(null);
  }

  startEditPlanned(batch: BatchSitting): void {
    this.isAddingPlanned.set(false);
    this.editingPlannedId.set(batch.id);
    this.buildPlannedForm(
      batch,
      () => this.plannedForm?.get('startDate')?.value ?? '',
      () => this.plannedForm?.get('endDate')?.value   ?? '',
    );
    this.feedback.set(null);
  }

  cancelPlannedEdit(): void {
    this.editingPlannedId.set(null);
    this.isAddingPlanned.set(false);
  }

  savePlanned(): void {
    this.plannedForm.markAllAsTouched();
    if (this.plannedForm.invalid) {
      this.feedback.set({ type: 'error', text: 'Please fix validation errors before saving.' });
      return;
    }
    const fv  = this.plannedForm.getRawValue();
    const now = new Date().toISOString();
    this.isSaving.set(true);
    this.feedback.set(null);

    const editId = this.editingPlannedId();
    if (editId !== null) {
      const existing = this.plannedBatches().find(b => b.id === editId)!;
      this.svc.update({ ...existing, ...fv, updatedAt: now }).pipe(
        finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
      ).subscribe({
        next: saved => {
          this.plannedBatches.update(list =>
            list.map(b => b.id === saved.id ? saved : b).sort((a, b) => a.startDate.localeCompare(b.startDate))
          );
          this.editingPlannedId.set(null);
          this.feedback.set({ type: 'success', text: 'Planned batch updated.' });
        },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to save.' }),
      });
    } else {
      const user = this.auth.currentUser();
      this.svc.create({ ...fv, status: 'planned', createdAt: now, updatedAt: now, createdBy: user?.username ?? 'rmc' }).pipe(
        finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
      ).subscribe({
        next: created => {
          this.plannedBatches.update(list =>
            [...list, created].sort((a, b) => a.startDate.localeCompare(b.startDate))
          );
          this.isAddingPlanned.set(false);
          this.feedback.set({ type: 'success', text: 'Planned batch created.' });
        },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to create.' }),
      });
    }
  }

  deletePlanned(batch: BatchSitting): void {
    this.svc.delete(batch.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.plannedBatches.update(list => list.filter(b => b.id !== batch.id));
        if (this.editingPlannedId() === batch.id) this.cancelPlannedEdit();
        this.feedback.set({ type: 'success', text: 'Planned batch deleted.' });
      },
      error: () => this.feedback.set({ type: 'error', text: 'Failed to delete.' }),
    });
  }

  canDeletePlanned(batch: BatchSitting): boolean { return batch.startDate > this.today; }

  toggleUpcoming(batchId: number): void {
    this.expandedUpcomingIds.update(current => {
      const next = new Set<number>(current);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  isUpcomingExpanded(batchId: number): boolean {
    return this.expandedUpcomingIds().has(batchId);
  }

  toggleHistory(batchId: number): void {
    this.expandedHistoryIds.update(current => {
      const next = new Set<number>(current);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  isHistoryExpanded(batchId: number): boolean {
    return this.expandedHistoryIds().has(batchId);
  }

  // ── History actions ───────────────────────────────────────────────────────

  openView(batch: BatchSitting):  void { this.viewingBatch.set(batch); }
  closeView():                    void { this.viewingBatch.set(null); }

  retrieveBatch(batch: BatchSitting): void {
    if (!this.canRetrieve()) return;
    const now = new Date().toISOString();
    const { endedAt: _removed, ...rest } = batch as BatchSitting & { endedAt?: string };
    const retrieved: BatchSitting = { ...rest, status: 'active', updatedAt: now };
    this.isSaving.set(true);
    this.svc.update(retrieved).pipe(
      finalize(() => this.isSaving.set(false)), takeUntil(this.destroy$),
    ).subscribe({
      next: saved => {
        this.activeBatch.set(saved);
        this.historyBatches.update(list => list.filter(b => b.id !== batch.id));
        this.buildActiveForm(saved);
        this.feedback.set({ type: 'success', text: 'Batch retrieved and set as active.' });
      },
      error: () => this.feedback.set({ type: 'error', text: 'Failed to retrieve.' }),
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  stagesEnabled(form: FormGroup): boolean {
    return !!(form.get('startDate')?.value && form.get('endDate')?.value);
  }

  hasGlobalError(form: FormGroup): boolean {
    return !!form.errors?.['endBeforeStart'] && !!form.get('endDate')?.touched;
  }

  hasStageErr(form: FormGroup, key: WorkflowStageKey, err: string): boolean {
    const g = form.get('stages')!.get(key) as FormGroup;
    return !!g.errors?.[err] && !!(g.get('startDate')?.touched || g.get('endDate')?.touched);
  }

  stageGroup(form: FormGroup, key: WorkflowStageKey): FormGroup {
    return form.get('stages')!.get(key) as FormGroup;
  }

  /** Open native date picker via icon click. */
  openDatePicker(event: MouseEvent): void {
    const wrap  = (event.currentTarget as HTMLElement).closest('.date-input-wrap');
    const input = wrap?.querySelector('input[type="date"]') as HTMLInputElement | null;
    try { input?.showPicker(); } catch { /* browser may not support */ }
  }

  fmt(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private addDay(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(new Date(dateStr + 'T00:00:00').getTime() + 86_400_000).toISOString().substring(0, 10);
  }

  private currentDateIso(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
