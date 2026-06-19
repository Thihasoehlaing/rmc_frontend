import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-form-page-skeleton',
  standalone: true,
  templateUrl: './form-page-skeleton.component.html',
  styleUrl: './form-page-skeleton.component.scss',
})
export class FormPageSkeletonComponent {
  @Input() sections = 3;
  @Input() fieldsPerSection = 4;
  @Input() loadingLabel = 'Loading application';

  get sectionItems(): number[] {
    return Array.from({ length: Math.max(0, this.sections) }, (_, index) => index);
  }

  get fieldItems(): number[] {
    return Array.from({ length: Math.max(0, this.fieldsPerSection) }, (_, index) => index);
  }
}
