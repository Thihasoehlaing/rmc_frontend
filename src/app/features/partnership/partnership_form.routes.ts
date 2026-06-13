import { Routes } from '@angular/router';
import { PartnershipFormComponent } from './partnership_form.component';
import { PartnershipSettingsComponent } from './pages/partnership-settings/partnership-settings.component';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';

export const partnershipFormRoutes: Routes = [
  { path: 'application', component: PartnershipFormComponent },
  {
      path: 'settings',
      component: PartnershipSettingsComponent,
      canActivate: [permissionGuard],
      data: {
          permission: {
              anyOf: ['Admin']
          } satisfies NavPermission
      }
  },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];
