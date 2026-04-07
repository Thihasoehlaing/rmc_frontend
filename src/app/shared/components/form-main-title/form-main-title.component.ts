import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidelinesModalComponent } from '../guidelines-modal/guidelines-modal.component';

@Component({
    selector: 'app-form-main-title',
    standalone: true,
    imports: [CommonModule, GuidelinesModalComponent],
    template: `
    <div class="form-main-title-wrapper">
      <div class="form-main-title-text">
        <span [innerHTML]="title"></span>
        <span class="help-icon" (click)="onHelpClick()" title="View Guidelines">
          (<span class="question-mark">?</span>)
        </span>
      </div>
    </div>

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
export class FormMainTitleComponent {
    @Input() title = '';
    @Input() modalTitle = 'Guidelines for Applicants';
    @Input() endpoint = '';
    @Input() customModal = false;

    @Output() helpClick = new EventEmitter<void>();

    @ViewChild('guidelinesModal') guidelinesModal!: GuidelinesModalComponent;

    onHelpClick() {
        if (this.customModal) {
            this.helpClick.emit();
        } else if (this.guidelinesModal) {
            this.guidelinesModal.open();
        }
    }
}
