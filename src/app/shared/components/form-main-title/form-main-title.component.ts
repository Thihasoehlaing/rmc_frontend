import { Component, Input, Output, EventEmitter, ViewChild, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidelinesModalComponent } from '../guidelines-modal/guidelines-modal.component';
import { FormIntent, StatusBadgeComponent } from '../form-standard/form-standard.components';

@Component({
    selector: 'app-form-main-title',
    standalone: true,
    imports: [CommonModule, GuidelinesModalComponent, StatusBadgeComponent],
    template: `
    <header class="form-main-title-wrapper">
      <div class="form-main-title-heading">
        <h1 class="form-main-title-text">{{ title }}</h1>
        <button
          class="help-icon"
          type="button"
          (click)="onHelpClick()"
          aria-label="View applicant guidelines"
          [attr.title]="helpText">
          <span class="material-icons" aria-hidden="true">help_outline</span>
        </button>
        @if (helpText && showHelpMessage()) {
          <span class="help-message">{{ helpText }}</span>
        }
      </div>
      @if (description) {
        <p class="form-main-title-description">{{ description }}</p>
      }
      @if (status) {
        <app-status-badge [intent]="statusIntent">{{ status }}</app-status-badge>
      }
    </header>

    @if (!customModal) {
      <app-guidelines-modal
        #guidelinesModal
        [title]="modalTitle"
        [endpoint]="endpoint">
      </app-guidelines-modal>
    }
  `,
    styleUrls: ['./form-main-title.component.scss']
})
export class FormMainTitleComponent implements OnInit {
    @Input() title = '';
    @Input() description = '';
    @Input() helpText = 'Click to view guidelines';
    @Input() status = '';
    @Input() statusIntent: FormIntent = 'info';
    @Input() modalTitle = 'Guidelines for Applicants';
    @Input() endpoint = '';
    @Input() customModal = false;

    @Output() helpClick = new EventEmitter<void>();

    @ViewChild('guidelinesModal') guidelinesModal!: GuidelinesModalComponent;
    readonly showHelpMessage = signal(true);

    ngOnInit(): void {
        setTimeout(() => this.showHelpMessage.set(false), 3000);
    }

    onHelpClick() {
        if (this.customModal) {
            this.helpClick.emit();
        } else if (this.guidelinesModal) {
            this.guidelinesModal.open();
        }
    }
}
