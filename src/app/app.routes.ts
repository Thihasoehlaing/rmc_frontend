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
        loadComponent: () => import('./form-one/form-one.component').then(m => m.RdigApplicationComponent)
      },
      {
        path: 'conference',
        loadComponent: () => import('./form-two/form-two.component').then(m => m.FormTwoComponent)
      },
      {
        path: 'journal',
        loadComponent: () => import('./form-three/form-three.component').then(m => m.FormThreeComponent)
      },
      {
        path: 'ragra',
        loadComponent: () => import('./form-four/form-four.component').then(m => m.FormFourComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
