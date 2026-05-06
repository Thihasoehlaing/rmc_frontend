import { Routes } from '@angular/router';
import { JournalPublicationFormComponent } from './journal-publication-form.component';
import { JournalSettingsComponent } from './pages/journal-settings/journal-settings.component';
import { JournalGuidelinesSettingsComponent } from './pages/journal-guidelines-settings/journal-guidelines-settings.component';
import { permissionGuard } from '../guards/permission.guard';
import { NavPermission } from '../interfaces/permission.interface';

export const journalPublicationFormRoutes: Routes = [
  {
    path: 'application',
    component: JournalPublicationFormComponent,
    canActivate: [permissionGuard]
    // No permission data = any authenticated user may access
  },
  {
      path: 'settings',
      component: JournalSettingsComponent,
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  {
      path: 'guidelines-settings',
      component: JournalGuidelinesSettingsComponent,
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];