import { Component, Input, Output, EventEmitter } from '@angular/core';

export type ActionButtonType = 'primary' | 'danger' | 'secondary';

@Component({
  selector: 'app-action-button',
  standalone: true,
  template: `
    <button
      [class]="'action-button btn btn-' + type"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading || null"
      [attr.title]="title || null"
      type="button"
      (click)="clicked.emit()">
      <span
        class="action-button__content"
        [class.action-button__content--hidden]="loading"
        [attr.aria-hidden]="loading || null">
        @if (icon) {
          <span class="material-icons" aria-hidden="true">{{ icon }}</span>
        }
        <span>{{ label }}</span>
      </span>
      @if (loading) {
        <span class="action-button__content" aria-live="polite">
          <span class="material-icons spinning" aria-hidden="true">progress_activity</span>
          <span>{{ loadingLabel }}</span>
        </span>
      }
    </button>
  `,
  styles: [`
    :host { display: inline-flex; max-width: 100%; vertical-align: middle; }
    .action-button {
      display: inline-grid;
      grid-template-areas: 'content';
      width: auto;
      max-width: 100%;
    }
    .action-button__content {
      grid-area: content;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      white-space: nowrap;
    }
    .action-button__content--hidden { visibility: hidden; }
    .material-icons { font-size: var(--size-icon-control); }
    .spinning { animation: action-button-spin 1s linear infinite; }
    @keyframes action-button-spin { to { transform: rotate(360deg); } }
  `]
})
export class ActionButtonComponent {
  @Input() type: ActionButtonType = 'primary';
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() disabled: boolean = false;
  @Input() loading = false;
  @Input() loadingLabel = 'Please wait...';
  @Input() title: string = '';
  @Output() clicked = new EventEmitter<void>();
}
