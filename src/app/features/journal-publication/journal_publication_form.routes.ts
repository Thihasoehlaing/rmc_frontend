import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';
import {
  disabledFeaturePermission,
  fundingApplicationPermission,
  fundingDetailPermission,
} from '../../core/routing/app-route-permissions';

export const journalPublicationFormRoutes: Routes = [
  {
    path: 'application',
    loadComponent: () =>
      import('./journal-publication-form.component').then(m => m.JournalPublicationFormComponent),
    canActivate: [permissionGuard],
    data: {
      permission: fundingApplicationPermission,
    },
  },
  {
    path: 'detail/:requestCode',
    loadComponent: () =>
      import('./pages/journal-review/journal-review.component').then(m => m.JournalReviewComponent),
    canActivate: [permissionGuard],
    data: {
      permission: fundingDetailPermission,
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/journal-settings/journal-settings.component').then(m => m.JournalSettingsComponent),
    canActivate: [permissionGuard],
    data: {
      permission: disabledFeaturePermission satisfies NavPermission,
    },
  },
  {
    path: 'guidelines-settings',
    loadComponent: () =>
      import('./pages/journal-guidelines-settings/journal-guidelines-settings.component').then(
        m => m.JournalGuidelinesSettingsComponent,
      ),
    canActivate: [permissionGuard],
    data: {
      permission: disabledFeaturePermission satisfies NavPermission,
    },
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' },
];
