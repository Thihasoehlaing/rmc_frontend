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
      title: 'Form Setting',
      description: 'View active and inactive application forms registered in the system.',
      icon: 'dynamic_form',
      category: 'Form Configuration',
      route: '/admin-settings/form-setting',
      tone: 'teal',
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
      title: 'Manage Project Account Code',
      description: 'Maintain externally sourced project account codes used by Conference and Journal forms.',
      icon: 'account_balance_wallet',
      category: 'Finance Configuration',
      route: '/admin-settings/manage-project-account-code',
      tone: 'blue',
    },
    {
      title: 'Manage External Form Category',
      description: 'Configure External Grant Category options for the External Project Data Entry form.',
      icon: 'category',
      category: 'Form Configuration',
      route: '/admin-settings/manage-external-form-category',
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
      title: 'RDIG Blocked List',
      description: 'Review staff eligibility and manage application access restrictions.',
      icon: 'manage_accounts',
      category: 'Access Control',
      route: '/admin-settings/staff-access',
      tone: 'teal',
    },
    {
      title: 'Manage RDIG Reviewer',
      description: 'Assign or unassign eligible academic staff from the RDIG reviewer pool.',
      icon: 'groups',
      category: 'Review Management',
      route: '/admin-settings/manage-rdig-reviewer',
      tone: 'slate',
    },
  ];
}
