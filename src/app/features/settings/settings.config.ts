export type SettingsTone =
  | 'blue'
  | 'violet'
  | 'amber'
  | 'teal'
  | 'rose'
  | 'slate'
  | 'indigo';

export interface SettingsModuleConfig {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  route: string;
  tone: SettingsTone;
  endpoints: string[];
}

export const SETTINGS_MODULES: SettingsModuleConfig[] = [
  {
    key: 'forms',
    title: 'Forms',
    description: 'Manage available application forms and their active status.',
    icon: 'description',
    category: 'Application Setup',
    route: '/settings/forms',
    tone: 'blue',
    endpoints: ['/api/settings/forms'],
  },
  {
    key: 'dropdown-categories',
    title: 'Dropdown Categories',
    description: 'Define system dropdown categories used by configurable form options.',
    icon: 'list_alt',
    category: 'Configuration',
    route: '/settings/dropdown-categories',
    tone: 'violet',
    endpoints: ['/api/settings/dropdown-categories'],
  },
  {
    key: 'staff-directory',
    title: 'Staff Directory',
    description: 'Synchronize and review staff records from the APU directory.',
    icon: 'badge',
    category: 'Directory',
    route: '/settings/staff-directory',
    tone: 'teal',
    endpoints: [
      '/api/settings/staff/sync',
      '/api/settings/staff',
      '/api/master-data/departments',
    ],
  },
  {
    key: 'departments',
    title: 'Departments',
    description: 'Review synced department names, staff counts, and department types.',
    icon: 'apartment',
    category: 'Directory',
    route: '/settings/departments',
    tone: 'teal',
    endpoints: ['/api/settings/departments'],
  },
  {
    key: 'academic-staff',
    title: 'Academic Staff',
    description: 'Manage staff members available for academic workflows and selections.',
    icon: 'school',
    category: 'Directory',
    route: '/settings/academic-staff',
    tone: 'indigo',
    endpoints: ['/api/settings/academic-staff'],
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage local user profiles, account status, and role assignments.',
    icon: 'manage_accounts',
    category: 'Identity',
    route: '/settings/users',
    tone: 'indigo',
    endpoints: ['/api/settings/users', '/api/settings/user-role'],
  },
  {
    key: 'roles',
    title: 'Roles',
    description: 'Define system roles used for authorization and administration.',
    icon: 'verified_user',
    category: 'Authorization',
    route: '/settings/roles',
    tone: 'blue',
    endpoints: ['/api/settings/roles'],
  },
  {
    key: 'blocked-users',
    title: 'Blocked Users',
    description: 'Control system-wide access restrictions for authenticated users.',
    icon: 'person_off',
    category: 'Security',
    route: '/settings/blocked-users',
    tone: 'rose',
    endpoints: ['/api/settings/blocked-users'],
  },
  {
    key: 'applicant-rules',
    title: 'Applicant Rules',
    description: 'Configure eligibility rules that determine who can apply for each form.',
    icon: 'rule',
    category: 'Access Rules',
    route: '/settings/applicant-rules',
    tone: 'amber',
    endpoints: ['/api/settings/applicant-rules'],
  },
  {
    key: 'workflow',
    title: 'Workflow Configuration',
    description: 'Configure workflow actors, processes, steps, actions, assignments, and delegations.',
    icon: 'account_tree',
    category: 'Workflow',
    route: '/settings/workflow',
    tone: 'slate',
    endpoints: [
      '/api/settings/workflow-actor-types',
      '/api/settings/workflow-processes',
      '/api/settings/workflow-steps',
      '/api/settings/workflow-step-actions',
      '/api/settings/workflow-actor-assignments',
      '/api/settings/workflow-delegations',
    ],
  },
];
