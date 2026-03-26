import { Component, Input, Output, EventEmitter } from '@angular/core';

export type ActionButtonType = 'primary' | 'danger' | 'secondary';

@Component({
  selector: 'app-action-button',
  standalone: true,
  template: `
    <button
      [class]="'btn-' + type + '-pill'"
      [disabled]="disabled"
      [attr.title]="title || null"
      type="button"
      (click)="clicked.emit()">
      @if (icon) {
        <span class="material-icons">{{ icon }}</span>
      }
      {{ label }}
    </button>
  `
})
export class ActionButtonComponent {
  @Input() type: ActionButtonType = 'primary';
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() disabled: boolean = false;
  @Input() title: string = '';
  @Output() clicked = new EventEmitter<void>();
}
