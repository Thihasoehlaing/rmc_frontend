import { Routes } from '@angular/router';
import { ConferenceApplication } from './pages/conference-application/conference-application';
import { ConferenceSettingsComponent } from './pages/conference-settings/conference-settings.component';
import { permissionGuard } from '../../core/guards/permission.guard';
import { NavPermission } from '../../core/interfaces/permission.interface';

export const conferenceFormRoutes: Routes = [
    { path: 'application', component: ConferenceApplication },
    {
        path: 'settings',
        component: ConferenceSettingsComponent,
        canActivate: [permissionGuard],
        data: {
            permission: {
                anyOf: ['Admin']
            } satisfies NavPermission
        }
    },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];
