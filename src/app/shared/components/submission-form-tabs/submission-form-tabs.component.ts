import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SubmissionFormTab {
  value: string;
  label: string;
}

@Component({
  selector: 'app-submission-form-tabs',
  standalone: true,
  templateUrl: './submission-form-tabs.component.html',
  styleUrl: './submission-form-tabs.component.scss',
})
export class SubmissionFormTabsComponent {
  @Input({ required: true }) tabs: readonly SubmissionFormTab[] = [];
  @Input({ required: true }) selectedValue = 'all';
  @Input() ariaLabel = 'Application form filters';
  @Output() selectedValueChange = new EventEmitter<string>();
}
