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
      key: 'VOTE_NUMBER',
      label: 'Vote Number',
      source: 'vote-number',
      formCode: 'JOURNAL',
      icon: 'pin',
      codeLabel: 'Vote Number',
      nameLabel: 'Description',
    },
    {
      key: 'ACCOUNT_CODE',
      label: 'Account Code',
      source: 'account-code',
      formCode: 'JOURNAL',
      icon: 'account_balance',
      codeLabel: 'Account Code',
      nameLabel: 'Description',
    },
    {
      key: 'ITEM_DESCRIPTION',
      label: 'Item Description',
      source: 'dropdown',
      categoryCode: 'ITEM_DESCRIPTION',
      formCode: 'JOURNAL',
      icon: 'receipt_long',
    },
    {
      key: 'TYPE_OF_ORGANISATION',
      label: 'Type of Organisation',
      source: 'dropdown',
      categoryCode: 'TYPE_OF_ORGANISATION',
      formCode: 'JOURNAL',
      icon: 'corporate_fare',
    },
  ];

  readonly formCodes = ['CONFERENCE', 'JOURNAL', 'TRAVEL_AUTH'];
}
