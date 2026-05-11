import { Routes } from '@angular/router';

export const ragraFormRoutes: Routes = [
  {
    path: '',
    redirectTo: 'form',
    pathMatch: 'full',
  },
  {
    path: 'form',
    loadComponent: () =>
      import('./RA-GRA_form.component').then(m => m.RagraFormComponent),
  },
];
