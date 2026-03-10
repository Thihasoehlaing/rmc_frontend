import { Routes } from '@angular/router';
import { JournalPublicationApplication } from './pages/journal-publication-application/journal-publication-application';

export const journalPublicationFormRoutes: Routes = [
    { path: 'application', component: JournalPublicationApplication },
    { path: '', redirectTo: 'application', pathMatch: 'full' }
];