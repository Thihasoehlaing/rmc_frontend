import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-travel-dropdown-options',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './travel-dropdown-options.component.html',
  styleUrls: ['./travel-dropdown-options.component.scss'],
})
export class TravelDropdownOptionsComponent {
  readonly categories = ['Item Description'];
}
