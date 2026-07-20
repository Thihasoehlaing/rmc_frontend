import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormDropdownOptionsManagerComponent,
  FormDropdownTab,
} from '../shared/form-dropdown-options-manager.component';

@Component({
  selector: 'app-travel-dropdown-options',
  standalone: true,
  imports: [CommonModule, FormDropdownOptionsManagerComponent],
  templateUrl: './travel-dropdown-options.component.html',
  styleUrls: ['./travel-dropdown-options.component.scss'],
})
export class TravelDropdownOptionsComponent {
  readonly tabs: FormDropdownTab[] = [
    {
      key: 'ITEM_DESCRIPTION',
      label: 'Item Description',
      source: 'dropdown',
      categoryCode: 'ITEM_DESCRIPTION',
      formCode: 'TRAVEL_AUTH',
      icon: 'receipt_long',
    },
  ];

  readonly formCodes = ['CONFERENCE', 'JOURNAL', 'TRAVEL_AUTH'];
}
