import { environment } from '../../../environments/environment';

const apiEndpoint = (path: string): string => {
  const base = environment.apiUrl.replace(/\/$/, '');
  return `${base}/${path}`;
};

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
    endpoints: [apiEndpoint('settings/forms')],
  },
  {
    key: 'dropdown-categories',
    title: 'Dropdown Categories',
    description: 'Define system dropdown categories used by configurable form options.',
    icon: 'list_alt',
    category: 'Configuration',
    route: '/settings/dropdown-categories',
    tone: 'violet',
    endpoints: [apiEndpoint('settings/dropdown-categories')],
  },
  {
    key: 'account-code-categories',
    title: 'Account Code Categories',
    description: 'Group finance account codes used by application budget and costing fields.',
    icon: 'category',
    category: 'Finance Setup',
    route: '/settings/account-code-categories',
    tone: 'amber',
    endpoints: [apiEndpoint('settings/account-code-categories')],
  },
  {
    key: 'account-codes',
    title: 'Account Codes',
    description: 'Manage account codes, descriptions, location types, and shared form access.',
    icon: 'account_balance_wallet',
    category: 'Finance Setup',
    route: '/settings/account-codes',
    tone: 'teal',
    endpoints: [apiEndpoint('settings/account-codes'), apiEndpoint('settings/account-code-categories')],
  },
  {
    key: 'vote-numbers',
    title: 'Vote Numbers',
    description: 'Review and edit vote number values shared with application forms.',
    icon: 'pin',
    category: 'Finance Setup',
    route: '/settings/vote-numbers',
    tone: 'blue',
    endpoints: [apiEndpoint('admin-settings/vote-numbers')],
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
      apiEndpoint('settings/staff/sync'),
      apiEndpoint('settings/staff'),
      apiEndpoint('master-data/departments'),
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
    endpoints: [apiEndpoint('settings/departments')],
  },
  {
    key: 'academic-staff',
    title: 'Academic Staff',
    description: 'Manage staff members available for academic workflows and selections.',
    icon: 'school',
    category: 'Directory',
    route: '/settings/academic-staff',
    tone: 'indigo',
    endpoints: [apiEndpoint('settings/academic-staff')],
  },
  {
    key: 'form-correction',
    title: 'Form Correction',
    description: 'Find Conference or Journal requests and correct APU staff co-authors.',
    icon: 'fact_check',
    category: 'Request Maintenance',
    route: '/settings/form-correction',
    tone: 'amber',
    endpoints: [apiEndpoint('settings/form-corrections/lookup')],
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage local user profiles, account status, and role assignments.',
    icon: 'manage_accounts',
    category: 'Identity',
    route: '/settings/users',
    tone: 'indigo',
    endpoints: [apiEndpoint('settings/users'), apiEndpoint('settings/user-role')],
  },
  {
    key: 'roles',
    title: 'Roles',
    description: 'Define system roles used for authorization and administration.',
    icon: 'verified_user',
    category: 'Authorization',
    route: '/settings/roles',
    tone: 'blue',
    endpoints: [apiEndpoint('settings/roles')],
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
      apiEndpoint('settings/system-access/users'),
      apiEndpoint('settings/system-access/department-rules'),
      apiEndpoint('settings/system-access/audit-logs'),
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
    endpoints: [apiEndpoint('settings/applicant-rules')],
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
      apiEndpoint('settings/workflow-actor-types'),
      apiEndpoint('settings/workflow-processes'),
      apiEndpoint('settings/workflow-steps'),
      apiEndpoint('settings/workflow-step-actions'),
      apiEndpoint('settings/workflow-actor-assignments'),
      apiEndpoint('settings/workflow-delegations'),
    ],
  },
  {
    key: 'monitoring',
    title: 'Monitoring Logs',
    description: 'Review notification mail delivery and staff synchronization logs.',
    icon: 'monitor_heart',
    category: 'Monitoring',
    route: '/settings/monitoring',
    tone: 'slate',
    endpoints: [apiEndpoint('settings/mail-logs'), apiEndpoint('settings/staff-sync-logs')],
  },
  {
    key: 'request-statuses',
    title: 'Request Statuses',
    description: 'Review workflow request status names, codes, actor ownership, and active flags.',
    icon: 'published_with_changes',
    category: 'Workflow',
    route: '/settings/request-statuses',
    tone: 'blue',
    endpoints: [apiEndpoint('settings/request-statuses')],
  },
];
