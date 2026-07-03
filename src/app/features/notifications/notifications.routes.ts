import { Routes } from '@angular/router';

export const notificationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./notifications.component').then(m => m.NotificationsComponent),
  },
];
