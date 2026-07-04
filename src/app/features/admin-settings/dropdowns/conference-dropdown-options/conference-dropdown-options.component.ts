import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormDropdownOptionsManagerComponent,
  FormDropdownTab,
} from '../shared/form-dropdown-options-manager.component';

@Component({
  selector: 'app-conference-dropdown-options',
  standalone: true,
  imports: [CommonModule, FormDropdownOptionsManagerComponent],
  templateUrl: './conference-dropdown-options.component.html',
  styleUrls: ['./conference-dropdown-options.component.scss'],
})
export class ConferenceDropdownOptionsComponent {
  readonly tabs: FormDropdownTab[] = [
    {
      key: 'REGION',
      label: 'Region',
      source: 'region',
      icon: 'public',
      nameLabel: 'Region Name',
    },
    {
      key: 'PROJECT_ACCOUNT_CODE',
      label: 'Project Account Code',
      source: 'project-account-code',
      formCode: 'CONFERENCE',
      icon: 'account_balance_wallet',
      codeLabel: 'Project Account Code',
      nameLabel: 'Description',
    },
    {
      key: 'VOTE_NUMBER',
      label: 'Vote Number',
      source: 'vote-number',
      formCode: 'CONFERENCE',
      icon: 'pin',
      codeLabel: 'Vote Number',
      nameLabel: 'Description',
    },
    {
      key: 'ITEM_DESCRIPTION',
      label: 'Item Description',
      source: 'dropdown',
      categoryCode: 'ITEM_DESCRIPTION',
      formCode: 'CONFERENCE',
      icon: 'receipt_long',
    },
    {
      key: 'TYPE_OF_ORGANISATION',
      label: 'Type of Organisation',
      source: 'dropdown',
      categoryCode: 'TYPE_OF_ORGANISATION',
      formCode: 'CONFERENCE',
      icon: 'corporate_fare',
    },
  ];

  readonly formCodes = ['CONFERENCE', 'JOURNAL', 'TRAVEL_AUTH'];
}
