import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormDropdownOptionsManagerComponent,
  FormDropdownTab,
} from '../shared/form-dropdown-options-manager.component';

@Component({
  selector: 'app-ra-gra-dropdown-options',
  standalone: true,
  imports: [CommonModule, FormDropdownOptionsManagerComponent],
  templateUrl: './ra-gra-dropdown-options.component.html',
  styleUrls: ['./ra-gra-dropdown-options.component.scss'],
})
export class RaGraDropdownOptionsComponent {
  readonly tabs: FormDropdownTab[] = [
    {
      key: 'RESEARCH_CLUSTER',
      label: 'Research Cluster',
      source: 'empty',
      icon: 'hub',
    },
    {
      key: 'PROGRAMME_TYPE',
      label: 'Programme Type',
      source: 'empty',
      icon: 'school',
    },
    {
      key: 'SUPERVISOR_TYPE',
      label: 'Supervisor Type',
      source: 'empty',
      icon: 'supervisor_account',
    },
    {
      key: 'FUNDING_TYPE',
      label: 'Funding Type',
      source: 'empty',
      icon: 'payments',
    },
  ];
}
