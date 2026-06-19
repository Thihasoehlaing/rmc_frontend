import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-detail-panel-skeleton',
  standalone: true,
  templateUrl: './detail-panel-skeleton.component.html',
  styleUrl: './detail-panel-skeleton.component.scss',
})
export class DetailPanelSkeletonComponent {
  @Input() rows = 3;
  @Input() loadingLabel = 'Loading details';

  get rowItems(): number[] {
    return Array.from({ length: Math.max(0, this.rows) }, (_, index) => index);
  }
}
