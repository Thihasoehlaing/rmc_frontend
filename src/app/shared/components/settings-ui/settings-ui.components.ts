import {
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { ActionButtonComponent } from '../action-button/action-button.component';
import { ValidationMessageComponent } from '../validation-message/validation-message.component';

@Component({
  selector: 'app-settings-page-header',
  standalone: true,
  template: `<header class="ui-page-header">
    <div class="ui-page-header__identity">
      @if (icon) {
        <span class="ui-page-header__icon material-icons" aria-hidden="true">{{ icon }}</span>
      }
      <div>
        <span class="ui-eyebrow">{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </div>
    <div class="ui-actions"><ng-content /></div>
  </header>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class SettingsPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() eyebrow = 'System settings';
  @Input() icon = '';
}

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  template: `<section class="ui-panel" [attr.aria-label]="title || null">
    @if (title) {
      <header class="ui-panel__header">
        <div class="ui-panel__heading">
          <h2>{{ title }}</h2>
          @if (count !== null) {
            <span class="ui-count">{{ count }}</span>
          }
        </div>
        <div class="ui-actions"><ng-content select="[panelActions]" /></div>
      </header>
    }
    <div class="ui-panel__body" [class.ui-panel__body--flush]="flush"><ng-content /></div>
    <div class="ui-panel__footer"><ng-content select="[panelFooter]" /></div>
  </section>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class SettingsPanelComponent {
  @Input() title = '';
  @Input() count: number | null = null;
  @Input() flush = false;
}

@Component({
  selector: 'app-search-toolbar',
  standalone: true,
  imports: [ActionButtonComponent],
  template: `<form
    class="ui-toolbar"
    role="search"
    [attr.aria-label]="label"
    (submit)="submit($event)"
  >
    <label class="ui-search"
      ><span class="material-icons" aria-hidden="true">search</span>
      <input
        class="input--text"
        type="search"
        [attr.aria-label]="label"
        [placeholder]="placeholder"
        [value]="query"
        (input)="queryChange.emit($any($event.target).value)"
        [disabled]="disabled"
      />
    </label>
    <ng-content />
    <div class="ui-actions">
      <app-action-button
        label="Search"
        icon="search"
        buttonType="submit"
        size="small"
        [disabled]="disabled"
      />
      <app-action-button
        label="Reset"
        icon="restart_alt"
        type="ghost"
        size="small"
        [disabled]="disabled"
        (clicked)="reset.emit()"
      />
      <ng-content select="[toolbarActions]" />
    </div>
  </form>`,
  styles: [':host { display: block; min-width: 0; container: settings-filters / inline-size; }'],
})
export class SearchToolbarComponent {
  @Input() query = '';
  @Input() label = 'Search records';
  @Input() placeholder = 'Search by code or name…';
  @Input() disabled = false;
  @Output() queryChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  submit(event: Event): void {
    event.preventDefault();
    if (!this.disabled) this.search.emit();
  }
}

@Directive({
  selector: 'input[appInput],textarea[appInput],select[appInput]',
  standalone: true,
  host: {
    '[class.input--text]': "tag === 'INPUT'",
    '[class.input--textarea]': "tag === 'TEXTAREA'",
    '[class.input--select]': "tag === 'SELECT'",
    '[class.is-invalid]': 'invalid',
    '[attr.aria-invalid]': 'invalid || null',
  },
})
export class InputDirective {
  readonly tag = inject(ElementRef<HTMLElement>).nativeElement.tagName;
  @Input() invalid = false;
}

@Component({
  selector: 'app-field',
  standalone: true,
  imports: [ValidationMessageComponent],
  template: `<div class="form-field ui-field">
    <label class="form-label" [for]="controlId"
      >{{ label }}
      @if (required) {
        <span class="ui-field__required" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (hint) {
      <p class="form-hint" [id]="controlId + '-hint'">{{ hint }}</p>
    }
    <div [id]="controlId + '-error'" [hidden]="!error">
      <app-validation-message [message]="error" />
    </div>
  </div>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class FieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) controlId = '';
  @Input() required = false;
  @Input() hint = '';
  @Input() error = '';
}

@Component({
  selector: 'app-state',
  standalone: true,
  template: `<div class="ui-state" [attr.role]="error ? 'alert' : 'status'">
    <span class="ui-state__icon material-icons" aria-hidden="true">{{ icon }}</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <div class="ui-actions"><ng-content /></div>
  </div>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class StateComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = 'inbox';
  @Input() error = false;
}

export interface SelectionSummaryItem {
  value: number | string;
  label: string;
  description?: string;
}
@Component({
  selector: 'app-selection-summary',
  standalone: true,
  template: `<section class="selection-summary" [attr.aria-label]="title" aria-live="polite">
    <header>
      <h3>{{ title }}</h3>
      <span class="ui-count">{{ items.length }}</span>
    </header>
    <ul>
      @for (item of items; track item.value) {
        <li>
          <span class="material-icons" aria-hidden="true">check_circle</span>
          <div>
            <strong>{{ item.label }}</strong>
            @if (item.description) {
              <small>{{ item.description }}</small>
            }
          </div>
        </li>
      } @empty {
        <li class="selection-summary__empty">{{ emptyText }}</li>
      }
    </ul>
  </section>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class SelectionSummaryComponent {
  @Input() title = 'Selected staff';
  @Input() emptyText = 'No staff selected.';
  @Input() items: readonly SelectionSummaryItem[] = [];
}

@Component({
  selector: 'app-toggle',
  standalone: true,
  template: `<label class="ui-toggle"
    ><input
      type="checkbox"
      class="input--checkbox"
      role="switch"
      [checked]="checked"
      [disabled]="disabled"
      (change)="checkedChange.emit($any($event.target).checked)"
    /><span
      ><strong>{{ label }}</strong>
      @if (description) {
        <small>{{ description }}</small>
      }
    </span></label
  >`,
  styles: [':host { display: block; }'],
})
export class ToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input({ required: true }) label = '';
  @Input() description = '';
  @Output() checkedChange = new EventEmitter<boolean>();
}

@Component({
  selector: 'app-person-identity',
  standalone: true,
  template: `<div class="ui-person">
    <span class="ui-person__avatar"
      ><span>{{ initials || name.charAt(0) }}</span>
      @if (photoUrl && !photoFailed) {
        <img
          [src]="photoUrl"
          [alt]="name + ' profile photo'"
          loading="lazy"
          (error)="photoFailed = true"
        />
      }
    </span>
    <div>
      <strong>{{ name }}</strong
      ><small>{{ detail }}</small>
    </div>
  </div>`,
  styles: [':host { display: block; min-width: 0; }'],
})
export class PersonIdentityComponent {
  @Input() name = '';
  @Input() detail = '';
  @Input() initials = '';
  @Input() set photoUrl(value: string | null | undefined) {
    this.url = value ?? '';
    this.photoFailed = false;
  }
  get photoUrl(): string {
    return this.url;
  }
  private url = '';
  photoFailed = false;
}
