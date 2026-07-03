import {
  Component,
  ContentChild,
  Input,
  TemplateRef,
  TrackByFunction,
  Output,
  EventEmitter,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgTemplateOutlet } from '@angular/common';

type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: DataTableAlign;
  headerAlign?: DataTableAlign;
  sortable?: boolean;
}

export interface DataTableRowContext<T = unknown> {
  $implicit: T;
  row: T;
  index: number;
  columns: readonly DataTableColumn[];
}

export interface DataTableHeaderContext {
  column: DataTableColumn;
  index: number;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  @Input({ required: true }) columns: readonly DataTableColumn[] = [];
  @Input({ required: true }) rows: readonly unknown[] = [];
  @Input() rowTrackFn: TrackByFunction<unknown> = (index) => index;
  @Input() sortColumn: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' | null = null;
  @Input() showHeader = true;
  @Input() showSortIndicator = true;
  @Input() dense = false;
  @Input() hoverable = true;
  @Input() striped = true;
  @Input() pageSize: number | null = null;
  @Input() currentPage: number = 0;
  @Output() sortChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();

  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<DataTableRowContext<unknown>>;
  @ContentChild('headerTemplate') headerTemplate?: TemplateRef<DataTableHeaderContext>;
  /** Optional override for the "no rows" state. Falls back to the default "No entries added yet." message when not provided. */
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<void>;

  // Computed properties for pagination
  get displayRows(): readonly unknown[] {
    if (!this.pageSize || this.pageSize <= 0) {
      return this.rows;
    }
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.rows.slice(start, end);
  }

  get totalPages(): number {
    if (!this.pageSize || this.pageSize <= 0) {
      return 1;
    }
    return Math.ceil(this.rows.length / this.pageSize);
  }

  get hasPagination(): boolean {
    return this.pageSize !== null && this.pageSize > 0;
  }

  resolveValue(row: unknown, key: string): unknown {
    return (row as Record<string, unknown>)?.[key];
  }

  trackRow(index: number, row: unknown): unknown {
    return this.rowTrackFn(index, row);
  }

  headerAlign(column: DataTableColumn): DataTableAlign {
    return column.headerAlign || column.align || 'left';
  }

  cellAlign(column: DataTableColumn): DataTableAlign {
    return column.align || 'left';
  }

  sortIcon(column: DataTableColumn): string {
    if (this.sortColumn !== column.key || !this.sortDirection) return 'unfold_more';
    return this.sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward';
  }
  onHeaderClick(column: DataTableColumn) {
    if (column.sortable) {
      this.sortChange.emit(column.key);
    }
  }

  onPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.pageChange.emit(this.currentPage);
    }
  }

  onNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.pageChange.emit(this.currentPage);
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.pageChange.emit(this.currentPage);
    }
  }
}
