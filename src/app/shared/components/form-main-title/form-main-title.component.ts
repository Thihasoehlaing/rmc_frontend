import { Component, Input, ViewChild } from '@angular/core';
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
        <span class="help-icon" (click)="guidelinesModal.open()" title="View Guidelines">
          (<span class="question-mark">?</span>)
        </span>
      </div>
    </div>

    <app-guidelines-modal 
      #guidelinesModal 
      [title]="modalTitle" 
      [endpoint]="endpoint">
    </app-guidelines-modal>
  `,
    styleUrls: ['./form-main-title.component.scss']
})
export class FormMainTitleComponent {
    @Input() title = '';
    @Input() modalTitle = 'Guidelines for Applicants';
    @Input() endpoint = '';

    @ViewChild('guidelinesModal') guidelinesModal!: GuidelinesModalComponent;
}
