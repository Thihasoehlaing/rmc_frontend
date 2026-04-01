import { Routes } from '@angular/router';
import { ConferenceApplication } from './pages/conference-application/conference-application';
import { ConferenceSettingsComponent } from './pages/conference-settings/conference-settings.component';

export const conferenceFormRoutes: Routes = [
    { path: 'application', component: ConferenceApplication },
    { path: 'settings', component: ConferenceSettingsComponent },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];
