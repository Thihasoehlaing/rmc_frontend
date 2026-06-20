import { Routes } from '@angular/router';

export const showcaseRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./showcase').then(m => m.ShowcaseComponent),
  },
];
