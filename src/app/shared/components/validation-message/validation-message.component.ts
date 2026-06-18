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

  get errorMessage(): string | null {
    if (this.message) return this.message;
    if (!this.control || !this.control.touched) return null;

    const errors = this.control.errors;
    if (!errors) return null;

    if (errors['required']) return 'This field is required.';
    if (errors['email']) return 'Invalid email address.';
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters allowed.`;
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required.`;
    if (errors['pattern']) return errors['pattern'].message || 'Invalid format.';
    if (errors['requiredTrue']) return 'You must agree to continue.';

    return 'Invalid input.';
  }
}
