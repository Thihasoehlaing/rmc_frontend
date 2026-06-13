import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { ProfileComponent } from './layout/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { NavPermission } from './core/interfaces/permission.interface';

export const routes: Routes = [
  // ── Public routes ────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
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

      // ── Submissions ──────────────────────────────────────────────────────
      {
        path: 'submissions',
        children: [
          {
            path: 'inbox',
            loadComponent: () =>
              import('./features/submissions/inbox/inbox.component').then(m => m.InboxComponent),
          },
          {
            path: 'draft',
            loadComponent: () =>
              import('./features/submissions/drafts/drafts.component').then(m => m.DraftsComponent),
          },
          {
            path: 'pending',
            loadComponent: () =>
              import('./features/submissions/pending/pending.component').then(m => m.PendingComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./features/submissions/history/history.component').then(m => m.HistoryComponent),
          },
          // Admin history uses the same history component but role filtering
          // already surfaces the correct applications server-side.
          {
            path: 'admin-history',
            loadComponent: () =>
              import('./features/submissions/history/history.component').then(m => m.HistoryComponent),
          },
        ],
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
          import('./features/rdig/rdig_form.component').then(m => m.RdigApplicationComponent),
      },

      // ── Conference Application ────────────────────────────────────────────
      // Rule: ((full_time OR contract) AND academic) OR Admin
      {
        path: 'conference',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyCondition: [
              {
                anyOf: ['full_time', 'contract'],
                allOf: ['academic'],
                excludeGroups: ['Reviewer', 'HOS'],
              },
              {
                anyOf: ['Admin'],
              },
            ],
          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./features/conference/conference_form.routes').then(m => m.conferenceFormRoutes),
      },

      // ── Journal Publication ───────────────────────────────────────────────
      // Rule: ((full_time OR contract) AND academic) OR HOS OR VC OR Admin
      {
        path: 'journal',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyCondition: [
              { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
              { anyOf: ['HOS'] },
              { anyOf: ['VC'] },
              { anyOf: ['Admin'] },            ],          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./features/journal-publication/journal_publication_form.routes').then(
            m => m.journalPublicationFormRoutes
          ),
      },

      // ── RA/GRA Application ────────────────────────────────────────────────
      // Rule: (full_time OR contract) AND academic
      {
        path: 'ragra',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyOf: ['full_time', 'contract'],
            allOf: ['academic'],
          } satisfies NavPermission,
        },
        loadComponent: () =>
          import('./features/ra-gra/RA-GRA_form.component').then(m => m.RagraFormComponent),
      },

      // ── Travel Authorization ─────────────────────────────────────────────
      // Rule: all authenticated users EXCEPT Admin
      {
        path: 'travel-authorization',
        canActivate: [permissionGuard],
        data: {
          permission: {
            excludeGroups: ['Admin'],
          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./features/travel-authorization/travel_authorization_form.routes').then(
            m => m.travelAuthorizationFormRoutes
          ),
      },

      // ── Partnership Application ───────────────────────────────────────────
      // Rule: (full_time OR contract) AND academic
      {
        path: 'partnership',
        canActivate: [permissionGuard],
        data: {
          permission: {
            anyCondition: [
              {
                anyOf: ['full_time', 'contract'],
                allOf: ['academic'],
              },
              { anyOf: ['Admin'] },
            ],
          } satisfies NavPermission,
        },
        loadChildren: () =>
          import('./features/partnership/partnership_form.routes').then(
            m => m.partnershipFormRoutes
          ),
      },

      // ── Admin Settings — Admin group only ────────────────────────────────
      {
        path: 'settings',
        children: [
          {
            path: '',
            redirectTo: 'admin-settings',
            pathMatch: 'full'
          },
            {
                path: 'admin-settings',
                loadComponent: () => import('./features/admin-settings/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent)
            },
            {
                path: 'guidelines',
                loadComponent: () => import('./features/admin-settings/guidelines/guidelines.component').then(m => m.GuidelinesComponent)
            },
            {
                path: 'dropdowns',
                loadComponent: () => import('./features/admin-settings/dropdowns/dropdowns.component').then(m => m.DropdownsComponent)
            },
            {
              path: 'rdig-dropdown-options',
              loadComponent: () => import('./features/admin-settings/dropdowns/dropdowns.component').then(m => m.DropdownsComponent)
            },
            {
                path: 'batches',
              loadComponent: () => import('./features/admin-settings/batch-sitting/batch-sitting.component').then(m => m.BatchSittingComponent)
            },
            {
                path: 'staff-access',
                loadComponent: () => import('./features/admin-settings/staff-access/staff-access.component').then(m => m.StaffAccessComponent)
            },
            {
              path: 'external-project-data-entry',
              loadComponent: () => import('./features/admin-settings/external-project-data-entry/external-project-data-entry.component').then(m => m.ExternalProjectDataEntryComponent)
            },
            {
                path: 'batch-sitting',
                canActivate: [permissionGuard],
                data: {
                    permission: { allOf: ['RMC'] } satisfies NavPermission,
                },
                loadComponent: () =>
                    import('./features/admin-settings/batch-sitting/batch-sitting.component').then(m => m.BatchSittingComponent),
            },
        ]
      },

      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Catch-all → redirect to login
  { path: '**', redirectTo: '/login' },
];
