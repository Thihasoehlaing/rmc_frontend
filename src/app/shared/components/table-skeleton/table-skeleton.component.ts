import { Component, Input } from '@angular/core';

export interface SkeletonColumn {
  width?: string;
}

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  templateUrl: './table-skeleton.component.html',
  styleUrl: './table-skeleton.component.scss',
})
export class TableSkeletonComponent {
  @Input() columns: readonly SkeletonColumn[] = [];
  @Input() rows = 5;
  @Input() showSearch = true;
  @Input() showTypeFilter = false;
  @Input() loadingLabel = 'Loading data';
  @Input() minWidth = 'var(--size-table-min-wide)';

  get rowItems(): number[] {
    return Array.from({ length: Math.max(0, this.rows) }, (_, index) => index);
  }
}
