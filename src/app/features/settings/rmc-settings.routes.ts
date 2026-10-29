import { Routes } from '@angular/router';

export const rmcSettingsRoutes: Routes = [
  { path: '', loadComponent: () => import('./rmc-settings.component').then(m => m.RmcSettingsComponent) },
  { path: 'applicant-rules', loadComponent: () => import('./applicant-rules/applicant-rules.component').then(m => m.ApplicantRulesComponent) },
  { path: 'request-statuses', loadComponent: () => import('./request-statuses/request-statuses.component').then(m => m.RequestStatusesComponent) },
  // Preserve old administration bookmarks by taking them to the main settings shell.
  ...['users','roles','roles-users','system-access','blocked-users','workspaces','staff-directory','departments','monitoring','forms','dropdown-categories','account-code-categories','account-codes','vote-numbers','academic-staff']
    .map(path => ({path, redirectTo: '/main-settings/' + path, pathMatch: 'full' as const})),
];
