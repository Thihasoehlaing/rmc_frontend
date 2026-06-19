import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { finalize } from 'rxjs';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [SubmissionsSearchComponent, TableSkeletonComponent],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.scss',
})
export class DraftsComponent implements OnInit {
  private appSvc = inject(ApplicationService);
  private router = inject(Router);

  private raw   = signal<any[]>([]);
  loading       = signal(true);
  error         = signal<string | null>(null);

  searchQuery = signal('');
  sortAsc     = signal(false); // newest first by default
  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '55%' },
    { width: '25%' },
    { width: 'var(--size-table-column-actions)' },
  ];

  // ── Derived list ────────────────────────────────────────────────
  readonly drafts = computed(() => {
    const q     = this.searchQuery().toLowerCase().trim();
    const items = this.raw()
      .filter(app => app.isDraft === true)
      .filter(app => !q || this.appSvc.getTitle(app).toLowerCase().includes(q));

    return [...items].sort((a, b) => {
      const ta = new Date(this.appSvc.getSavedAt(a) ?? 0).getTime();
      const tb = new Date(this.appSvc.getSavedAt(b) ?? 0).getTime();
      return this.sortAsc() ? ta - tb : tb - ta;
    });
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.appSvc.getMyApplications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
      next: apps => this.raw.set(apps),
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
      },
    });
  }

  openDraft(app: any): void {
    this.router.navigate([this.appSvc.getFormRoute(app)], { queryParams: { id: app.id } });
  }

  toggleSort(): void { this.sortAsc.update(v => !v); }

  formatDate(app: any): string {
    return this.appSvc.formatDate(this.appSvc.getSavedAt(app));
  }
}
