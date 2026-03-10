import { Routes } from '@angular/router';
import { ConferenceApplication } from './pages/conference-application/conference-application';

export const conferenceFormRoutes: Routes = [
    { path: 'application', component: ConferenceApplication },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];