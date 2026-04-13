import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../services/application.service';
import { BatchSittingService } from '../../settings/batch-sitting.service';
import { BatchSitting, WORKFLOW_STAGE_META } from '../../interfaces/batch-sitting.interface';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private batchSvc           = inject(BatchSittingService);

  private allApplications = signal<any[]>([]);
  activeBatch             = signal<BatchSitting | null>(null);
  loading                 = signal(true);
  error                   = signal<string | null>(null);

  /** Badge colour per workflow status */
  readonly statusColors: Record<string, string> = {
    fill_application:                         '#3b82f6',
    pending_applicant_resubmission_hos:       '#f59e0b',
    pending_applicant_resubmission_reviewers: '#f59e0b',
    pending_hos:                              '#a855f7',
    pending_hos_review:                       '#a855f7',
    rejected_hos:                             '#ef4444',
    pending_rmc:                              '#6366f1',
    pending_rmc_review:                       '#6366f1',
    rejected_rmc:                             '#ef4444',
    pending_reviewers:                        '#0ea5e9',
    pending_rdig_chair:                       '#10b981',
    rejected_rdig_chair:                      '#ef4444',
    pending_vc:                               '#14b8a6',
    rejected_vc:                              '#ef4444',
    pending_ceo:                              '#f97316',
    rejected_ceo:                             '#ef4444',
    approved:                                 '#22c55e',
  };

  /**
   * Applications filtered by batch stage date windows.
   * An application is visible only when today falls within the allowed time
   * window for its current workflow status (as configured in the active batch).
   * Applications with no matching stage window are always visible (no restriction).
   */
  readonly applications = computed(() => {
    const batch = this.activeBatch();
    const today = new Date().toISOString().substring(0, 10);

    return this.allApplications().filter(app => {
      if (!batch) return true;  // No batch config → no date restriction

      const status = this.getStatus(app);

      // Find the batch stage that governs this workflow status
      const stageMeta = WORKFLOW_STAGE_META.find(m => m.rdigStatuses.includes(status));
      if (!stageMeta) return true;  // Status not mapped to a stage → always visible

      const stageWindow = batch.stages[stageMeta.key];
      if (!stageWindow?.startDate || !stageWindow?.endDate) return true; // No window set → always visible

      return today >= stageWindow.startDate && today <= stageWindow.endDate;
    });
  });

  /** Days until the active batch endDate. Used to show deadline warning. */
  readonly batchDeadlineDays = computed((): number | null => {
    const batch = this.activeBatch();
    if (!batch) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(batch.endDate + 'T00:00:00');
    return Math.floor((end.getTime() - today.getTime()) / 86_400_000);
  });

  readonly showDeadlineWarning = computed(() => {
    const days = this.batchDeadlineDays();
    return days !== null && days >= 0 && days <= 5;
  });

  ngOnInit(): void {
    // Load active batch for date-window filtering
    this.batchSvc.loadAll().subscribe({
      next: batches => this.activeBatch.set(batches.find(b => b.status === 'active') ?? null),
      error: () => this.activeBatch.set(null),
    });

    // Filtering is done server-side for roles, then client-side for date windows.
    this.applicationService.getInboxApplications().subscribe({
      next: (apps) => {
        this.allApplications.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        this.loading.set(false);
      },
    });
  }

  getTitle(app: any): string {
    return app.projectDetails?.title?.trim() || '(Untitled Application)';
  }

  getStatus(app: any): string {
    return app.workflow?.currentStatus ?? app.metadata?.applicationStatus ?? 'unknown';
  }

  getStatusColor(app: any): string {
    return this.statusColors[this.getStatus(app)] ?? '#6b7280';
  }

  getSubmittedBy(app: any): string {
    return app.teamDetails?.leaderName ?? '—';
  }

  getLastAction(app: any): string {
    const history: any[] = app.workflow?.history ?? [];
    if (!history.length) return '—';
    const last = history[history.length - 1];
    return `${last.role}: ${last.action} (${new Date(last.timestamp).toLocaleDateString('en-GB')})`;
  }

  getNextActors(app: any): string {
    const roles: string[] = app.workflow?.nextRoles ?? [];
    return roles.length ? roles.join(', ') : '—';
  }

  getFormRoute(app: any): string {
    return this.applicationService.getFormRoute(app);
  }

  getFormTypeLabel(app: any): string {
    return this.applicationService.getFormTypeLabel(app);
  }
}
