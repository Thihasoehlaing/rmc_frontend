import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import {
  adminSettingsPermission,
  externalProjectDataEntryPermission,
  externalProjectDetailPermission,
  partnershipPermission,
  ragraPermission,
  rdigPermission,
  reportPermission,
  systemOrRmcAdminPermission,
  systemSettingsPermission,
  travelAuthorizationPermission,
} from './core/routing/app-route-permissions';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'analysis-dashboard',
        canActivate: [permissionGuard],
        data: {
          analysis: true,
          permission: systemOrRmcAdminPermission,
        },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.profileRoutes),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then((m) => m.notificationRoutes),
      },
      {
        path: 'showcase',
        canActivate: [permissionGuard],
        data: {
          permission: systemSettingsPermission,
        },
        loadChildren: () =>
          import('./shared/components/showcase/showcase.routes').then((m) => m.showcaseRoutes),
      },
      {
        path: 'submissions',
        loadChildren: () =>
          import('./features/submissions/submissions.routes').then((m) => m.submissionsRoutes),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: {
          permission: reportPermission,
        },
        loadComponent: () =>
          import('./features/reports/request-reports.component').then(
            (m) => m.RequestReportsComponent,
          ),
      },
      {
        path: 'rdig',
        canActivate: [permissionGuard],
        data: {
          permission: rdigPermission,
        },
        loadChildren: () =>
          import('./features/rdig/rdig_form.routes').then((m) => m.rdigApplicationRoutes),
      },
      {
        path: 'conference',
        loadChildren: () =>
          import('./features/conference/conference_form.routes').then(
            (m) => m.conferenceFormRoutes,
          ),
      },
      {
        path: 'journal',
        loadChildren: () =>
          import('./features/journal-publication/journal_publication_form.routes').then(
            (m) => m.journalPublicationFormRoutes,
          ),
      },
      {
        path: 'ragra',
        canActivate: [permissionGuard],
        data: {
          permission: ragraPermission,
        },
        loadChildren: () =>
          import('./features/ra-gra/RA-GRA_form.routes').then((m) => m.ragraFormRoutes),
      },
      {
        path: 'travel-authorization',
        canActivate: [permissionGuard],
        data: {
          permission: travelAuthorizationPermission,
        },
        loadChildren: () =>
          import('./features/travel-authorization/travel_authorization_form.routes').then(
            (m) => m.travelAuthorizationFormRoutes,
          ),
      },
      {
        path: 'partnership',
        canActivate: [permissionGuard],
        data: {
          permission: partnershipPermission,
        },
        loadChildren: () =>
          import('./features/partnership/partnership_form.routes').then(
            (m) => m.partnershipFormRoutes,
          ),
      },
      {
        path: 'external-project-data-entry/detail/:requestCode',
        canActivate: [permissionGuard],
        data: {
          permission: externalProjectDetailPermission,
        },
        loadComponent: () =>
          import('./features/external-project-data-entry/external-project-detail.component').then(
            (m) => m.ExternalProjectDetailComponent,
          ),
      },
      {
        path: 'external-project-data-entry',
        canActivate: [permissionGuard],
        data: {
          permission: externalProjectDataEntryPermission,
        },
        loadComponent: () =>
          import('./features/external-project-data-entry/external-project-data-entry.component').then(
            (m) => m.ExternalProjectDataEntryComponent,
          ),
      },
      {
        path: 'admin-settings',
        canActivate: [permissionGuard],
        data: {
          permission: adminSettingsPermission,
        },
        loadChildren: () =>
          import('./features/admin-settings/admin-settings.routes').then(
            (m) => m.adminSettingsRoutes,
          ),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: {
          permission: systemSettingsPermission,
        },
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
      {
        path: 'no-access',
        loadComponent: () =>
          import('./features/error-pages/no-access/no-access.component').then(
            (m) => m.NoAccessComponent,
          ),
      },
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/error-pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: '**',
        loadComponent: () =>
          import('./features/error-pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '/not-found' },
];
