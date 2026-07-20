import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'forms',
    loadComponent: () =>
      import('./forms/forms.component').then(m => m.FormsComponent),
  },
  {
    path: 'dropdown-categories',
    loadComponent: () =>
      import('./dropdown-categories/dropdown-categories.component').then(
        m => m.DropdownCategoriesComponent,
      ),
  },
  {
    path: 'account-code-categories',
    loadComponent: () =>
      import('./account-codes/account-code-categories.component').then(
        m => m.AccountCodeCategoriesComponent,
      ),
  },
  {
    path: 'account-codes',
    loadComponent: () =>
      import('./account-codes/account-codes.component').then(m => m.AccountCodesComponent),
  },
  {
    path: 'staff-directory',
    loadComponent: () =>
      import('./staff-directory/staff-directory.component').then(m => m.StaffDirectoryComponent),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./departments/departments.component').then(m => m.DepartmentsComponent),
  },
  {
    path: 'academic-staff',
    loadComponent: () =>
      import('./academic-staff/academic-staff.component').then(m => m.AcademicStaffComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./roles/roles.component').then(m => m.RolesComponent),
  },
  {
    path: 'roles-users',
    redirectTo: 'users',
    pathMatch: 'full',
  },
  {
    path: 'system-access',
    loadComponent: () =>
      import('./system-access/system-access.component').then(m => m.SystemAccessComponent),
  },
  {
    path: 'blocked-users',
    redirectTo: 'system-access',
    pathMatch: 'full',
  },
  {
    path: 'applicant-rules',
    loadComponent: () =>
      import('./applicant-rules/applicant-rules.component').then(m => m.ApplicantRulesComponent),
  },
  {
    path: 'workflow',
    loadComponent: () =>
      import('./workflow/workflow.component').then(m => m.WorkflowComponent),
  },
];
