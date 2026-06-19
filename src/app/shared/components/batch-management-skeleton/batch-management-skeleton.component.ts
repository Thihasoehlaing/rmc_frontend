import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-batch-management-skeleton',
  standalone: true,
  templateUrl: './batch-management-skeleton.component.html',
  styleUrl: './batch-management-skeleton.component.scss',
})
export class BatchManagementSkeletonComponent {
  @Input() rows = 5;
  @Input() loadingLabel = 'Loading batch management';

  get rowItems(): number[] {
    return Array.from({ length: Math.max(0, this.rows) }, (_, index) => index);
  }
}
