import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type TableActionIcon =
  | 'edit'
  | 'delete'
  | 'view'
  | 'print'
  | 'activate'
  | 'deactivate'
  | 'blockUser'
  | 'unblockUser'
  | 'markRead';

const ACTION_ICONS: Record<TableActionIcon, string> = {
  edit: 'edit',
  delete: 'delete_outline',
  view: 'visibility',
  print: 'print',
  activate: 'check_circle',
  deactivate: 'block',
  blockUser: 'person_off',
  unblockUser: 'lock_open',
  markRead: 'mark_email_read',
};

@Component({
  selector: 'app-table-action-icon',
  standalone: true,
  host: { '[attr.data-action]': 'action', 'aria-hidden': 'true' },
  template: `<span class="material-icons-outlined" [style.font-size]="size">{{ icon }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .material-icons-outlined {
        line-height: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableActionIconComponent {
  @Input({ required: true }) action: TableActionIcon = 'view';
  @Input() size = '18px';

  get icon(): string {
    return ACTION_ICONS[this.action] ?? ACTION_ICONS.view;
  }
}
