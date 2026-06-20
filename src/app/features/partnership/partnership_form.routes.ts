import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';

export const partnershipFormRoutes: Routes = [
  {
    path: 'application',
    loadComponent: () =>
      import('./partnership_form.component').then(m => m.PartnershipFormComponent),
  },
  {
      path: 'settings',
      loadComponent: () =>
        import('./pages/partnership-settings/partnership-settings.component').then(
          m => m.PartnershipSettingsComponent
        ),
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];
