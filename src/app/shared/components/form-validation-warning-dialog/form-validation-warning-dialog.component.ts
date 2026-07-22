import { Component, EventEmitter, Input, Output } from '@angular/core';

import { DialogComponent } from '../dialog/dialog.component';
import { FormAlertComponent } from '../form-standard/form-standard.components';

@Component({
  selector: 'app-form-validation-warning-dialog',
  standalone: true,
  imports: [DialogComponent, FormAlertComponent],
  template: '<app-dialog title="Missing required fields" [isOpen]="isOpen" size="small" (close)="close.emit()"><app-form-alert intent="warning" icon="warning_amber">{{ message }}</app-form-alert><button dialog-footer type="button" class="btn btn-primary" (click)="close.emit()">Review fields</button></app-dialog>',
})
export class FormValidationWarningDialogComponent {
  @Input() isOpen = false;
  @Input() message = 'Your form has missing or invalid fields. Please review all steps.';
  @Output() close = new EventEmitter<void>();
}
