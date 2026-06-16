import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService, TERMINAL_STATUSES } from '../../../core/services/application.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [RouterLink, SubmissionsSearchComponent],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.scss',
})
export class PendingComponent implements OnInit {
  private appSvc = inject(ApplicationService);

  private raw    = signal<any[]>([]);
  loading        = signal(true);
  error          = signal<string | null>(null);

  searchQuery    = signal('');
  sortAsc        = signal(false);

  /** Filter by application type ('all' = no filter). */
  selectedType   = signal<string>('all');

  // ── Available form types derived from loaded data ────────────────
  readonly availableTypes = computed(() => {
    const types = new Set(
      this.raw()
        .filter(app => {
          if (app.isDraft === true) return false;
          const status = this.appSvc.getStatus(app);
          return !TERMINAL_STATUSES.has(status) && status !== 'fill_application';
        })
        .map(a => a.formType ?? '')
        .filter(Boolean)
    );
    return ['all', ...Array.from(types).sort()];
  });

  // ── Derived list ────────────────────────────────────────────────
  readonly pending = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();

    const items = this.raw()
      .filter(app => {
        if (app.isDraft === true) return false;
        const status = this.appSvc.getStatus(app);
        if (TERMINAL_STATUSES.has(status)) return false;
        if (status === 'fill_application') return false;
        
        // Exclude applications that currently require action from the applicant -> they belong in Inbox
        const nextRoles: string[] = app.workflow?.nextRoles ?? [];
        if (nextRoles.includes('Applicant')) return false;

        if (type !== 'all' && (app.formType ?? '') !== type) return false;
        return true;
      })
      .filter(app => !q || this.appSvc.getTitle(app).toLowerCase().includes(q));

    return [...items].sort((a, b) => {
      const ta = new Date(this.appSvc.getSubmittedAt(a) ?? 0).getTime();
      const tb = new Date(this.appSvc.getSubmittedAt(b) ?? 0).getTime();
      return this.sortAsc() ? ta - tb : tb - ta;
    });
  });

  ngOnInit(): void {
    this.appSvc.getMyApplications().subscribe({
      next: apps => { this.raw.set(apps); this.loading.set(false); },
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        this.loading.set(false);
      },
    });
  }

  toggleSort(): void { this.sortAsc.update(v => !v); }

  getStatusLabel(app: any): string { return this.appSvc.getStatusLabel(app); }
  getStatusColor(app: any): string { return this.appSvc.getStatusColor(app); }
  getFormTypeLabel(app: any): string { return this.appSvc.getFormTypeLabel(app); }
  getFormRoute(app: any): string { return this.appSvc.getFormRoute(app); }

  getNextActors(app: any): string {
    const roles: string[] = app.workflow?.nextRoles ?? [];
    return roles.length ? roles.join(', ') : '—';
  }

  formatSubmitted(app: any): string {
    return this.appSvc.formatDate(this.appSvc.getSubmittedAt(app));
  }

  isRevisionRequired(app: any): boolean {
    return this.appSvc.getStatus(app).startsWith('pending_applicant_resubmission');
  }
}
