import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-skeleton',
  standalone: true,
  templateUrl: './dashboard-skeleton.component.html',
  styleUrl: './dashboard-skeleton.component.scss',
})
export class DashboardSkeletonComponent {
  @Input() metricCount = 3;
  @Input() rows = 5;
  @Input() loadingLabel = 'Loading dashboard';

  get metrics(): number[] {
    return Array.from({ length: Math.max(0, this.metricCount) }, (_, index) => index);
  }

  get rowItems(): number[] {
    return Array.from({ length: Math.max(0, this.rows) }, (_, index) => index);
  }
}
