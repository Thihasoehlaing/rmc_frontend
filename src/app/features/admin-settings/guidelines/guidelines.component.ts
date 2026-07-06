import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  AddGuidelineModalComponent,
  GuidelineConfig,
} from './add-guideline-modal/add-guideline-modal.component';
import { GuidelineApi, GuidelinePayload, GuidelinesService } from './guidelines.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { GuidelinesModalComponent } from '../../../shared/components/guidelines-modal/guidelines-modal.component';
import { nextTableSortState, SortDirection } from '../../../shared/services/table-sort.service';
import { SvgIconComponent } from '../../../shared/components/svg-icon/svg-icon.component';
import { SVG_ICON_TRASH } from '../../../shared/icons/svg-icons';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { SkeletonColumn } from '../../../shared/components/table-skeleton/table-skeleton.component';

interface Guideline {
  id: number;
  formId: number;
  form: string;
  formCode: string;
  title: string;
  isActive: boolean;
  lastUpdated: string;
  createdBy: string;
}

type GuidelineSortKey = 'form' | 'title' | 'lastUpdated' | 'createdBy';

@Component({
  selector: 'app-guidelines',
  standalone: true,
  imports: [
    TableActionIconComponent,
    SubmissionsSearchComponent,
    CommonModule,
    FormsModule,
    AddGuidelineModalComponent,
    DataTableComponent,
    PaginationComponent,
    DialogComponent,
    SvgIconComponent,
    GuidelinesModalComponent,
  ],
  templateUrl: './guidelines.component.html',
  styleUrls: ['./guidelines.component.scss'],
})
export class GuidelinesComponent implements OnInit {
  readonly trashIcon = SVG_ICON_TRASH;

  private readonly guidelinesService = inject(GuidelinesService);

  readonly searchTerm = signal('');
  readonly selectedStatus = signal('');
  readonly sortBy = signal<GuidelineSortKey | null>(null);
  readonly sortDirection = signal<SortDirection>(null);
  readonly showAddModal = signal(false);
  readonly editingGuidelineId = signal<number | null>(null);
  readonly editingConfig = signal<GuidelineConfig | null>(null);
  readonly guidelinePage = signal(1);
  readonly guidelinePageSize = signal(5);
  readonly guidelinePageSizeOptions = [5, 10, 15, 30, 50];
  readonly guidelines = signal<Guideline[]>([]);
  readonly totalGuidelines = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadingGuidelineId = signal<number | null>(null);
  readonly loadFailed = signal(false);
  readonly guidelineToDelete = signal<Guideline | null>(null);

  @ViewChild('viewModal') viewModal?: GuidelinesModalComponent;

  readonly skeletonRows = [0, 1, 2, 3, 4];
  readonly skeletonColumns: readonly SkeletonColumn[] = [
    { width: '80px' },
    { width: '180px' },
    { width: '32%' },
    { width: '120px' },
    { width: '140px' },
    { width: '160px' },
    { width: '132px' },
  ];
  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '80px', align: 'center' },
    { key: 'form', label: 'Form', width: '180px', sortable: true },
    { key: 'title', label: 'Guideline Title', width: '32%', sortable: true },
    { key: 'status', label: 'Status', width: '132px', align: 'center', headerAlign: 'center' },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      width: '140px',
      sortable: true,
    },
    {
      key: 'createdBy',
      label: 'Created By',
      width: '160px',
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '132px',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as Guideline).id;

  ngOnInit(): void {
    this.loadGuidelines();
  }

  loadGuidelines(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.guidelinesService
      .list({
        page: this.guidelinePage(),
        perPage: this.guidelinePageSize(),
        search: this.searchTerm(),
        status: this.selectedStatus(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          const totalPages = Math.max(1, pagination.total_pages);

          if (pagination.total_pages > 0 && this.guidelinePage() > pagination.total_pages) {
            this.guidelinePage.set(pagination.total_pages);
            this.loadGuidelines();
            return;
          }

          this.guidelines.set(response.data.items.map((item) => this.toRow(item)));
          this.totalGuidelines.set(pagination.total_items);
          this.totalPages.set(totalPages);
        },
        error: () => {
          this.guidelines.set([]);
          this.totalGuidelines.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  displayedGuidelines(): Guideline[] {
    const sortKey = this.sortBy();
    const sortDirection = this.sortDirection();
    if (!sortKey || !sortDirection) return this.guidelines();
    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...this.guidelines()].sort(
      (first, second) => this.compareGuidelines(first, second, sortKey) * direction,
    );
  }

  guidelineTotalPages(): number {
    return this.totalPages();
  }

  guidelinePageStart(): number {
    if (this.totalGuidelines() === 0) return 0;
    return (this.guidelinePage() - 1) * this.guidelinePageSize() + 1;
  }

  guidelinePageEnd(): number {
    return Math.min(
      this.guidelinePageStart() + this.guidelines().length - 1,
      this.totalGuidelines(),
    );
  }

  rowNumber(index: number): number {
    return (this.guidelinePage() - 1) * this.guidelinePageSize() + index + 1;
  }

  onGuidelineSearchChange(value: string): void {
    this.searchTerm.set(value.trim());
    this.guidelinePage.set(1);
    this.loadGuidelines();
  }

  resetGuidelineFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.guidelinePage.set(1);
    this.loadGuidelines();
  }

  onGuidelineStatusChange(value: string): void {
    this.selectedStatus.set(value);
    this.guidelinePage.set(1);
    this.loadGuidelines();
  }

  onGuidelinePageChange(page: number): void {
    if (page === this.guidelinePage()) return;
    this.guidelinePage.set(page);
    this.loadGuidelines();
  }

  onGuidelinePageSizeChange(pageSize: number): void {
    this.guidelinePageSize.set(pageSize);
    this.guidelinePage.set(1);
    this.loadGuidelines();
  }

  onSortChange(columnKey: string): void {
    const next = nextTableSortState(
      { column: this.sortBy(), direction: this.sortDirection() },
      columnKey,
    );
    this.sortBy.set(next.column as GuidelineSortKey | null);
    this.sortDirection.set(next.direction);
  }

  addGuideline(): void {
    this.editingGuidelineId.set(null);
    this.editingConfig.set(null);
    this.showAddModal.set(true);
  }

  closeModal(): void {
    this.showAddModal.set(false);
    this.editingGuidelineId.set(null);
    this.editingConfig.set(null);
  }

  saveGuideline(config: GuidelineConfig): void {
    if (this.isSaving()) return;

    const editingId = this.editingGuidelineId();
    const payload = this.toPayload(config);
    const request = editingId
      ? this.guidelinesService.update(editingId, payload)
      : this.guidelinesService.create(payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.closeModal();
        this.loadGuidelines();
      },
    });
  }

  openDeleteDialog(guideline: Guideline): void {
    this.guidelineToDelete.set(guideline);
  }

  closeDeleteDialog(): void {
    this.guidelineToDelete.set(null);
  }

  confirmDelete(): void {
    const guideline = this.guidelineToDelete();
    if (!guideline || this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(guideline.id);
    this.guidelinesService
      .delete(guideline.id)
      .pipe(
        finalize(() => {
          this.loadingGuidelineId.set(null);
          this.guidelineToDelete.set(null);
        }),
      )
      .subscribe({
        next: () => {
          if (this.guidelines().length === 1 && this.guidelinePage() > 1) {
            this.guidelinePage.update((page) => page - 1);
          }
          this.loadGuidelines();
        },
      });
  }

  editGuideline(id: number): void {
    if (this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(id);
    this.guidelinesService
      .get(id)
      .pipe(finalize(() => this.loadingGuidelineId.set(null)))
      .subscribe({
        next: (response) => {
          this.editingGuidelineId.set(id);
          this.editingConfig.set(this.toConfig(response.data));
          this.showAddModal.set(true);
        },
      });
  }

  /**
   * List rows omit content_html to keep the payload small, so viewing fetches
   * the full record. The modal's title/content are set directly on its
   * public signals/property rather than through @Input bindings, since
   * setting a signal and calling open() in the same tick would otherwise
   * read the modal's stale @Input value (Angular hasn't re-rendered yet).
   */
  viewGuideline(guideline: Guideline): void {
    if (this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(guideline.id);
    this.guidelinesService
      .get(guideline.id)
      .pipe(finalize(() => this.loadingGuidelineId.set(null)))
      .subscribe({
        next: (response) => {
          if (!this.viewModal) return;
          this.viewModal.title = response.data.title || guideline.title;
          this.viewModal.content.set(response.data.content_html || '<p>No content provided.</p>');
          this.viewModal.isOpen.set(true);
        },
      });
  }

  private toRow(item: GuidelineApi): Guideline {
    return {
      id: item.id,
      formId: item.form_id,
      form: item.form_name || item.form_code || 'Unknown form',
      formCode: item.form_code || '',
      title: item.title || 'Untitled Guideline',
      isActive: item.is_active,
      lastUpdated: this.formatDisplayDate(item.updated_at || item.created_at),
      createdBy: item.created_by || 'Unknown',
    };
  }

  private toConfig(item: GuidelineApi): GuidelineConfig {
    return {
      title: item.title || '',
      formId: item.form_id,
      contentHtml: item.content_html ?? '',
    };
  }

  /**
   * is_active is deliberately omitted here: the backend's PUT is a partial
   * update, and this payload is shared by both create and edit. Sending
   * is_active: true on every edit would silently reactivate a guideline the
   * admin had deliberately deactivated just by editing its title/content.
   */
  private toPayload(config: GuidelineConfig): GuidelinePayload {
    return {
      form_id: config.formId!,
      title: config.title.trim(),
      content_html: config.contentHtml,
    };
  }

  private compareGuidelines(
    first: Guideline,
    second: Guideline,
    sortKey: GuidelineSortKey,
  ): number {
    if (sortKey === 'lastUpdated') {
      return this.parseDisplayDate(first.lastUpdated) - this.parseDisplayDate(second.lastUpdated);
    }

    return first[sortKey].localeCompare(second[sortKey]);
  }

  private formatDisplayDate(dateValue: string | null): string {
    if (!dateValue) return '-';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private parseDisplayDate(dateValue: string): number {
    const [day, month, year] = dateValue.split('/').map(Number);
    return day && month && year ? new Date(year, month - 1, day).getTime() : 0;
  }
}


