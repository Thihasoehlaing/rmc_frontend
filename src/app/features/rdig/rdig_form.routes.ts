import { Routes } from '@angular/router';

import { formActiveGuard } from '../../core/guards/form-active.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import {
  fundingDetailPermission,
  rdigPermission,
} from '../../core/routing/app-route-permissions';

export const rdigApplicationRoutes: Routes = [
  {
    path: 'detail/:requestCode',
    canActivate: [permissionGuard],
    data: {
      permission: fundingDetailPermission,
    },
    loadComponent: () =>
      import('./pages/rdig-details/rdig-details.component').then(m => m.RdigDetailsComponent),
  },
  {
    path: 'application',
    canActivate: [permissionGuard, formActiveGuard],
    data: {
      permission: rdigPermission,
      formCode: 'RDIG',
    },
    loadComponent: () =>
      import('./rdig_form.component').then(m => m.RdigApplicationComponent),
  },
];
