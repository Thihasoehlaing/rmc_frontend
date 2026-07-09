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
    endpoints: ['/rmc/settings/forms'],
  },
  {
    key: 'dropdown-categories',
    title: 'Dropdown Categories',
    description: 'Define system dropdown categories used by configurable form options.',
    icon: 'list_alt',
    category: 'Configuration',
    route: '/settings/dropdown-categories',
    tone: 'violet',
    endpoints: ['/rmc/settings/dropdown-categories'],
  },
  {
    key: 'account-code-categories',
    title: 'Account Code Categories',
    description: 'Group finance account codes used by application budget and costing fields.',
    icon: 'category',
    category: 'Finance Setup',
    route: '/settings/account-code-categories',
    tone: 'amber',
    endpoints: ['/rmc/settings/account-code-categories'],
  },
  {
    key: 'account-codes',
    title: 'Account Codes',
    description: 'Manage account codes, descriptions, location types, and shared form access.',
    icon: 'account_balance_wallet',
    category: 'Finance Setup',
    route: '/settings/account-codes',
    tone: 'teal',
    endpoints: ['/rmc/settings/account-codes', '/rmc/settings/account-code-categories'],
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
      '/rmc/settings/staff/sync',
      '/rmc/settings/staff',
      '/rmc/master-data/departments',
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
    endpoints: ['/rmc/settings/departments'],
  },
  {
    key: 'academic-staff',
    title: 'Academic Staff',
    description: 'Manage staff members available for academic workflows and selections.',
    icon: 'school',
    category: 'Directory',
    route: '/settings/academic-staff',
    tone: 'indigo',
    endpoints: ['/rmc/settings/academic-staff'],
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage local user profiles, account status, and role assignments.',
    icon: 'manage_accounts',
    category: 'Identity',
    route: '/settings/users',
    tone: 'indigo',
    endpoints: ['/rmc/settings/users', '/rmc/settings/user-role'],
  },
  {
    key: 'roles',
    title: 'Roles',
    description: 'Define system roles used for authorization and administration.',
    icon: 'verified_user',
    category: 'Authorization',
    route: '/settings/roles',
    tone: 'blue',
    endpoints: ['/rmc/settings/roles'],
  },
  {
    key: 'system-access',
    title: 'System Access',
    description: 'Control system-wide entry through user overrides, department rules, and audit logs.',
    icon: 'admin_panel_settings',
    category: 'Security',
    route: '/settings/system-access',
    tone: 'rose',
    endpoints: [
      '/rmc/settings/system-access/users',
      '/rmc/settings/system-access/department-rules',
      '/rmc/settings/system-access/audit-logs',
    ],
  },
  {
    key: 'applicant-rules',
    title: 'Applicant Rules',
    description: 'Configure eligibility rules that determine who can apply for each form.',
    icon: 'rule',
    category: 'Access Rules',
    route: '/settings/applicant-rules',
    tone: 'amber',
    endpoints: ['/rmc/settings/applicant-rules'],
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
      '/rmc/settings/workflow-actor-types',
      '/rmc/settings/workflow-processes',
      '/rmc/settings/workflow-steps',
      '/rmc/settings/workflow-step-actions',
      '/rmc/settings/workflow-actor-assignments',
      '/rmc/settings/workflow-delegations',
    ],
  },
];
