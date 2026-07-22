import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import {
  adminHistoryPermission,
  submissionsAdminOnlyPermission,
  submissionsDraftPendingPermission,
  submissionsInboxHistoryPermission,
} from '../../core/routing/app-route-permissions';

export const submissionsRoutes: Routes = [
  {
    path: 'detail/:requestId',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsAdminOnlyPermission,
    },
    loadComponent: () =>
      import('./request-detail/request-detail.component').then(m => m.RequestDetailComponent),
  },
  {
    path: 'action/:requestId',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsAdminOnlyPermission,
    },
    loadComponent: () =>
      import('./request-action/request-action.component').then(m => m.RequestActionComponent),
  },
  {
    path: 'inbox',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsInboxHistoryPermission,
    },
    loadComponent: () =>
      import('./inbox/inbox.component').then(m => m.InboxComponent),
  },
  {
    path: 'draft',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsDraftPendingPermission,
    },
    loadComponent: () =>
      import('./drafts/drafts.component').then(m => m.DraftsComponent),
  },
  {
    path: 'pending',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsDraftPendingPermission,
    },
    loadComponent: () =>
      import('./pending/pending.component').then(m => m.PendingComponent),
  },
  {
    path: 'history',
    canActivate: [permissionGuard],
    data: {
      permission: submissionsInboxHistoryPermission,
    },
    loadComponent: () =>
      import('./history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'admin-history',
    canActivate: [permissionGuard],
    data: {
      permission: adminHistoryPermission,
    },
    loadComponent: () =>
      import('./history/history.component').then(m => m.HistoryComponent),
  },
];
