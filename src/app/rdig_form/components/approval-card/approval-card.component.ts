import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { syncRequiredValidator } from '../../../shared/utils/form.utils';

export interface ApprovalOption {
  label: string;
  value: string;
}

/** Visual display type for each approval decision button. */
type ApprovalDisplayType = 'approve' | 'resubmit' | 'reject' | 'default';
interface OptionMeta { icon: string; type: ApprovalDisplayType; }

/** Maps raw option values to their icon and colour-type. */
const OPTION_META: Record<string, OptionMeta> = {
  approve:      { icon: 'check_circle',           type: 'approve'  },
  resubmit:     { icon: 'published_with_changes', type: 'resubmit' },
  resubmission: { icon: 'published_with_changes', type: 'resubmit' },
  reject:       { icon: 'dangerous',              type: 'reject'   },
};
const DEFAULT_META: OptionMeta = { icon: 'radio_button_unchecked', type: 'default' };

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
          <label class="form-label">{{ fieldLabel }}</label>
          <div class="button-selection-group">
            @for (opt of options; track opt.value) {
              <button
                type="button"
                class="option-btn"
                [attr.data-type]="metaFor(opt.value).type"
                [class.active]="control.value === opt.value"
                [disabled]="readonly ? true : null"
                (click)="select(opt.value)">
                <span class="material-icons">{{ metaFor(opt.value).icon }}</span>
                <span>{{ opt.label }}</span>
              </button>
            }
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

    // ── Button selection group ──────────────────────────────────────────
    .approval-card__body {
      .form-label {
        display: block;
        margin-bottom: var(--space-3);
      }
    }

    .button-selection-group {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .option-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      min-width: 110px;
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-family: inherit;
      transition:
        border-color 0.2s ease,
        background  0.2s ease,
        color       0.2s ease,
        transform   0.15s ease,
        box-shadow  0.2s ease;

      .material-icons {
        font-size: 28px;
        line-height: 1;
      }

      span:last-child {
        font-size: var(--fs-xs, 11px);
        font-weight: var(--fw-bold);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        border-color: var(--border-hover);
        box-shadow: var(--shadow-sm);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: var(--disabled-opacity, 0.55);
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

      // Active states per decision type
      &.active[data-type="approve"] {
        border-color: var(--color-success, #28a745);
        background: color-mix(in srgb, var(--color-success, #28a745) 10%, var(--color-surface));
        color: var(--color-success-dark, #176227);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success, #28a745) 15%, transparent);
      }

      &.active[data-type="resubmit"] {
        border-color: var(--color-warning, #ffc107);
        background: color-mix(in srgb, var(--color-warning, #ffc107) 12%, var(--color-surface));
        color: var(--color-warning-dark, #92400e);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-warning, #ffc107) 15%, transparent);
      }

      &.active[data-type="reject"] {
        border-color: var(--color-error, #dc3545);
        background: color-mix(in srgb, var(--color-error, #dc3545) 10%, var(--color-surface));
        color: var(--color-error, #dc3545);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-error, #dc3545) 15%, transparent);
      }
    }
  `]
})
export class ApprovalCardComponent implements OnChanges {
  @Input() title = 'Approval';
  @Input() fieldLabel = 'Approval Status';
  @Input() icon = 'verified_user';
  @Input() visible = false;
  @Input() readonly = true;
  @Input() options: ApprovalOption[] = [];
  @Input() control = new FormControl('');

  ngOnChanges(changes: SimpleChanges): void {
    if ('readonly' in changes || 'control' in changes) {
      syncRequiredValidator(this.control, this.readonly);
    }
  }

  metaFor(value: string) {
    return OPTION_META[value] ?? DEFAULT_META;
  }

  select(value: string): void {
    if (!this.readonly) {
      this.control.setValue(value);
    }
  }
}
