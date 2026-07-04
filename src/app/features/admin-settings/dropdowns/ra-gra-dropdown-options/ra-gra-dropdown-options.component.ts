import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ra-gra-dropdown-options',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ra-gra-dropdown-options.component.html',
  styleUrls: ['./ra-gra-dropdown-options.component.scss'],
})
export class RaGraDropdownOptionsComponent {
  readonly categories = ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'];
}
