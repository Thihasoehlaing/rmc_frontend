import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableSortService, SortDirection } from '../../../shared/services/table-sort.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { finalize } from 'rxjs';
import {
  SkeletonColumn,
  TableSkeletonComponent,
} from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [
    TableActionIconComponent,
    SubmissionsSearchComponent,
    TableSkeletonComponent,
    DataTableComponent,
  ],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.scss',
  providers: [TableSortService],
})
export class DraftsComponent implements OnInit {
  private appSvc = inject(ApplicationService);
  private router = inject(Router);
  private tableSort = inject(TableSortService);

  private raw = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  sortColumn = signal<string | null>(null);
  sortDirection = signal<SortDirection>(null);

  readonly skeletonColumns: SkeletonColumn[] = [
    { width: '55%' },
    { width: '25%' },
    { width: 'var(--size-table-column-actions)' },
  ];
  readonly columns: DataTableColumn[] = [
    { key: 'title', label: 'Project Title', width: '55%' },
    { key: 'lastSaved', label: 'Last Saved', width: '25%', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly drafts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.raw()
      .filter((app) => app.isDraft === true)
      .filter((app) => !query || this.appSvc.getTitle(app).toLowerCase().includes(query));
    if (!this.sortDirection()) return items;
    return [...items].sort((a, b) => {
      const difference =
        new Date(this.appSvc.getSavedAt(a) ?? 0).getTime() -
        new Date(this.appSvc.getSavedAt(b) ?? 0).getTime();
      return this.sortDirection() === 'asc' ? difference : -difference;
    });
  });

  ngOnInit(): void {
    this.appSvc
      .getMyApplications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (apps) => this.raw.set(apps),
        error: () =>
          this.error.set('Could not reach the JSON server. Make sure `npm run db` is running.'),
      });
  }

  onSortChange(column: string): void {
    const next = this.tableSort.getNextState(
      { column: this.sortColumn(), direction: this.sortDirection() },
      column,
    );
    this.sortColumn.set(next.column);
    this.sortDirection.set(next.direction);
  }
  openDraft(app: any): void {
    this.router.navigate([this.appSvc.getFormRoute(app)], { queryParams: { id: app.id } });
  }
  formatDate(app: any): string {
    return this.appSvc.formatDate(this.appSvc.getSavedAt(app));
  }
}
