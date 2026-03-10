import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { ProfileComponent } from './layout/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'showcase', loadComponent: () => import('./shared/components/showcase/showcase').then(m => m.ShowcaseComponent) },
      // Lazy-loaded form modules
      {
        path: 'rdig',
        loadComponent: () => import('./rdig_form/rdig_form.component').then(m => m.RdigApplicationComponent)
      },
      {
        path: 'conference',
        loadChildren: () => import('./conference_form/conference_form.routes').then(m => m.conferenceFormRoutes)
      },
      {
        path: 'journal',
        loadChildren: () => import('./journal_publication_form/journal_publication_form.routes').then(m => m.journalPublicationFormRoutes)
      },
      {
        path: 'ragra',
        loadComponent: () => import('./form-four/form-four.component').then(m => m.FormFourComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
