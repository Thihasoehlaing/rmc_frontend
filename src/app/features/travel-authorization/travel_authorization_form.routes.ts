import { Routes } from '@angular/router';

export const travelAuthorizationFormRoutes: Routes = [
    {
        path: 'application',
        loadComponent: () =>
            import('./pages/travel-authorization-application/travel-authorization-application.component').then(
                m => m.TravelAuthorizationApplicationComponent
            ),
    },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];
