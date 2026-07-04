import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-journal-dropdown-options',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './journal-dropdown-options.component.html',
  styleUrls: ['./journal-dropdown-options.component.scss'],
})
export class JournalDropdownOptionsComponent {
  readonly categories = [
    'Project Account Code',
    'Vote Number',
    'Account Code',
    'Item Description',
    'Type of Organisation',
  ];
}
