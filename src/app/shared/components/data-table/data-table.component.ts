import { Component, ContentChild, Input, TemplateRef, TrackByFunction, Output, EventEmitter } from '@angular/core';
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

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent {
  @Input({ required: true }) columns: readonly DataTableColumn[] = [];
  @Input({ required: true }) rows: readonly unknown[] = [];
  @Input() rowTrackFn: TrackByFunction<unknown> = (index) => index;
  @Input() sortColumn: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' | null = null;
  @Input() showHeader = true;
  @Input() dense = false;
  @Input() hoverable = true;
  @Input() striped = true;
  @Output() sortChange = new EventEmitter<string>();

  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<DataTableRowContext<unknown>>;

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

  onHeaderClick(column: DataTableColumn) {
    if (column.sortable) {
      this.sortChange.emit(column.key);
    }
  }
}
