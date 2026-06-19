import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidelinesModalComponent } from '../guidelines-modal/guidelines-modal.component';
import { FormIntent, StatusBadgeComponent } from '../form-standard/form-standard.components';

export type GuidelineContext = 'new-application' | 'existing-application';

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
export class FormMainTitleComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() title = '';
    @Input() description = '';
    @Input() helpText = 'Click to view guidelines';
    @Input() status = '';
    @Input() statusIntent: FormIntent = 'info';
    @Input() modalTitle = 'Guidelines for Applicants';
    @Input() endpoint = '';
    @Input() customModal = false;
    @Input() guidelineContext: GuidelineContext = 'existing-application';

    @Output() helpClick = new EventEmitter<void>();

    @ViewChild('guidelinesModal') guidelinesModal!: GuidelinesModalComponent;
    readonly showHelpMessage = signal(false);
    private awaitingInitialClose = false;
    private manuallyOpened = false;
    private viewInitialized = false;
    private automaticOpenScheduled = false;
    private automaticOpenTimer?: ReturnType<typeof setTimeout>;
    private helpMessageTimer?: ReturnType<typeof setTimeout>;

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        this.maybeAutoOpenGuidelines();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['guidelineContext'] && this.guidelineContext === 'existing-application') {
            clearTimeout(this.automaticOpenTimer);
            this.awaitingInitialClose = false;
        }

        if (changes['guidelineContext'] && this.viewInitialized) {
            this.maybeAutoOpenGuidelines();
        }
    }

    ngOnDestroy(): void {
        clearTimeout(this.automaticOpenTimer);
        clearTimeout(this.helpMessageTimer);
    }

    onHelpClick(): void {
        this.manuallyOpened = true;
        this.awaitingInitialClose = false;
        this.automaticOpenScheduled = true;
        clearTimeout(this.automaticOpenTimer);
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

    private maybeAutoOpenGuidelines(): void {
        if (
            this.guidelineContext !== 'new-application' ||
            this.automaticOpenScheduled ||
            (!this.endpoint && !this.customModal)
        ) {
            return;
        }

        this.automaticOpenScheduled = true;
        this.awaitingInitialClose = true;
        this.automaticOpenTimer = setTimeout(() => this.openGuidelines());
    }
}
