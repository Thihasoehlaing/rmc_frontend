import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';
import {
  disabledFeaturePermission,
  fundingApplicationPermission,
  fundingDetailPermission,
} from '../../core/routing/app-route-permissions';

export const conferenceFormRoutes: Routes = [
  {
    path: 'application',
    loadComponent: () =>
      import('./pages/conference-application/conference-application').then(
        (m) => m.ConferenceApplication,
      ),
    canActivate: [permissionGuard],
    data: {
      permission: fundingApplicationPermission,
    },
  },
  {
    path: 'detail/:requestCode',
    loadComponent: () =>
      import('./pages/conference-review/conference-review.component').then(
        (m) => m.ConferenceReviewComponent,
      ),
    canActivate: [permissionGuard],
    data: {
      permission: fundingDetailPermission,
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/conference-settings/conference-settings.component').then(
        (m) => m.ConferenceSettingsComponent,
    ),
    canActivate: [permissionGuard],
    data: {
      permission: disabledFeaturePermission satisfies NavPermission,
    },
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' },
];
