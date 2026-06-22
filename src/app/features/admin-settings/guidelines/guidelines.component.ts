import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  AddGuidelineModalComponent,
  BlockType,
  GuidelineConfig,
} from './add-guideline-modal/add-guideline-modal.component';
import { GuidelineApi, GuidelinePayload, GuidelinesService } from './guidelines.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { nextTableSortState, SortDirection } from '../../../shared/services/table-sort.service';
import { SvgIconComponent } from '../../../shared/components/svg-icon/svg-icon.component';
import { SVG_ICON_TRASH } from '../../../shared/icons/svg-icons';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';

interface Guideline {
  id: number;
  form: string;
  formCode: string;
  title: string;
  isActive: boolean;
  blockCount: number;
  lastUpdated: string;
  createdBy: string;
}

type GuidelineSortKey = 'form' | 'title' | 'blocks' | 'lastUpdated' | 'createdBy';

const FORM_LABELS: Record<string, string> = {
  CONFERENCE: 'Conference Application',
  JOURNAL: 'Journal Application',
  PARTNERSHIP: 'Partnership Application',
  RA_GRA: 'RA/GRA Application',
  RDIG: 'RDIG Application',
};

const FORM_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(FORM_LABELS).map(([code, label]) => [label, code]),
);

@Component({
  selector: 'app-guidelines',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    FormsModule,
    AddGuidelineModalComponent,
    DataTableComponent,
    PaginationComponent,
    DialogComponent,
    SvgIconComponent,
  ],
  templateUrl: './guidelines.component.html',
  styleUrls: ['./guidelines.component.scss'],
})
export class GuidelinesComponent implements OnInit, OnDestroy {
  readonly trashIcon = SVG_ICON_TRASH;

  private readonly guidelinesService = inject(GuidelinesService);
  private searchTimer?: ReturnType<typeof setTimeout>;

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
  readonly guidelineToDeactivate = signal<Guideline | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '80px', align: 'center' },
    { key: 'form', label: 'Form', width: '180px', sortable: true },
    { key: 'title', label: 'Guideline Title', sortable: true },
    { key: 'status', label: 'Status', width: '120px' },
    {
      key: 'blocks',
      label: 'Blocks',
      width: '120px',
      align: 'center',
      sortable: true,
    },
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
      width: '230px',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as Guideline).id;

  ngOnInit(): void {
    this.loadGuidelines();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
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
    this.searchTerm.set(value);
    this.guidelinePage.set(1);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => this.loadGuidelines(), 350);
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

  toggleGuidelineStatus(guideline: Guideline): void {
    if (this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(guideline.id);
    this.guidelinesService
      .updateStatus(guideline.id, !guideline.isActive)
      .pipe(finalize(() => this.loadingGuidelineId.set(null)))
      .subscribe({
        next: () => this.loadGuidelines(),
      });
  }

  openDeactivateDialog(guideline: Guideline): void {
    this.guidelineToDeactivate.set(guideline);
  }

  closeDeactivateDialog(): void {
    this.guidelineToDeactivate.set(null);
  }

  confirmDeactivate(): void {
    const guideline = this.guidelineToDeactivate();
    if (!guideline || this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(guideline.id);
    this.guidelinesService
      .updateStatus(guideline.id, false)
      .pipe(
        finalize(() => {
          this.loadingGuidelineId.set(null);
          this.guidelineToDeactivate.set(null);
        }),
      )
      .subscribe({
        next: () => this.loadGuidelines(),
      });
  }

  deleteGuideline(guideline: Guideline): void {
    const confirmed = window.confirm(`Delete "${guideline.title}"? This action cannot be undone.`);
    if (!confirmed || this.loadingGuidelineId() !== null) return;

    this.loadingGuidelineId.set(guideline.id);
    this.guidelinesService
      .delete(guideline.id)
      .pipe(finalize(() => this.loadingGuidelineId.set(null)))
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

  private toRow(item: GuidelineApi): Guideline {
    return {
      id: item.id,
      form: FORM_LABELS[item.form_code] ?? item.form_name ?? item.form_code,
      formCode: item.form_code,
      title: item.guideline_title || 'Untitled Guideline',
      isActive: item.is_active,
      blockCount: item.block_count,
      lastUpdated: this.formatDisplayDate(item.updated_at || item.created_at),
      createdBy: item.created_by || 'Unknown',
    };
  }

  private toConfig(item: GuidelineApi): GuidelineConfig {
    return {
      title: item.guideline_title || 'Guidelines',
      formName: FORM_LABELS[item.form_code] ?? item.form_name ?? item.form_code,
      backgroundToken: item.background_token || 'white',
      textToken: item.text_token || 'var(--color-text-primary)',
      buttonToken: item.button_token || 'var(--color-primary)',
      buttonText: item.button_text || 'Close',
      blocks: (item.blocks ?? []).map((block) => ({
        id: String(block.id),
        type: block.block_type as BlockType,
        content: block.block_content,
        styling: {
          bgToken: block.background_token ?? undefined,
          textToken: block.text_token ?? undefined,
          fontSizeToken: block.font_size_token ?? undefined,
          fontWeightToken: block.font_weight_token ?? undefined,
        },
      })),
    };
  }

  private toPayload(config: GuidelineConfig): GuidelinePayload {
    return {
      form_code: FORM_CODES[config.formName] ?? config.formName,
      guideline_title: config.title.trim(),
      button_text: config.buttonText.trim(),
      is_active: true,
      background_token: config.backgroundToken,
      text_token: config.textToken,
      button_token: config.buttonToken,
      blocks: config.blocks.map((block, index) => ({
        block_type: block.type,
        block_content: block.content.trim(),
        display_order: index + 1,
        background_token: block.styling?.bgToken || null,
        text_token: block.styling?.textToken || null,
        font_size_token: block.styling?.fontSizeToken || null,
        font_weight_token: block.styling?.fontWeightToken || null,
      })),
    };
  }

  private compareGuidelines(
    first: Guideline,
    second: Guideline,
    sortKey: GuidelineSortKey,
  ): number {
    if (sortKey === 'blocks') {
      return first.blockCount - second.blockCount;
    }

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
