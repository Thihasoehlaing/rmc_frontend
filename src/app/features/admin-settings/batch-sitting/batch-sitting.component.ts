/**
 * batch-sitting.component.ts
 *
 * Lifecycle rules:
 *  - Batches are never auto-ended by dates alone — only by:
 *      a) RMC clicking "End Batch" (confirmed via dialog), OR
 *      b) The earliest upcoming planned batch's startDate reaching now (auto-complete on load).
 *  - Ending a batch never auto-promotes the next planned batch — it only goes active at its
 *    own scheduled start, or when RMC clicks "Start" on it manually.
 *  - Multiple planned batches are supported (sorted by startDate).
 *  - Planned batches can be deleted only before they start.
 *  - Completed batches appear in history with View (read-only) and Retrieve actions.
 *  - Retrieve is blocked while any active batch exists.
 *  - Editing an active batch's start date into the future demotes it to "planned" (via the
 *    /plan route) instead of saving it as active — see saveActive().
 *
 * Stage fields are DISABLED until global batch start + end dates are both set.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';

import { BatchSittingService } from '../batch-sitting.service';
import {
  BatchSitting,
  WORKFLOW_STAGE_META,
  WorkflowStageKey,
} from '../../../core/interfaces/batch-sitting.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { BatchManagementSkeletonComponent } from '../../../shared/components/batch-management-skeleton/batch-management-skeleton.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';

type BatchSectionView = 'active' | 'upcoming' | 'history';

// ── Date/time helpers ─────────────────────────────────────────────────────────
// <input type="datetime-local"> works in local "YYYY-MM-DDTHH:mm" strings —
// these stay in that same format throughout so lexicographic string
// comparisons (used everywhere below) stay valid, and never touch Date
// parsing of a *stored* value (only of "now"), to avoid timezone surprises.

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function nowInputValue(): string {
  return toLocalInputValue(new Date());
}

function addMinutesToValue(value: string, minutes: number): string {
  if (!value) return '';
  const [datePart, timePart] = value.split('T');
  const [y, mo, da] = datePart.split('-').map(Number);
  const [h, mi] = (timePart ?? '00:00').split(':').map(Number);
  const dt = new Date(y, mo - 1, da, h, mi);
  dt.setMinutes(dt.getMinutes() + minutes);
  return toLocalInputValue(dt);
}

/** Midnight at the start of the calendar day after `value` — used to enforce a full 1-day gap between consecutive batches. */
function startOfNextDay(value: string): string {
  if (!value) return '';
  const [datePart] = value.split('T');
  const [y, mo, da] = datePart.split('-').map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + 1);
  return toLocalInputValue(dt);
}

// ── Validators ────────────────────────────────────────────────────────────────

function endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const s = group.get('startDate')?.value as string | null;
  const e = group.get('endDate')?.value as string | null;
  if (!s || !e) return null;
  return e >= s ? null : { endBeforeStart: true };
}

/**
 * An active batch's start date is allowed to move into the future — saveActive()
 * auto-demotes it to "planned" via the /plan route when that happens — but
 * only if the new date clears the same >=1hr-from-now buffer required of any
 * planned batch. A future date less than 1hr away is neither a valid "starts
 * now" edit nor a valid "planned" schedule, so it's rejected outright.
 */
function activeStartBufferValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string | null;
  if (!v) return null;
  const now = nowInputValue();
  if (v <= now) return null;
  return v < addMinutesToValue(now, 60) ? { activeStartTooSoon: true } : null;
}

/**
 * Batch names are unique per form in the DB (uq_batches on form_id+batch_name),
 * across every status — including completed batches still sitting in history.
 * Caught here so the admin gets an inline message instead of a 500 from the
 * duplicate-key insert. Compared case-insensitively/trimmed to match MySQL's
 * default case-insensitive collation.
 */
function batchNameUniqueValidator(takenNamesFn: () => Set<string>) {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value as string | null)?.trim().toLowerCase();
    if (!v) return null;
    return takenNamesFn().has(v) ? { batchNameTaken: true } : null;
  };
}

/** A planned batch can't be scheduled in the past — it must start at least 1hr from now. */
function plannedStartNotPastValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string | null;
  if (!v) return null;
  return v < addMinutesToValue(nowInputValue(), 60) ? { plannedStartTooSoon: true } : null;
}

/**
 * The single source of truth for "batches never overlap and always keep a full
 * 1-day gap". Runs at the group level against every OTHER active/planned batch
 * (completed batches live in the past and are exempt), so it covers every edit
 * path uniformly — active or planned, start-side or end-side — instead of the
 * old per-field check that only ever compared a planned start to its immediate
 * predecessor.
 */
function batchTimelineValidator(othersFn: () => Array<{ start: string; end: string }>) {
  return (group: AbstractControl): ValidationErrors | null => {
    const s = group.get('startDate')?.value as string | null;
    const e = group.get('endDate')?.value as string | null;
    if (!s || !e) return null;
    for (const o of othersFn()) {
      if (!o.start || !o.end) continue;
      // Inclusive intersection — touching endpoints already counts as overlap.
      if (s <= o.end && o.start <= e) return { batchOverlap: true };
      // Non-overlapping: exactly one side applies. Require a full calendar-day gap.
      if (o.end < s && s < startOfNextDay(o.end)) return { batchGapTooSmall: true };
      if (e < o.start && o.start < startOfNextDay(e)) return { batchGapTooSmall: true };
    }
    return null;
  };
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
  imports: [
    AdminSettingsPageHeaderComponent,
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    ActionButtonComponent,
    ValidationMessageComponent,
    DialogComponent,
    BatchManagementSkeletonComponent,
    DataTableComponent,
    PaginationComponent,
  ],
  templateUrl: './batch-sitting.component.html',
  styleUrl: './batch-sitting.component.scss',
})
export class BatchSittingComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(BatchSittingService);
  private readonly auth = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('feedbackBanner') private feedbackBannerRef?: ElementRef<HTMLElement>;

  readonly stageColumns: DataTableColumn[] = [
    { key: 'stage', label: 'Stage' },
    { key: 'start', label: 'Opens', width: '24%' },
    { key: 'end', label: 'Closes', width: '24%' },
  ];
  readonly stageMeta = WORKFLOW_STAGE_META;
  /** Live "now", read fresh on every access — used for display/gating checks in the template and a couple of helpers. */
  get today(): string {
    return nowInputValue();
  }

  // ── Data signals ──────────────────────────────────────────────────────────
  activeBatch = signal<BatchSitting | null>(null);
  plannedBatches = signal<BatchSitting[]>([]);
  historyBatches = signal<BatchSitting[]>([]);

  // ── UI signals ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  selectedSection = signal<BatchSectionView>('active');
  isSaving = signal(false);
  isEditingActive = signal(false);
  /** The completed batch being re-activated through the active editor (null = not retrieving). Its stale end date must be replaced before it can start. */
  retrievingBatch = signal<BatchSitting | null>(null);
  /** Batch currently being edited in the planned list (null = none). */
  editingPlannedId = signal<number | null>(null);
  /** True when the "new planned batch" creation form is open. */
  isAddingPlanned = signal(false);
  showEndConfirm = signal(false);
  /** Batch shown in the read-only history view dialog. */
  viewingBatch = signal<BatchSitting | null>(null);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  expandedUpcomingIds = signal<Set<number>>(new Set<number>());
  expandedHistoryIds = signal<Set<number>>(new Set<number>());
  stagePage = signal(1);
  stagePageSize = signal(15);
  stagePageSizeOptions = [5, 15, 30, 50];
  historyPage = signal(1);
  historyPageSize = signal(5);
  historyPageSizeOptions = [5, 10, 15, 30];

  // ── Forms ─────────────────────────────────────────────────────────────────
  activeForm!: FormGroup;
  plannedForm!: FormGroup; // reused for both editing and creating planned batches

  // ── Computed helpers ──────────────────────────────────────────────────────

  readonly isCreatingActive = computed(() => this.isEditingActive() && this.activeBatch() === null);

  readonly canStartPlanned = computed(() => this.activeBatch() === null);
  readonly startPlannedTooltip = computed(() =>
    this.canStartPlanned()
      ? 'Start this batch now and make it the active batch.'
      : 'Cannot start: an active batch already exists. End it first.',
  );

  readonly endBatchTooltip = computed(() => {
    const a = this.activeBatch();
    if (!a) return '';
    return a.endDate > this.today
      ? `Batch scheduled end date (${this.fmt(a.endDate)}) has not been reached yet. Click to end early.`
      : 'End this batch and move it to history.';
  });

  readonly canRetrieve = computed(() => this.activeBatch() === null);
  readonly retrieveTooltip = computed(() =>
    this.canRetrieve()
      ? 'Retrieve this batch as the new active batch.'
      : 'Cannot retrieve: an active batch already exists. End it first.',
  );

  /**
   * Every OTHER live (active/planned) batch's window, for the timeline
   * overlap/gap validator. `selfId` is excluded so a batch never conflicts with
   * its own stored copy while being edited. Completed batches are omitted —
   * they're historical and may sit in the past freely.
   */
  private otherTimelineBatches(selfId: number | null): Array<{ start: string; end: string }> {
    const active = this.activeBatch();
    const live: BatchSitting[] = [
      ...(active && active.id !== selfId ? [active] : []),
      ...this.plannedBatches().filter((b) => b.id !== selfId),
    ];
    return live.map((b) => ({ start: b.startDate, end: b.endDate }));
  }

  /** Lowercased/trimmed names of every batch (active + planned + history) except `selfId`, for the unique-name check. */
  private takenBatchNames(selfId: number | null): Set<string> {
    const active = this.activeBatch();
    const all: BatchSitting[] = [
      ...(active ? [active] : []),
      ...this.plannedBatches(),
      ...this.historyBatches(),
    ];
    return new Set(
      all.filter((b) => b.id !== selfId).map((b) => b.batchName.trim().toLowerCase()),
    );
  }

  /** The previous planned/active batch's endDate to chain a new/edited planned batch after, or '' if there isn't one. */
  private prevBatchEndFor(batch: BatchSitting | null): string {
    const sorted = [...this.plannedBatches()].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const idx = batch ? sorted.findIndex((b) => b.id === batch.id) : sorted.length;
    if (idx > 0) return sorted[idx - 1].endDate;
    return this.activeBatch()?.endDate ?? '';
  }

  /**
   * Min startDate for a brand-new planned batch: whichever is later of (a) the
   * start of the day *after* the last planned/active batch ends — batches
   * can't share a calendar day — and (b) at least 1 hour from now.
   */
  get newPlannedMinStart(): string {
    const prevEnd = this.prevBatchEndFor(null);
    const chained = prevEnd ? startOfNextDay(prevEnd) : '';
    const floor = addMinutesToValue(nowInputValue(), 60);
    return chained && chained > floor ? chained : floor;
  }

  /** Min startDate when editing a specific planned batch. */
  minStartFor(batch: BatchSitting): string {
    const prevEnd = this.prevBatchEndFor(batch);
    const chained = prevEnd ? startOfNextDay(prevEnd) : '';
    const floor = addMinutesToValue(nowInputValue(), 60);
    return chained && chained > floor ? chained : floor;
  }

  stageTotalPages(): number {
    return Math.max(1, Math.ceil(this.stageMeta.length / this.stagePageSize()));
  }

  paginatedStageMeta() {
    const currentPage = Math.min(this.stagePage(), this.stageTotalPages());
    const startIndex = (currentPage - 1) * this.stagePageSize();
    return this.stageMeta.slice(startIndex, startIndex + this.stagePageSize());
  }

  onStagePageChange(page: number): void {
    this.stagePage.set(page);
  }

  onStagePageSizeChange(pageSize: number): void {
    this.stagePageSize.set(pageSize);
    this.stagePage.set(1);
  }
  readonly historyTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.historyBatches().length / this.historyPageSize())),
  );

  readonly paginatedHistoryBatches = computed(() => {
    const currentPage = Math.min(this.historyPage(), this.historyTotalPages());
    const startIndex = (currentPage - 1) * this.historyPageSize();
    return this.historyBatches().slice(startIndex, startIndex + this.historyPageSize());
  });

  onHistoryPageChange(page: number): void {
    this.historyPage.set(page);
  }

  onHistoryPageSizeChange(pageSize: number): void {
    this.historyPageSize.set(pageSize);
    this.historyPage.set(1);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private autoTransitionTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.svc
      .loadAll()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (batches) => this.hydrate(batches),
        error: () => {
          this.buildActiveForm(null);
          this.buildPlannedForm(
            null,
            () => '',
            () => '',
          );
          this.feedback.set({
            type: 'error',
            text: 'Could not connect to server. Start json-server and refresh.',
          });
        },
      });
    // Planned batches start, and the active batch stops, purely on schedule —
    // this can't wait for a page reload, so poll for it while the page is open.
    this.autoTransitionTimer = setInterval(() => this.checkAutoTransitions(), 30_000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoTransitionTimer) clearInterval(this.autoTransitionTimer);
  }

  // ── Hydration + auto-start/stop ───────────────────────────────────────────

  private hydrate(batches: BatchSitting[]): void {
    const active = batches.find((b) => b.status === 'active') ?? null;
    const nonActive = batches.filter((b) => b.id !== active?.id);
    const upcoming = nonActive
      .filter((b) => b.status === 'planned')
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const history = nonActive
      .filter((b) => b.status === 'completed')
      .sort((a, b) => (b.endedAt ?? b.endDate).localeCompare(a.endedAt ?? a.endDate));

    this.activeBatch.set(active);
    this.plannedBatches.set(upcoming);
    this.historyBatches.set(history);
    this.stagePage.set(1);
    this.historyPage.set(1);
    this.expandedUpcomingIds.set(new Set<number>());
    this.expandedHistoryIds.set(new Set<number>());
    this.buildActiveForm(active);
    this.buildPlannedForm(
      null,
      () => '',
      () => '',
    );
    this.selectDefaultSection();

    this.checkAutoTransitions();
  }
  private selectDefaultSection(): void {
    if (this.activeBatch()) {
      this.selectedSection.set('active');
      return;
    }

    if (this.plannedBatches().length > 0) {
      this.selectedSection.set('upcoming');
      return;
    }

    this.selectedSection.set('history');
  }


  /**
   * Runs on load and every ~30s while the page is open. Stopping the active
   * batch never depends on a next planned batch existing (each batch stops
   * purely on its own schedule); starting the next one is a separate,
   * independent check, run right after in case both are due at once.
   */
  private checkAutoTransitions(): void {
    if (
      this.isSaving() ||
      this.isEditingActive() ||
      this.editingPlannedId() !== null ||
      this.isAddingPlanned()
    ) {
      return;
    }
    const now = nowInputValue();
    const active = this.activeBatch();
    if (active && active.endDate <= now) {
      this.autoStopActive(active, now);
      return;
    }
    if (!active) {
      this.autoStartNextPlanned(now);
    }
  }

  private autoStopActive(active: BatchSitting, now: string): void {
    const stamp = new Date().toISOString();
    const completed: BatchSitting = { ...active, status: 'completed', endedAt: stamp, updatedAt: stamp };
    this.svc
      .update(completed)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.activeBatch.set(null);
        this.historyBatches.update((list) =>
          [completed, ...list.filter((b) => b.id !== completed.id)].sort((a, b) =>
            (b.endedAt ?? b.endDate).localeCompare(a.endedAt ?? a.endDate),
          ),
        );
        this.buildActiveForm(null);
        this.autoStartNextPlanned(now);
      });
  }

  private autoStartNextPlanned(now: string): void {
    const due = [...this.plannedBatches()]
      .filter((b) => b.startDate <= now)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    if (!due) return;
    const stamp = new Date().toISOString();
    this.svc
      .update({ ...due, status: 'active', updatedAt: stamp })
      .pipe(takeUntil(this.destroy$))
      .subscribe((saved) => {
        this.activeBatch.set(saved);
        this.plannedBatches.update((list) => list.filter((b) => b.id !== saved.id));
        this.buildActiveForm(saved);
      });
  }

  // ── Form builders ─────────────────────────────────────────────────────────

  private buildActiveForm(batch: BatchSitting | null): void {
    this.activeForm = this.makeBatchForm(
      batch,
      () => this.activeForm?.get('startDate')?.value ?? '',
      () => this.activeForm?.get('endDate')?.value ?? '',
      true,
      () => this.otherTimelineBatches(batch?.id ?? null),
    );
    this.wireGlobalDates(this.activeForm);
    this.syncStageEnabled(this.activeForm);
  }

  private buildPlannedForm(
    batch: BatchSitting | null,
    startFn: () => string,
    endFn: () => string,
  ): void {
    this.plannedForm = this.makeBatchForm(
      batch,
      startFn,
      endFn,
      false,
      () => this.otherTimelineBatches(batch?.id ?? null),
    );
    this.wireGlobalDates(this.plannedForm);
    this.syncStageEnabled(this.plannedForm);
  }

  private makeBatchForm(
    batch: BatchSitting | null,
    startFn: () => string,
    endFn: () => string,
    isActive: boolean,
    othersFn: () => Array<{ start: string; end: string }>,
  ): FormGroup {
    const stages: Record<string, FormGroup> = {};
    for (const m of WORKFLOW_STAGE_META) {
      const s = batch?.stages?.[m.key];
      stages[m.key] = this.fb.group(
        { startDate: [s?.startDate ?? null], endDate: [s?.endDate ?? null] },
        { validators: stageWithinBatchValidator(startFn, endFn) },
      );
    }
    const startDateValidators = isActive
      ? [Validators.required, activeStartBufferValidator]
      : [Validators.required, plannedStartNotPastValidator];
    return this.fb.group(
      {
        batchName: [
          batch?.batchName ?? '',
          [
            Validators.required,
            Validators.maxLength(100),
            batchNameUniqueValidator(() => this.takenBatchNames(batch?.id ?? null)),
          ],
        ],
        startDate: [batch?.startDate ?? '', startDateValidators],
        endDate: [batch?.endDate ?? '', Validators.required],
        stages: this.fb.group(stages),
      },
      { validators: [endAfterStartValidator, batchTimelineValidator(othersFn)] },
    );
  }

  private wireGlobalDates(form: FormGroup): void {
    form
      .get('startDate')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.syncStageEnabled(form);
        this.revalidateStages(form);
      });
    form
      .get('endDate')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.syncStageEnabled(form);
        this.revalidateStages(form);
      });
  }

  /** Enable stage controls when both global dates are filled, disable otherwise. */
  private syncStageEnabled(form: FormGroup): void {
    const hasRange = !!(form.get('startDate')?.value && form.get('endDate')?.value);
    const stages = form.get('stages') as FormGroup;
    if (hasRange) stages.enable({ emitEvent: false });
    else stages.disable({ emitEvent: false });
  }

  private revalidateStages(form: FormGroup): void {
    const stages = form.get('stages') as FormGroup;
    Object.values(stages.controls).forEach((c) => c.updateValueAndValidity({ emitEvent: false }));
  }

  // ── Active batch actions ──────────────────────────────────────────────────

  startEditActive(): void {
    this.buildActiveForm(this.activeBatch());
    if (!this.activeBatch()) {
      // Brand-new active batch: stamp the start to the creation moment and lock
      // the field — the admin never picks it. It's re-stamped to the exact
      // click-of-"Start Batch" moment on save (see saveActive()), so the
      // recorded start reflects when the batch actually went live.
      this.activeForm.get('startDate')!.setValue(nowInputValue());
      this.activeForm.get('startDate')!.disable({ emitEvent: false });
    }
    this.isEditingActive.set(true);
    this.feedback.set(null);
  }

  cancelEditActive(): void {
    this.retrievingBatch.set(null);
    this.buildActiveForm(this.activeBatch());
    this.isEditingActive.set(false);
  }

  saveActive(): void {
    this.activeForm.markAllAsTouched();
    if (this.activeForm.invalid) {
      this.feedback.set({ type: 'error', text: 'Please fix validation errors before saving.' });
      this.scrollToFeedback();
      return;
    }
    const fv = this.activeForm.getRawValue();
    const now = new Date().toISOString();
    this.isSaving.set(true);
    this.feedback.set(null);

    const retrieving = this.retrievingBatch();
    if (retrieving) {
      // Re-activating a completed batch with the fresh dates the admin just
      // set. Start is re-stamped to now (it was locked), and activateNow
      // persists the new window then flips status to active.
      const payload: BatchSitting = {
        ...retrieving,
        ...fv,
        startDate: nowInputValue(),
        status: 'active',
        updatedAt: now,
      };
      this.svc
        .activateNow(payload)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (saved) => {
            this.retrievingBatch.set(null);
            this.activeBatch.set(saved);
            this.historyBatches.update((list) => list.filter((b) => b.id !== retrieving.id));
            this.isEditingActive.set(false);
            this.buildActiveForm(saved);
            this.feedback.set({ type: 'success', text: 'Batch retrieved and set as active.' });
          },
          error: () => this.feedback.set({ type: 'error', text: 'Failed to retrieve.' }),
        });
      return;
    }

    const existing = this.activeBatch();
    if (existing) {
      // Editing an active batch's start date into the future auto-demotes it
      // to "planned" via the /plan route — the validator above already
      // guarantees this is either <= now, or safely >= 1hr from now.
      const movesToPlanned = typeof fv.startDate === 'string' && fv.startDate > nowInputValue();
      const payload: BatchSitting = {
        ...existing,
        ...fv,
        updatedAt: now,
        status: movesToPlanned ? 'planned' : 'active',
      };
      const save$ = movesToPlanned ? this.svc.planNow(payload) : this.svc.update(payload);
      save$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (saved) => {
            this.isEditingActive.set(false);
            if (movesToPlanned) {
              this.activeBatch.set(null);
              this.plannedBatches.update((list) =>
                [...list, saved].sort((a, b) => a.startDate.localeCompare(b.startDate)),
              );
              this.buildActiveForm(null);
              this.feedback.set({
                type: 'success',
                text: `Start date moved to the future — ${saved.batchName} moved to Upcoming Batches.`,
              });
            } else {
              this.activeBatch.set(saved);
              this.feedback.set({ type: 'success', text: 'Active batch saved.' });
            }
          },
          error: () => this.feedback.set({ type: 'error', text: 'Failed to save.' }),
        });
    } else {
      // The start field is locked to the creation moment (see startEditActive());
      // re-stamp it to the actual click-of-"Start Batch" moment so the recorded
      // start reflects when the batch truly went live, not when the form opened.
      // A brand-new active batch therefore always starts now — future scheduling
      // is done through "Add Planned Batch" instead.
      const user = this.auth.currentUser();
      this.svc
        .create({
          ...fv,
          startDate: nowInputValue(),
          status: 'active',
          createdAt: now,
          updatedAt: now,
          createdBy: user?.username ?? 'rmc',
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (created) => {
            this.activeBatch.set(created);
            this.buildActiveForm(created);
            this.feedback.set({ type: 'success', text: 'Active batch created.' });
            this.isEditingActive.set(false);
          },
          error: () => this.feedback.set({ type: 'error', text: 'Failed to create.' }),
        });
    }
  }

  // ── End batch ─────────────────────────────────────────────────────────────

  openEndConfirm(): void {
    this.showEndConfirm.set(true);
  }
  cancelEndConfirm(): void {
    this.showEndConfirm.set(false);
  }

  confirmEndBatch(): void {
    const active = this.activeBatch();
    if (!active) return;
    const now = new Date().toISOString();
    const completed = { ...active, status: 'completed' as const, endedAt: now, updatedAt: now };
    this.isSaving.set(true);

    this.svc
      .update(completed)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          // Remove immediately from current active view.
          this.activeBatch.set(null);
          this.isEditingActive.set(false);
          // Append into history without replacing unrelated history records.
          this.historyBatches.update((list) => {
            const withoutEnded = list.filter((b) => b.id !== completed.id);
            return [completed, ...withoutEnded].sort((a, b) =>
              (b.endedAt ?? b.endDate).localeCompare(a.endedAt ?? a.endDate),
            );
          });
          // Remove ended batch from upcoming/planned lists if present.
          this.plannedBatches.update((list) => list.filter((b) => b.id !== completed.id));

          this.showEndConfirm.set(false);
          // Ending a batch never auto-promotes a planned batch — the next
          // planned batch only goes active at its own scheduled start date
          // (or when RMC explicitly clicks "Start" on it).
          this.buildActiveForm(null);
          this.feedback.set({ type: 'success', text: 'Batch ended and moved to history.' });
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
      () => this.plannedForm?.get('endDate')?.value ?? '',
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
      () => this.plannedForm?.get('endDate')?.value ?? '',
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
      this.scrollToFeedback();
      return;
    }
    const fv = this.plannedForm.getRawValue();
    const now = new Date().toISOString();
    this.isSaving.set(true);
    this.feedback.set(null);

    const editId = this.editingPlannedId();
    if (editId !== null) {
      const existing = this.plannedBatches().find((b) => b.id === editId)!;
      this.svc
        .update({ ...existing, ...fv, updatedAt: now })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (saved) => {
            this.plannedBatches.update((list) =>
              list
                .map((b) => (b.id === saved.id ? saved : b))
                .sort((a, b) => a.startDate.localeCompare(b.startDate)),
            );
            this.editingPlannedId.set(null);
            this.feedback.set({ type: 'success', text: 'Planned batch updated.' });
          },
          error: () => this.feedback.set({ type: 'error', text: 'Failed to save.' }),
        });
    } else {
      const user = this.auth.currentUser();
      this.svc
        .create({
          ...fv,
          status: 'planned',
          createdAt: now,
          updatedAt: now,
          createdBy: user?.username ?? 'rmc',
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (created) => {
            this.plannedBatches.update((list) =>
              [...list, created].sort((a, b) => a.startDate.localeCompare(b.startDate)),
            );
            this.isAddingPlanned.set(false);
            this.feedback.set({ type: 'success', text: 'Planned batch created.' });
          },
          error: () => this.feedback.set({ type: 'error', text: 'Failed to create.' }),
        });
    }
  }

  /** Manually starts a planned batch now (only allowed while no batch is active). */
  startPlanned(batch: BatchSitting): void {
    if (!this.canStartPlanned()) return;
    const now = new Date().toISOString();
    const startVal = nowInputValue();
    // Starting a batch early moves its start to now — the applicant submission
    // window opens with the batch, so its start follows the batch start too.
    const stages = {
      ...batch.stages,
      applicant: { ...batch.stages.applicant, startDate: startVal },
    };
    this.isSaving.set(true);
    this.svc
      .activateNow({ ...batch, startDate: startVal, stages, updatedAt: now })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (saved) => {
          this.activeBatch.set(saved);
          this.plannedBatches.update((list) => list.filter((b) => b.id !== batch.id));
          this.buildActiveForm(saved);
          this.feedback.set({
            type: 'success',
            text: `${saved.batchName} started and is now the active batch.`,
          });
        },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to start batch.' }),
      });
  }

  deletePlanned(batch: BatchSitting): void {
    this.svc
      .delete(batch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.plannedBatches.update((list) => list.filter((b) => b.id !== batch.id));
          if (this.editingPlannedId() === batch.id) this.cancelPlannedEdit();
          this.feedback.set({ type: 'success', text: 'Planned batch deleted.' });
        },
        error: () => this.feedback.set({ type: 'error', text: 'Failed to delete.' }),
      });
  }

  canDeletePlanned(batch: BatchSitting): boolean {
    return batch.startDate > this.today;
  }

  toggleUpcoming(batchId: number): void {
    this.expandedUpcomingIds.update((current) => {
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
    this.expandedHistoryIds.update((current) => {
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

  openView(batch: BatchSitting): void {
    this.viewingBatch.set(batch);
  }
  closeView(): void {
    this.viewingBatch.set(null);
  }

  retrieveBatch(batch: BatchSitting): void {
    if (!this.canRetrieve()) return;

    // A batch whose end date is still ahead can be brought back live as-is — its
    // window is still valid. But one that already ended can't just be
    // re-activated: it would auto-complete again on the very next tick. So open
    // it in the editor with the start locked to now, forcing the admin to pick a
    // fresh end date (the stale one trips the end-before-start rule) first.
    if (batch.endDate <= nowInputValue()) {
      this.retrievingBatch.set(batch);
      this.buildActiveForm(batch);
      this.activeForm.get('startDate')!.setValue(nowInputValue());
      this.activeForm.get('startDate')!.disable({ emitEvent: false });
      this.isEditingActive.set(true);
      this.feedback.set({
        type: 'error',
        text: 'This batch already ended — set a new end date (and stage windows) before starting it.',
      });
      return;
    }

    const now = new Date().toISOString();
    const { endedAt: _removed, ...rest } = batch as BatchSitting & { endedAt?: string };
    const retrieved: BatchSitting = {
      ...rest,
      status: 'active',
      startDate: nowInputValue(),
      updatedAt: now,
    };
    this.isSaving.set(true);
    this.svc
      .activateNow(retrieved)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (saved) => {
          this.activeBatch.set(saved);
          this.historyBatches.update((list) => list.filter((b) => b.id !== batch.id));
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

  hasBatchNameTaken(form: FormGroup): boolean {
    const c = form.get('batchName');
    return !!c?.errors?.['batchNameTaken'] && !!c?.touched;
  }

  hasActiveStartTooSoon(form: FormGroup): boolean {
    const c = form.get('startDate');
    return !!c?.errors?.['activeStartTooSoon'] && !!c?.touched;
  }

  hasPlannedStartTooSoon(form: FormGroup): boolean {
    const c = form.get('startDate');
    return !!c?.errors?.['plannedStartTooSoon'] && !!c?.touched;
  }

  /** True once either date has been touched — the timeline errors are group-level, so we gate on the date fields the user actually edits. */
  private timelineTouched(form: FormGroup): boolean {
    return !!(form.get('startDate')?.touched || form.get('endDate')?.touched);
  }

  hasBatchOverlap(form: FormGroup): boolean {
    return !!form.errors?.['batchOverlap'] && this.timelineTouched(form);
  }

  hasBatchGapTooSmall(form: FormGroup): boolean {
    return !!form.errors?.['batchGapTooSmall'] && this.timelineTouched(form);
  }

  hasStageErr(form: FormGroup, key: WorkflowStageKey, err: string): boolean {
    const g = form.get('stages')!.get(key) as FormGroup;
    return !!g.errors?.[err] && !!(g.get('startDate')?.touched || g.get('endDate')?.touched);
  }

  stageGroup(form: FormGroup, key: WorkflowStageKey): FormGroup {
    return form.get('stages')!.get(key) as FormGroup;
  }

  /** Open native date/time picker via icon click. */
  openDatePicker(event: MouseEvent): void {
    const wrap = (event.currentTarget as HTMLElement).closest('.date-input-wrap');
    const input = wrap?.querySelector('input[type="datetime-local"]') as HTMLInputElement | null;
    try {
      input?.showPicker();
    } catch {
      /* browser may not support */
    }
  }

  fmt(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * The feedback banner renders at the top of the card while Save sits below a
   * long stage table — without this, a validation error banner can render
   * entirely out of the user's current scroll position, making it look like
   * clicking Save did nothing.
   */
  private scrollToFeedback(): void {
    setTimeout(() => {
      this.feedbackBannerRef?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
}




