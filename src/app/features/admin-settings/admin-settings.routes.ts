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
    loadComponent: () =>
      import('./dropdowns/dropdowns.component').then(m => m.DropdownsComponent),
  },
  {
    path: 'rdig-dropdown-options',
    loadComponent: () =>
      import('./dropdowns/dropdowns.component').then(m => m.DropdownsComponent),
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
    path: 'staff-directory',
    loadComponent: () =>
      import('./staff-directory/staff-directory.component').then(m => m.StaffDirectoryComponent),
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

