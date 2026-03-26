import { AbstractControl, Validators } from '@angular/forms';

/**
 * Adds `Validators.required` to a control when `readonly` is false,
 * removes it when `readonly` is true.
 *
 * Shared by ReviewBlockComponent and ApprovalCardComponent so both
 * follow the exact same validator-on-readonly pattern.
 */
export function syncRequiredValidator(control: AbstractControl, readonly: boolean): void {
  if (readonly) {
    control.removeValidators(Validators.required);
  } else {
    control.addValidators(Validators.required);
  }
  control.updateValueAndValidity({ emitEvent: false });
}
