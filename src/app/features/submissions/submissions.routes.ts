import { Routes } from '@angular/router';

export const submissionsRoutes: Routes = [
  {
    path: 'detail/:requestId',
    loadComponent: () =>
      import('./request-detail/request-detail.component').then(m => m.RequestDetailComponent),
  },
  {
    path: 'action/:requestId',
    loadComponent: () =>
      import('./request-action/request-action.component').then(m => m.RequestActionComponent),
  },
  {
    path: 'inbox',
    loadComponent: () =>
      import('./inbox/inbox.component').then(m => m.InboxComponent),
  },
  {
    path: 'draft',
    loadComponent: () =>
      import('./drafts/drafts.component').then(m => m.DraftsComponent),
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('./pending/pending.component').then(m => m.PendingComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'admin-history',
    loadComponent: () =>
      import('./history/history.component').then(m => m.HistoryComponent),
  },
];
