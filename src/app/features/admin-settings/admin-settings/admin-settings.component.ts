import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AdminCard {
  title: string;
  description: string;
  icon: string;
  category: string;
  route: string;
  tone: 'blue' | 'violet' | 'amber' | 'teal' | 'slate';
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent {
  readonly cards: AdminCard[] = [
    {
      title: 'Guidelines',
      description: 'Manage instruction notes and policies displayed across application forms.',
      icon: 'description',
      category: 'Content',
      route: '/admin-settings/guidelines',
      tone: 'blue',
    },
    {
      title: 'Dropdowns',
      description: 'Configure reusable selectable options by form and category.',
      icon: 'tune',
      category: 'Configuration',
      route: '/admin-settings/dropdowns',
      tone: 'violet',
    },
    {
      title: 'Batches',
      description: 'Control submission periods, active batches, and application grouping.',
      icon: 'calendar_month',
      category: 'Scheduling',
      route: '/admin-settings/batches',
      tone: 'amber',
    },
    {
      title: 'Staff Access',
      description: 'Review staff eligibility and manage application access restrictions.',
      icon: 'manage_accounts',
      category: 'Access Control',
      route: '/admin-settings/staff-access',
      tone: 'teal',
    },
    {
      title: 'External Project Data Entry',
      description: 'Maintain external project intake and supporting project information.',
      icon: 'folder_managed',
      category: 'Project Data',
      route: '/admin-settings/external-project-data-entry',
      tone: 'slate',
    },
  ];
}
