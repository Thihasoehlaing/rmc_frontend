import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-conference-dropdown-options',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conference-dropdown-options.component.html',
  styleUrls: ['./conference-dropdown-options.component.scss'],
})
export class ConferenceDropdownOptionsComponent {
  readonly categories = [
    'Select Region',
    'Project Account Code',
    'Vote Number',
    'Item Description',
    'Type of Organisation',
  ];
}
