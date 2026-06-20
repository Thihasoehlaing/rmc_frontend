import { Component, EventEmitter, Input, Output } from '@angular/core';

export type FormIntent = 'info' | 'success' | 'warning' | 'error';

export interface ValidationSummaryItem {
  label: string;
  step: number;
}

@Component({
  selector: 'app-form-page-container',
  standalone: true,
  template: `<main class="form-page-container"><ng-content /></main>`,
})
export class FormPageContainerComponent {}

@Component({
  selector: 'app-form-alert',
  standalone: true,
  template: `
    <section
      class="form-alert"
      [class]="'form-alert form-alert--' + intent"
      [attr.role]="intent === 'error' ? 'alert' : 'status'">
      @if (icon) {
        <span class="material-icons form-alert__icon" aria-hidden="true">{{ icon }}</span>
      }
      <div class="form-alert__content">
        @if (title) {
          <strong class="form-alert__title">{{ title }}</strong>
        }
        <div class="form-alert__message"><ng-content /></div>
      </div>
      <div class="form-alert__action"><ng-content select="[formAlertAction]" /></div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .form-alert {
      display: flex;
      align-items: flex-start;
      gap: var(--form-space-3);
      padding: var(--form-space-3) var(--form-space-4);
      border: var(--control-border-width) solid transparent;
      border-radius: var(--radius-lg);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      line-height: var(--line-height-body);
    }
    .form-alert--info {
      color: var(--color-info-dark);
      background: var(--color-info-light);
      border-color: color-mix(in srgb, var(--color-info) 35%, var(--color-background-surface));
    }
    .form-alert--success {
      color: var(--color-success-dark);
      background: var(--color-success-light);
      border-color: color-mix(in srgb, var(--color-success) 35%, var(--color-background-surface));
    }
    .form-alert--warning {
      color: var(--color-warning-dark);
      background: var(--color-warning-light);
      border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-background-surface));
    }
    .form-alert--error {
      color: var(--color-error-dark);
      background: var(--color-error-light);
      border-color: color-mix(in srgb, var(--color-error) 35%, var(--color-background-surface));
    }
    .form-alert__icon {
      flex: 0 0 auto;
      font-size: var(--size-icon-control);
      line-height: var(--line-height-control);
    }
    .form-alert__content { flex: 1; min-width: 0; }
    .form-alert__title { display: block; font-weight: var(--font-weight-semibold); }
    .form-alert__message:empty,
    .form-alert__action:empty { display: none; }
    .form-alert__action { margin-left: auto; }
  `],
})
export class FormAlertComponent {
  @Input() intent: FormIntent = 'info';
  @Input() icon = '';
  @Input() title = '';
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span [class]="'status-badge status-badge--' + intent"><ng-content /></span>`,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: var(--form-space-6);
      padding: 0 var(--form-space-3);
      border-radius: var(--radius-full);
      font-size: var(--font-size-caption);
      line-height: var(--line-height-caption);
      font-weight: var(--font-weight-semibold);
      white-space: nowrap;
    }
    .status-badge--info { color: var(--color-info-dark); background: var(--color-info-light); }
    .status-badge--success { color: var(--color-success-dark); background: var(--color-success-light); }
    .status-badge--warning { color: var(--color-warning-dark); background: var(--color-warning-light); }
    .status-badge--error { color: var(--color-error-dark); background: var(--color-error-light); }
  `],
})
export class StatusBadgeComponent {
  @Input() intent: FormIntent = 'info';
}

@Component({
  selector: 'app-validation-summary',
  standalone: true,
  template: `
    @if (items.length) {
      <section class="validation-summary" role="alert" aria-labelledby="validation-summary-title" tabindex="-1">
        <span class="material-icons validation-summary__icon" aria-hidden="true">error_outline</span>
        <div>
          <h2 id="validation-summary-title">{{ title }}</h2>
          <p>Please review the following fields:</p>
          <ul>
            @for (item of items; track item.step + item.label) {
              <li>
                <button type="button" (click)="itemSelected.emit(item)">
                  Step {{ item.step }}: {{ item.label }}
                </button>
              </li>
            }
          </ul>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .validation-summary {
      display: flex;
      align-items: flex-start;
      gap: var(--form-space-3);
      padding: var(--form-space-4);
      border: var(--control-border-width) solid var(--color-error);
      border-radius: var(--radius-lg);
      background: var(--color-error-light);
      color: var(--color-error-dark);
    }
    .validation-summary:focus-visible {
      outline: var(--control-focus-ring-width) solid var(--color-border-focus);
      outline-offset: var(--form-space-1);
    }
    .validation-summary__icon { font-size: var(--size-icon-section); }
    h2 {
      margin: 0;
      font-size: var(--font-size-subtitle);
      line-height: var(--line-height-section);
      font-weight: var(--font-weight-semibold);
    }
    p { margin: var(--form-space-1) 0 var(--form-space-2); }
    ul { margin: 0; padding-left: var(--form-space-5); }
    button {
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      text-decoration: underline;
      cursor: pointer;
    }
    button:focus-visible {
      outline: var(--control-focus-ring-width) solid var(--color-border-focus);
      outline-offset: var(--form-space-1);
      border-radius: var(--radius-sm);
    }
  `],
})
export class ValidationSummaryComponent {
  @Input() title = 'Please correct the errors before submitting';
  @Input() items: readonly ValidationSummaryItem[] = [];
  @Output() itemSelected = new EventEmitter<ValidationSummaryItem>();
}
