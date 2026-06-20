import { Routes } from '@angular/router';

export const rdigApplicationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./rdig_form.component').then(m => m.RdigApplicationComponent),
  },
];
