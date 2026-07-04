import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormDropdownOptionsManagerComponent,
  FormDropdownTab,
} from '../shared/form-dropdown-options-manager.component';

@Component({
  selector: 'app-partnership-dropdown-options',
  standalone: true,
  imports: [CommonModule, FormDropdownOptionsManagerComponent],
  templateUrl: './partnership-dropdown-options.component.html',
  styleUrls: ['./partnership-dropdown-options.component.scss'],
})
export class PartnershipDropdownOptionsComponent {
  readonly tabs: FormDropdownTab[] = [
    {
      key: 'PARTNERSHIP_TYPE',
      label: 'Partnership Type',
      source: 'empty',
      icon: 'handshake',
    },
    {
      key: 'PARTNERSHIP_CATEGORY',
      label: 'Partnership Category',
      source: 'empty',
      icon: 'category',
    },
  ];

  readonly formCodes = ['PARTNERSHIP'];
}
