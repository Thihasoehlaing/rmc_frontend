import { Routes } from '@angular/router';

export const rdigApplicationRoutes: Routes = [
  {
    path: 'detail/:requestCode',
    loadComponent: () =>
      import('./rdig-detail.component').then(m => m.RdigDetailComponent),
  },
  {
    path: 'application',
    loadComponent: () =>
      import('./rdig_form.component').then(m => m.RdigApplicationComponent),
  },
];
