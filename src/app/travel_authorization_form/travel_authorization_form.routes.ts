import { Routes } from '@angular/router';
import { TravelAuthorizationApplicationComponent } from './pages/travel-authorization-application/travel-authorization-application.component';

export const travelAuthorizationFormRoutes: Routes = [
    { path: 'application', component: TravelAuthorizationApplicationComponent },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];
