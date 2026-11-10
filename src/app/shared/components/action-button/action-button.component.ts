import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  TableActionIconComponent,
  TableActionIcon,
} from '../table-action-icon/table-action-icon.component';

export type ActionButtonType = 'primary' | 'danger' | 'secondary' | 'ghost' | 'success' | 'warning';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [TableActionIconComponent],
  template: `
    <button
      [class]="'action-button btn btn-' + type"
      [class.btn-sm]="size === 'small'"
      [class.btn-icon]="iconOnly"
      [attr.aria-label]="ariaLabel || (iconOnly ? label : null)"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading || null"
      [attr.data-action]="iconOnly ? standardIcon || icon : null"
      [attr.title]="title || (iconOnly ? ariaLabel || label : null)"
      [type]="buttonType"
      [attr.form]="formId || null"
      (click)="clicked.emit()"
    >
      <span
        class="action-button__content"
        [class.action-button__content--hidden]="loading"
        [attr.aria-hidden]="loading || null"
      >
        @if (iconOnly && standardIcon) {
          <app-table-action-icon [action]="standardIcon!" aria-hidden="true" />
        } @else if (icon) {
          <span
            class="material-icons"
            [class.material-icons-outlined]="iconOnly"
            [class.material-icons]="!iconOnly"
            aria-hidden="true"
            >{{ icon }}</span
          >
        }
        @if (!iconOnly) {
          <span class="action-button__label">{{ label }}</span>
        }
      </span>
      @if (loading) {
        <span class="action-button__content" aria-live="polite">
          <span class="material-icons spinning" aria-hidden="true">sync</span>
          @if (!iconOnly) {
            <span>{{ loadingLabel }}</span>
          }
        </span>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        max-width: 100%;
        vertical-align: middle;
      }
      .action-button {
        display: inline-grid;
        grid-template-areas: 'content';
        width: auto;
        max-width: 100%;
      }
      .action-button.btn-icon {
        width: var(--button-size-icon);
        padding: 0;
      }
      .action-button__content {
        grid-area: content;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        white-space: nowrap;
      }
      :host-context(.workflow-action-button) .action-button__content {
        flex-direction: column;
        min-width: 0;
        white-space: normal;
      }
      :host-context(.workflow-action-button) .action-button__label {
        max-width: 100%;
        line-height: 1.25;
        overflow-wrap: anywhere;
        text-align: center;
      }
      .action-button__content--hidden {
        visibility: hidden;
      }
      .material-icons,
      .material-icons-outlined {
        font-size: var(--size-icon-control);
      }
      .spinning {
        animation: action-button-spin 1s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .spinning {
          animation: none;
        }
      }
      @keyframes action-button-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ActionButtonComponent {
  get standardIcon(): TableActionIcon | null {
    const icons: Record<string, TableActionIcon> = {
      edit: 'edit',
      delete: 'delete',
      delete_outline: 'delete',
      visibility: 'view',
      print: 'print',
      check: 'activate',
      check_circle: 'activate',
      block: 'deactivate',
      lock_open: 'unblockUser',
      mark_email_read: 'markRead',
    };
    return icons[this.icon] ?? null;
  }

  @Input() size: 'small' | 'medium' = 'medium';
  @Input() buttonType: 'button' | 'submit' | 'reset' = 'button';
  @Input() formId = '';
  @Input() iconOnly = false;
  @Input() ariaLabel = '';
  @Input() type: ActionButtonType = 'primary';
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() disabled: boolean = false;
  @Input() loading = false;
  @Input() loadingLabel = 'Please wait...';
  @Input() title: string = '';
  @Output() clicked = new EventEmitter<void>();
}
