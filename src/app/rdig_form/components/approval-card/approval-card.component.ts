import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

export interface ApprovalOption {
  label: string;
  value: string;
}

/**
 * Reusable approval card for HOS, RMC, Reviewer 2, RDIG Chair, VC, CEO.
 * Shown on the last page during the appropriate workflow stage.
 */
@Component({
  selector: 'app-approval-card',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (visible) {
      <div class="approval-card" [class.approval-card--readonly]="readonly">
        <div class="approval-card__header">
          <span class="material-icons">{{ icon }}</span>
          <h4 class="approval-card__title">{{ title }}</h4>
          @if (readonly) {
            <span class="badge badge--readonly">Read Only</span>
          }
        </div>
        <div class="approval-card__body">
          <div class="form-field">
            <label class="form-label">{{ fieldLabel }}</label>
            <select
              class="input--select"
              [formControl]="control"
              [attr.disabled]="readonly ? '' : null">
              <option value="" disabled>Select decision...</option>
              @for (opt of options; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @use '../../../../assets/styles/index' as *;

    .approval-card {
      padding: var(--space-5) var(--space-6);
      background: var(--color-surface);
      border: 1px solid var(--border-default);
      border-left: 4px solid var(--color-primary);
      border-radius: var(--radius-lg);

      &--readonly {
        border-left-color: var(--color-text-secondary);
        opacity: 0.85;
      }
    }

    .approval-card__header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-4);

      .material-icons {
        font-size: 22px;
        color: var(--color-primary);
      }
    }

    .approval-card__title {
      flex: 1;
      font-size: var(--fs-base);
      font-weight: var(--fw-bold);
      color: var(--color-heading);
      margin: 0;
    }

    .badge--readonly {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--color-surface-hover);
      color: var(--color-text-secondary);
      font-weight: var(--fw-medium);
      text-transform: uppercase;
    }

    .approval-card__body {
      max-width: 320px;
    }
  `]
})
export class ApprovalCardComponent {
  @Input() title = 'Approval';
  @Input() fieldLabel = 'Approval Status';
  @Input() icon = 'verified_user';
  @Input() visible = false;
  @Input() readonly = true;
  @Input() options: ApprovalOption[] = [];
  @Input() control = new FormControl('');
}
