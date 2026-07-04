import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormDropdownOptionsManagerComponent,
  FormDropdownTab,
} from '../shared/form-dropdown-options-manager.component';

@Component({
  selector: 'app-journal-dropdown-options',
  standalone: true,
  imports: [CommonModule, FormDropdownOptionsManagerComponent],
  templateUrl: './journal-dropdown-options.component.html',
  styleUrls: ['./journal-dropdown-options.component.scss'],
})
export class JournalDropdownOptionsComponent {
  readonly tabs: FormDropdownTab[] = [
    {
      key: 'TYPE_OF_ORGANISATION',
      label: 'Type of Organisation',
      source: 'dropdown',
      categoryCode: 'TYPE_OF_ORGANISATION',
      formCode: 'JOURNAL',
      icon: 'corporate_fare',
    },
    {
      key: 'ITEM_DESCRIPTION',
      label: 'Item Description',
      source: 'dropdown',
      categoryCode: 'ITEM_DESCRIPTION',
      formCode: 'JOURNAL',
      icon: 'receipt_long',
    },
  ];

  readonly formCodes = ['CONFERENCE', 'JOURNAL', 'TRAVEL_AUTH'];
}
