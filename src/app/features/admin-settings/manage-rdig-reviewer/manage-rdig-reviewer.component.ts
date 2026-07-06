import { ChangeDetectionStrategy, Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { NoEntryFoundComponent } from '../../../shared/components/no-entry-found/no-entry-found.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import {
  AcademicStaffRecord,
  AcademicStaffService,
  DepartmentRecord,
} from '../../settings/academic-staff/academic-staff.service';
import { RdigReviewerService } from './rdig-reviewer.service';

type PoolStatusFilter = 'all' | 'in-pool' | 'not-in-pool';

interface StaffRow {
  academicStaffId: number;
  name: string;
  username: string;
  department: string;
  role: string;
  email: string;
  initials: string;
  /** Set once cross-referenced against the reviewer pool; null while loading. */
  reviewerId: number | null;
}

@Component({
  selector: 'app-manage-rdig-reviewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DataTableComponent,
    FormsModule,
    SearchableDropdownComponent,
    SubmissionsSearchComponent,
    PaginationComponent,
    NoEntryFoundComponent,
  ],
  templateUrl: './manage-rdig-reviewer.component.html',
  styleUrl: './manage-rdig-reviewer.component.scss',
})
export class ManageRdigReviewerComponent implements OnInit {
  private readonly academicStaffService = inject(AcademicStaffService);
  private readonly rdigReviewerService = inject(RdigReviewerService);
  private readonly toast = inject(ToastService);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'name', label: 'Staff Name', width: '20rem' },
    { key: 'username', label: 'Staff ID', width: '8rem' },
    { key: 'department', label: 'Department', width: '12rem' },
    { key: 'role', label: 'Role', width: '13rem' },
    { key: 'email', label: 'Email', width: '17rem' },
    { key: 'status', label: 'Reviewer Pool', width: '9rem', align: 'center', headerAlign: 'center' },
    { key: 'actions', label: 'Actions', width: '9rem', align: 'center', headerAlign: 'center' },
  ];

  readonly staffRows = signal<StaffRow[]>([]);
  readonly loading = signal(false);
  /** rdig_reviewer_id keyed by staff username — built from the reviewer pool list. */
  private readonly reviewerIdByUsername = signal<Map<string, number>>(new Map());

  readonly departments = signal<DepartmentRecord[]>([]);
  readonly departmentOptions = signal<DropdownOption<number>[]>([]);

  readonly nameFilter = signal('');
  readonly emailFilter = signal('');
  readonly departmentFilter = signal<number | null>(null);
  /** Filters across ALL staff, not just the current page — see loadStaff() for how each mode is fetched. */
  readonly poolStatusFilter = signal<PoolStatusFilter>('all');

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 25, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly rowTrackFn: TrackByFunction<StaffRow> = (_index, row) => row.academicStaffId;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadReviewerPool();
    this.loadStaff();
  }

  private loadDepartments(): void {
    this.academicStaffService.listDepartments().subscribe({
      next: (res) => {
        if (res.success) {
          this.departments.set(res.data ?? []);
          this.departmentOptions.set(
            (res.data ?? []).map((d) => ({ value: d.id, label: d.department_name })),
          );
        }
      },
      error: () => this.departments.set([]),
    });
  }

  /** Loads the full reviewer pool once so membership can be cross-referenced against staff rows. */
  private loadReviewerPool(): void {
    this.rdigReviewerService.list({ perPage: 100, status: 'all' }).subscribe({
      next: (res) => {
        if (!res.success) return;
        const map = new Map<string, number>();
        for (const reviewer of res.data.items ?? []) {
          if (reviewer.staff_username) {
            map.set(reviewer.staff_username, reviewer.id);
          }
        }
        this.reviewerIdByUsername.set(map);
        this.applyReviewerMapToRows();
      },
      error: () => this.reviewerIdByUsername.set(new Map()),
    });
  }

  private applyReviewerMapToRows(): void {
    const map = this.reviewerIdByUsername();
    this.staffRows.update((rows) =>
      rows.map((row) => ({ ...row, reviewerId: map.get(row.username) ?? null })),
    );
  }

  /**
   * Routes to the right data source for the active reviewer-pool filter.
   * The academic-staff endpoint has no "is a reviewer" query param, so a true
   * global filter (not just the current page) needs a different strategy per case:
   * - "all": normal server-paginated academic-staff list.
   * - "in-pool": query the reviewer endpoint directly — it already supports
   *   real pagination/search/department filtering, and every row is by
   *   definition in the pool.
   * - "not-in-pool": no endpoint for this exists, so every matching page of
   *   academic staff is fetched, reviewers are subtracted, and the result is
   *   paginated client-side.
   */
  loadStaff(): void {
    switch (this.poolStatusFilter()) {
      case 'in-pool':
        this.loadInPoolReviewers();
        break;
      case 'not-in-pool':
        this.loadNotInPoolStaff();
        break;
      default:
        this.loadAllStaffPaged();
    }
  }

  private loadAllStaffPaged(): void {
    this.loading.set(true);
    this.academicStaffService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        name: this.nameFilter(),
        email: this.emailFilter(),
        departmentId: this.departmentFilter(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res.success) return;
          const map = this.reviewerIdByUsername();
          this.staffRows.set((res.data.items ?? []).map((item) => this.toRow(item, map)));
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(Math.max(1, res.data.pagination.total_pages));
        },
        error: () => {
          this.loading.set(false);
          this.staffRows.set([]);
          this.toast.error('Failed to load academic staff.');
        },
      });
  }

  /** Reviewer endpoint already supports real pagination/search/department — use it directly. */
  private loadInPoolReviewers(): void {
    this.loading.set(true);
    const search = this.nameFilter().trim() || this.emailFilter().trim() || undefined;
    this.rdigReviewerService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search,
        departmentId: this.departmentFilter(),
        status: 'all',
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res.success) return;
          this.staffRows.set(
            (res.data.items ?? []).map((r) => ({
              // Not needed here — every row in this view already has a reviewerId,
              // so only "Remove" is ever shown, which doesn't need academic_staff_id.
              academicStaffId: -1,
              name: r.staff_fullname || r.staff_username || '',
              username: r.staff_username || '',
              department: r.department || '',
              role: r.job_title || '',
              email: r.staff_email || '',
              initials: this.getInitials(r.staff_fullname || r.staff_username || ''),
              reviewerId: r.id,
            })),
          );
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(Math.max(1, res.data.pagination.total_pages));
        },
        error: () => {
          this.loading.set(false);
          this.staffRows.set([]);
          this.toast.error('Failed to load the reviewer pool.');
        },
      });
  }

  /** No "not a reviewer" endpoint exists — fetch every matching staff page, subtract reviewers, paginate client-side. */
  private loadNotInPoolStaff(): void {
    this.loading.set(true);
    this.fetchAllStaffPages().subscribe({
      next: (items) => {
        this.loading.set(false);
        const map = this.reviewerIdByUsername();
        const rows = items.map((item) => this.toRow(item, map)).filter((row) => row.reviewerId === null);
        this.totalItems.set(rows.length);
        this.totalPages.set(Math.max(1, Math.ceil(rows.length / this.pageSize())));
        const start = (this.page() - 1) * this.pageSize();
        this.staffRows.set(rows.slice(start, start + this.pageSize()));
      },
      error: () => {
        this.loading.set(false);
        this.staffRows.set([]);
        this.toast.error('Failed to load academic staff.');
      },
    });
  }

  /** Fetches every backend page matching the current name/email/department filters. */
  private fetchAllStaffPages(): Observable<AcademicStaffRecord[]> {
    const MAX_PAGE_SIZE = 100;
    const baseParams = {
      name: this.nameFilter(),
      email: this.emailFilter(),
      departmentId: this.departmentFilter(),
    };
    return this.academicStaffService.list({ page: 1, perPage: MAX_PAGE_SIZE, ...baseParams }).pipe(
      switchMap((first) => {
        if (!first.success) return of([] as AcademicStaffRecord[]);
        const items = first.data.items ?? [];
        const totalPages = first.data.pagination.total_pages;
        if (totalPages <= 1) return of(items);

        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        return forkJoin(
          remainingPages.map((page) =>
            this.academicStaffService.list({ page, perPage: MAX_PAGE_SIZE, ...baseParams }).pipe(
              map((res) => (res.success ? res.data.items ?? [] : [])),
              catchError(() => of([] as AcademicStaffRecord[])),
            ),
          ),
        ).pipe(map((arrays) => [...items, ...arrays.flat()]));
      }),
      catchError(() => of([] as AcademicStaffRecord[])),
    );
  }

  private toRow(item: AcademicStaffRecord, reviewerMap: Map<string, number>): StaffRow {
    const staff = item.staff ?? {};
    const fullname = staff.fullname ?? item.fullname ?? '';
    const username = staff.username ?? item.username ?? '';
    return {
      academicStaffId: item.id,
      name: fullname || username,
      username,
      department: staff.department ?? item.department ?? '',
      role: staff.job_title ?? item.job_title ?? '',
      email: staff.email ?? item.email ?? '',
      initials: this.getInitials(fullname || username),
      reviewerId: reviewerMap.get(username) ?? null,
    };
  }

  private getInitials(value: string): string {
    if (!value) return '--';
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Department changes take effect immediately — no need to click Search. */
  setDepartmentFilter(value: number | null): void {
    this.departmentFilter.set(value);
    this.page.set(1);
    this.loadStaff();
  }

  /** Reviewer-pool changes take effect immediately, same as department. */
  setPoolStatusFilter(value: string): void {
    if (value === 'in-pool' || value === 'not-in-pool' || value === 'all') {
      this.poolStatusFilter.set(value);
      this.page.set(1);
      this.loadStaff();
    }
  }

  resetFilters(): void {
    this.nameFilter.set('');
    this.emailFilter.set('');
    this.departmentFilter.set(null);
    this.poolStatusFilter.set('all');
    this.page.set(1);
    this.loadStaff();
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadStaff();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadStaff();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadStaff();
  }

  /**
   * When a pool filter is active, a mutation can move the row out of view
   * entirely (e.g. removing a reviewer while viewing "In Pool"), so the whole
   * view is re-fetched. With no filter, a cheap in-place patch is enough.
   */
  private refreshAfterMutation(): void {
    if (this.poolStatusFilter() === 'all') {
      this.applyReviewerMapToRows();
    } else {
      this.loadStaff();
    }
  }

  /** Adds a staff member to the RDIG reviewer pool. */
  addReviewer(row: StaffRow): void {
    this.rdigReviewerService.add(row.academicStaffId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.toast.error(res.message ?? 'Could not add reviewer.');
          return;
        }
        this.reviewerIdByUsername.update((map) => {
          const next = new Map(map);
          next.set(row.username, res.data.id);
          return next;
        });
        this.refreshAfterMutation();
        this.toast.success(`${row.name} added to the reviewer pool.`);
      },
      error: (err) => this.showError(err, 'Could not add reviewer.'),
    });
  }

  /** Removes a staff member from the RDIG reviewer pool. */
  removeReviewer(row: StaffRow): void {
    if (row.reviewerId === null) return;
    this.rdigReviewerService.remove(row.reviewerId).subscribe({
      next: () => {
        this.reviewerIdByUsername.update((map) => {
          const next = new Map(map);
          next.delete(row.username);
          return next;
        });
        this.refreshAfterMutation();
        this.toast.success(`${row.name} removed from the reviewer pool.`);
      },
      error: (err) => this.showError(err, 'Could not remove reviewer.'),
    });
  }

  private showError(err: unknown, fallback: string): void {
    const message = (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.toast.error(message);
  }
}
