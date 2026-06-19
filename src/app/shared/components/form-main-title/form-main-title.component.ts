import { AfterViewInit, Component, Input, Output, EventEmitter, ViewChild, signal } from '@angular/core';
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
        [endpoint]="endpoint"
        (closed)="onGuidelinesClosed()">
      </app-guidelines-modal>
    }
  `,
    styleUrls: ['./form-main-title.component.scss']
})
export class FormMainTitleComponent implements AfterViewInit {
    @Input() title = '';
    @Input() description = '';
    @Input() helpText = 'Click to view guidelines';
    @Input() status = '';
    @Input() statusIntent: FormIntent = 'info';
    @Input() modalTitle = 'Guidelines for Applicants';
    @Input() endpoint = '';
    @Input() customModal = false;
    @Input() autoOpenGuidelines = true;

    @Output() helpClick = new EventEmitter<void>();

    @ViewChild('guidelinesModal') guidelinesModal!: GuidelinesModalComponent;
    readonly showHelpMessage = signal(false);
    private awaitingInitialClose = false;
    private manuallyOpened = false;
    private helpMessageTimer?: ReturnType<typeof setTimeout>;

    ngAfterViewInit(): void {
        if (!this.autoOpenGuidelines || (!this.endpoint && !this.customModal)) return;

        this.awaitingInitialClose = true;
        setTimeout(() => this.openGuidelines());
    }

    onHelpClick(): void {
        this.manuallyOpened = true;
        this.awaitingInitialClose = false;
        clearTimeout(this.helpMessageTimer);
        this.showHelpMessage.set(false);
        this.openGuidelines();
    }

    onGuidelinesClosed(): void {
        if (this.awaitingInitialClose && !this.manuallyOpened) {
            this.awaitingInitialClose = false;
            this.showHelpMessage.set(true);
            this.helpMessageTimer = setTimeout(
                () => this.showHelpMessage.set(false),
                3000
            );
        }
    }

    private openGuidelines(): void {
        if (this.customModal) {
            this.helpClick.emit();
        } else if (this.guidelinesModal) {
            this.guidelinesModal.open();
        }
    }
}
