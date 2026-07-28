import { Routes } from '@angular/router';

import { formActiveGuard } from '../../core/guards/form-active.guard';

export const rdigApplicationRoutes: Routes = [
  {
    path: 'detail/:requestCode',
    loadComponent: () =>
      import('./rdig-detail.component').then(m => m.RdigDetailComponent),
  },
  {
    path: 'application',
    canActivate: [formActiveGuard],
    data: {
      formCode: 'RDIG',
    },
    loadComponent: () =>
      import('./rdig_form.component').then(m => m.RdigApplicationComponent),
  },
];
