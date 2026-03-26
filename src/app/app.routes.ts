import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { ProfileComponent } from './layout/profile/profile.component';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { NavPermission } from './interfaces/permission.interface';

export const routes: Routes = [
  // ── Public routes ────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
  },

  // ── Protected layout — authGuard blocks unauthenticated users ────────────
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      // Accessible to ALL authenticated users
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      {
        path: 'showcase',
        loadComponent: () =>
          import('./shared/components/showcase/showcase').then(m => m.ShowcaseComponent),
      },

      // ── RDIG Application ─────────────────────────────────────────────────
      // Rule: (full_time OR contract) AND academic, NOT Reviewer, NOT HOS
      {
        path: 'rdig',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyOf: ['full_time', 'contract'],
            allOf: ['academic'],
            excludeGroups: ['Reviewer', 'HOS'],
          } satisfies NavPermission,
        },
        loadComponent: () =>
          import('./rdig_form/rdig_form.component').then(m => m.RdigApplicationComponent),
      },

      // ── Conference Application ────────────────────────────────────────────
      // Rule: (full_time OR contract) AND academic, NOT Reviewer, NOT HOS
      {
        path: 'conference',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyOf: ['full_time', 'contract'],
            allOf: ['academic'],
            excludeGroups: ['Reviewer', 'HOS'],
          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./conference_form/conference_form.routes').then(m => m.conferenceFormRoutes),
      },

      // ── Journal Publication ───────────────────────────────────────────────
      // Rule: ((full_time OR contract) AND academic) OR HOS OR VC
      {
        path: 'journal',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyCondition: [
              { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
              { anyOf: ['HOS'] },
              { anyOf: ['VC'] },
            ],
          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./journal_publication_form/journal_publication_form.routes').then(
            m => m.journalPublicationFormRoutes
          ),
      },

      // ── RA/GRA Application ────────────────────────────────────────────────
      // Rule: (HOS AND (full_time OR contract) AND academic) OR ra_gra_hos_pass
      {
        path: 'ragra',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyCondition: [
              { anyOf: ['full_time', 'contract'], allOf: ['academic', 'HOS'] },
              { anyOf: ['group_ra_gra_hos_pass'] },
            ],
          } satisfies NavPermission,
        },
        loadComponent: () =>
          import('./ragra_form/ragra-form.component').then(m => m.RagraFormComponent),
      },

      // ── RMC Settings —  RMC group only ───────────────────────────────────
      {
        path: 'settings',
        children: [
            {
                path: 'rdig-dropdown-options',
                loadComponent: () => import('./settings/rdig-dropdown-options/rdig-dropdown-options').then(m => m.RdigDropdownOptions)
            }
        ]
      },

      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Catch-all → redirect to login
  { path: '**', redirectTo: '/login' },
];
