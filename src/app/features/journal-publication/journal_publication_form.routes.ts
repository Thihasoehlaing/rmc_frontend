import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';

export const journalPublicationFormRoutes: Routes = [
  {
    path: 'application',
    loadComponent: () =>
      import('./journal-publication-form.component').then(m => m.JournalPublicationFormComponent),
    canActivate: [permissionGuard]
    // No permission data = any authenticated user may access
  },
  {
      path: 'settings',
      loadComponent: () =>
        import('./pages/journal-settings/journal-settings.component').then(m => m.JournalSettingsComponent),
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  {
      path: 'guidelines-settings',
      loadComponent: () =>
        import('./pages/journal-guidelines-settings/journal-guidelines-settings.component').then(
          m => m.JournalGuidelinesSettingsComponent
        ),
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];
