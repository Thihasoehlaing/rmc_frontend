import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationService, TERMINAL_STATUSES } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { SubmissionsSearchComponent } from '../../shared/components/submissions-search/submissions-search.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, NgClass, SubmissionsSearchComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private appSvc = inject(ApplicationService);
  private auth   = inject(AuthService);

  private raw    = signal<any[]>([]);
  loading        = signal(true);
  error          = signal<string | null>(null);

  searchQuery    = signal('');
  sortAsc        = signal(false);

  /** Filter by application type ('all' = no filter). */
  selectedType   = signal<string>('all');

  private readonly currentUserName = this.auth.currentUser()?.name ?? '';
  private readonly currentUserId   = this.auth.currentUser()?.id   ?? '';

  // ── Available form types derived from loaded data ────────────────
  readonly availableTypes = computed(() => {
    const types = new Set(
      this.raw()
        .map(a => a.formType ?? '')
        .filter(Boolean)
    );
    return ['all', ...Array.from(types).sort()];
  });

  // ── Derived list ─────────────────────────────────────────────────
  readonly history = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();

    const items = this.raw()
      .filter(app => type === 'all' || (app.formType ?? '') === type)
      .filter(app => !q || this.appSvc.getTitle(app).toLowerCase().includes(q));

    return [...items].sort((a, b) => {
      const ta = this.resolvedDate(a);
      const tb = this.resolvedDate(b);
      return this.sortAsc() ? ta - tb : tb - ta;
    });
  });

  /** Epoch ms for sorting — uses decision date for applicants, action date for reviewers. */
  private resolvedDate(app: any): number {
    if (this.isApplicant(app)) {
      // Sort by when the final decision was recorded (last history entry).
      const entries: any[] = app.workflow?.history ?? [];
      return entries.length
        ? new Date(entries[entries.length - 1].timestamp).getTime()
        : 0;
    }
    const action = this.appSvc.getUserAction(app, this.currentUserName);
    return action ? new Date(action.timestamp).getTime() : 0;
  }

  ngOnInit(): void {
    this.appSvc.getApplicationHistory().subscribe({
      next: apps => { this.raw.set(apps); this.loading.set(false); },
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        this.loading.set(false);
      },
    });
  }

  toggleSort(): void { this.sortAsc.update(v => !v); }

  // ── Per-row helpers ──────────────────────────────────────────────

  /**
   * Returns true when the current user is the applicant (creator) of this
   * specific application. Used to choose the applicant vs reviewer display path.
   */
  isApplicant(app: any): boolean {
    return (
      app.metadata?.applicantUserId === this.currentUserId ||
      (app.teamDetails?.leaderName ?? '') === this.currentUserName
    );
  }

  /** The action entry this reviewer took on this application. */
  myAction(app: any): { action: string; timestamp: string; role: string } | null {
    return this.appSvc.getUserAction(app, this.currentUserName);
  }

  /**
   * Display label for the "Action / Decision" column.
   *  – Reviewer : their specific action (Approved, Rejected, Forwarded…)
   *  – Applicant : the final outcome (Approved / Rejected)
   */
  getActionLabel(app: any): string {
    if (this.isApplicant(app)) {
      return this.getFinalDecision(app);
    }
    const a = this.myAction(app);
    if (!a) return '—';
    return a.action.charAt(0).toUpperCase() + a.action.slice(1).replace(/_/g, ' ');
  }

  /**
   * CSS modifier class for the action chip.
   *  approve → green   reject → red   others → neutral
   */
  getActionClass(app: any): string {
    const label = this.getActionLabel(app).toLowerCase();
    if (label === 'approved') return 'action-chip--approve';
    if (label === 'rejected') return 'action-chip--reject';
    if (label.startsWith('reject')) return 'action-chip--reject';
    if (label === 'approve' || label === 'submit') return 'action-chip--approve';
    return 'action-chip--neutral';
  }

  /**
   * Role label for the "Role" column.
   *  – Reviewer : the role stored in their history entry
   *  – Applicant : "Applicant"
   */
  getRoleLabel(app: any): string {
    if (this.isApplicant(app)) return 'Applicant';
    return this.myAction(app)?.role ?? '—';
  }

  /** Final outcome for an applicant's terminal application. */
  private getFinalDecision(app: any): string {
    const status = this.appSvc.getStatus(app);
    if (status === 'approved') return 'Approved';
    if (status.startsWith('rejected_')) return 'Rejected';
    return '—';
  }

  /** Human-readable application type label. */
  getFormTypeLabel(app: any): string {
    return this.appSvc.getFormTypeLabel(app);
  }

  /** Angular route for opening the application form. */
  getFormRoute(app: any): string {
    return this.appSvc.getFormRoute(app);
  }

  /**
   * Formatted date for the "Date" column.
   *  – Reviewer : date they took their action
   *  – Applicant : date of the final decision (last workflow history entry)
   */
  formatDate(app: any): string {
    if (this.isApplicant(app)) {
      const entries: any[] = app.workflow?.history ?? [];
      const last = entries.length ? entries[entries.length - 1] : null;
      return last ? this.appSvc.formatDate(last.timestamp) : '—';
    }
    const a = this.myAction(app);
    return a ? this.appSvc.formatDate(a.timestamp) : '—';
  }

  /** Submitted-by name (who created this application). */
  getSubmittedBy(app: any): string {
    return app.teamDetails?.leaderName ?? '—';
  }
}

