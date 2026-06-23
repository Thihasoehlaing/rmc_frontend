import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import {
  SVG_ICON_EDIT,
  SVG_ICON_TRASH,
  SVG_ICON_VIEW,
  SvgIconDefinition,
} from '../../icons/svg-icons';

export type TableActionIcon = 'edit' | 'delete' | 'view';

@Component({
  selector: 'app-table-action-icon',
  standalone: true,
  imports: [SvgIconComponent],
  template: `<app-svg-icon [icon]="icon" [size]="size"></app-svg-icon>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableActionIconComponent {
  @Input({ required: true }) action: TableActionIcon = 'view';
  @Input() size = '18px';

  get icon(): SvgIconDefinition {
    switch (this.action) {
      case 'edit':
        return SVG_ICON_EDIT;
      case 'delete':
        return SVG_ICON_TRASH;
      default:
        return SVG_ICON_VIEW;
    }
  }
}
