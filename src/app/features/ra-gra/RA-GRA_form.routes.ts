import { Routes } from '@angular/router';

export const ragraFormRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./RA-GRA_form.component').then(m => m.RagraFormComponent),
  },
];
