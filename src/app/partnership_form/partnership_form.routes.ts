import { Routes } from '@angular/router';
import { PartnershipFormComponent } from './partnership_form.component';

export const partnershipFormRoutes: Routes = [
  { path: 'application', component: PartnershipFormComponent },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];
