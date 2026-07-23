import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-validation-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validation-message.component.html',
  styleUrl: './validation-message.component.scss',
})
export class ValidationMessageComponent {
  @Input() control: AbstractControl | null | undefined = null;
  @Input() message = '';
  @Input() fieldName = '';

  get errorMessage(): string | null {
    if (this.message) return this.message;
    if (!this.control || !this.control.touched) return null;

    const errors = this.control.errors;
    if (!errors) return null;

    if (errors['required']) return this.fieldName ? `${this.fieldName} field is required.` : 'This field is required.';
    if (errors['email']) return 'Invalid email address.';
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters allowed.`;
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required.`;
    if (errors['pattern']) return errors['pattern'].message || 'Invalid format.';
    if (errors['requiredTrue']) return 'You must agree to continue.';

    // These are rendered by a dedicated, more specific <span> next to this
    // component elsewhere (e.g. batch-sitting's start-date scheduling rules) —
    // showing the generic fallback here too would just duplicate that message.
    const handledElsewhere = ['activeStartTooSoon', 'plannedStartTooSoon', 'batchNameTaken'];
    if (handledElsewhere.some((key) => errors[key])) return null;

    return 'Invalid input.';
  }
}
