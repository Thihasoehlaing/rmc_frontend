import { Routes } from '@angular/router';
import { JournalPublicationFormComponent } from './journal-publication-form.component';

export const journalPublicationFormRoutes: Routes = [
  { path: 'application', component: JournalPublicationFormComponent },
  { path: '', redirectTo: 'application', pathMatch: 'full' }
];