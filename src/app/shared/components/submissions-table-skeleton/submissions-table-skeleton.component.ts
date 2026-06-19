import { Component, Input } from '@angular/core';

export interface SkeletonColumn {
  width: string;
}

@Component({
  selector: 'app-submissions-table-skeleton',
  standalone: true,
  templateUrl: './submissions-table-skeleton.component.html',
  styleUrl: './submissions-table-skeleton.component.scss',
})
export class SubmissionsTableSkeletonComponent {
  @Input() columns: SkeletonColumn[] = [];
  @Input() rows = 5;
  @Input() showSearch = true;
  @Input() showTypeFilter = false;
  @Input() loadingLabel = 'Loading applications';

  get rowItems(): number[] {
    return Array.from({ length: Math.max(0, this.rows) }, (_, index) => index);
  }
}
