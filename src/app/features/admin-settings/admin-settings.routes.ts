import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';

export const adminSettingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent),
  },
  {
    path: 'guidelines',
    loadComponent: () =>
      import('./guidelines/guidelines.component').then(m => m.GuidelinesComponent),
  },
  {
    path: 'dropdowns',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dropdowns/dropdowns.component').then(m => m.DropdownsComponent),
      },
      {
        path: 'rdig-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/rdig-dropdown-options/rdig-dropdown-options.component').then(
            m => m.RdigDropdownOptionsComponent,
          ),
      },
      {
        path: 'ra-gra-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/ra-gra-dropdown-options/ra-gra-dropdown-options.component').then(
            m => m.RaGraDropdownOptionsComponent,
          ),
      },
      {
        path: 'conference-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/conference-dropdown-options/conference-dropdown-options.component').then(
            m => m.ConferenceDropdownOptionsComponent,
          ),
      },
      {
        path: 'journal-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/journal-dropdown-options/journal-dropdown-options.component').then(
            m => m.JournalDropdownOptionsComponent,
          ),
      },
      {
        path: 'travel-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/travel-dropdown-options/travel-dropdown-options.component').then(
            m => m.TravelDropdownOptionsComponent,
          ),
      },
      {
        path: 'partnership-dropdown-options',
        loadComponent: () =>
          import('./dropdowns/partnership-dropdown-options/partnership-dropdown-options.component').then(
            m => m.PartnershipDropdownOptionsComponent,
          ),
      },
    ],
  },
  {
    path: 'batches',
    loadComponent: () =>
      import('./batch-sitting/batch-sitting.component').then(m => m.BatchSittingComponent),
  },
  {
    path: 'staff-access',
    loadComponent: () =>
      import('./staff-access/staff-access.component').then(m => m.StaffAccessComponent),
  },
  {
    path: 'manage-rdig-reviewer',
    loadComponent: () =>
      import('./manage-rdig-reviewer/manage-rdig-reviewer.component').then(
        m => m.ManageRdigReviewerComponent,
      ),
  },
  {
    path: 'batch-sitting',
    canActivate: [permissionGuard],
    data: {
      permission: { allOf: ['RMC'] } satisfies NavPermission,
    },
    loadComponent: () =>
      import('./batch-sitting/batch-sitting.component').then(m => m.BatchSittingComponent),
  },
];
