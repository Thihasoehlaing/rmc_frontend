import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from '../../services/application.service';        
import { BatchSittingService } from '../../settings/batch-sitting.service';     
import { BatchSitting } from '../../interfaces/batch-sitting.interface';        
import { SubmissionsSearchComponent } from '../../shared/components/submissions-search/submissions-search.component';

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [SubmissionsSearchComponent],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.scss',
})
export class DraftsComponent implements OnInit {
  private appSvc    = inject(ApplicationService);
  private batchSvc  = inject(BatchSittingService);
  private router    = inject(Router);

  private raw       = signal<any[]>([]);
  activeBatch       = signal<BatchSitting | null>(null);
  loading           = signal(true);
  error             = signal<string | null>(null);

  searchQuery       = signal('');
  sortAsc           = signal(false); // newest first by default

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

  readonly hasBatch = computed(() => this.activeBatch() !== null);

  ngOnInit(): void {
    this.batchSvc.loadAll().subscribe({
      next: batches => this.activeBatch.set(batches.find(b => b.status === 'active') ?? null),
      error: () => this.activeBatch.set(null),
    });

    this.appSvc.getMyApplications().subscribe({
      next: apps => { this.raw.set(apps); this.loading.set(false); },
      error: () => {
        this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.');
        this.loading.set(false);
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
