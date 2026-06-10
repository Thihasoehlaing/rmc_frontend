import { Component, Input, Output, EventEmitter } from '@angular/core';

export type ActionButtonType = 'primary' | 'danger' | 'secondary';

@Component({
  selector: 'app-action-button',
  standalone: true,
  template: `
    <button
      [class]="'btn btn-' + type"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading || null"
      [attr.title]="title || null"
      type="button"
      (click)="clicked.emit()">
      @if (loading) {
        <span class="material-icons spinning" aria-hidden="true">progress_activity</span>
      } @else if (icon) {
        <span class="material-icons">{{ icon }}</span>
      }
      {{ loading ? loadingLabel : label }}
    </button>
  `,
  styles: [`
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
