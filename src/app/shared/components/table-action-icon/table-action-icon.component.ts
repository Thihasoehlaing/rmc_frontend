import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import {
  SVG_ICON_ACTIVATE,
  SVG_ICON_DEACTIVATE,
  SVG_ICON_BLOCK_USER,
  SVG_ICON_EDIT,
  SVG_ICON_PRINT,
  SVG_ICON_TRASH,
  SVG_ICON_VIEW,
  SVG_ICON_SHIELD_USER,
  SVG_ICON_MARK_READ,
  SvgIconDefinition,
} from '../../icons/svg-icons';

export type TableActionIcon = 'edit' | 'delete' | 'view' | 'print' | 'activate' | 'deactivate' | 'blockUser' | 'unblockUser' | 'markRead';

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
      case 'print':
        return SVG_ICON_PRINT;
      case 'activate':
        return SVG_ICON_ACTIVATE;
      case 'deactivate':
        return SVG_ICON_DEACTIVATE;
      case 'blockUser':
        return SVG_ICON_BLOCK_USER;
      case 'unblockUser':
        return SVG_ICON_SHIELD_USER;
      case 'markRead':
        return SVG_ICON_MARK_READ;
      default:
        return SVG_ICON_VIEW;
    }
  }
}



