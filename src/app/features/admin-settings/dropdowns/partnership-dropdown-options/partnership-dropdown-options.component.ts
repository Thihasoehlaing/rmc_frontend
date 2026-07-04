import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-partnership-dropdown-options',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './partnership-dropdown-options.component.html',
  styleUrls: ['./partnership-dropdown-options.component.scss'],
})
export class PartnershipDropdownOptionsComponent {
  readonly categories = ['Partnership Type', 'Partnership Category'];
}
