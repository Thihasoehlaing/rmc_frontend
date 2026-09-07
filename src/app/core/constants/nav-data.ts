import { NavGroup } from '../interfaces/nav.interface';
import {
  adminHistoryPermission,
  adminOnlySettingsChildPermission,
  disabledFeaturePermission,
  externalProjectDataEntryPermission,
  fundingApplicationPermission,
  rdigPermission,
  reportPermission,
  submissionsDraftPendingPermission,
  submissionsInboxHistoryPermission,
  systemOrRmcAdminPermission,
  systemSettingsPermission,
} from '../routing/app-route-permissions';

/**
 * NAVIGATION_DATA - central routing and permission configuration.
 *
 * Permission rules use the ABAC model defined in NavPermission:
 *   permission.anyOf         - user must belong to at least ONE of these groups
 *   permission.allOf         - user must belong to ALL of these groups
 *   permission.excludeGroups - user must NOT belong to any of these groups
 *
 * Permission is evaluated top-down:
 *   NavGroup permission  -> hides the entire group section
 *   NavFolder permission -> hides just that folder
 *   NavItem permission   -> hides just that item
 *
 * Application access rules:
 *   Conference Application  : (full_time OR contract) AND academic AND HOS AND VC
 *   Journal Publication     : (full_time OR contract) AND academic AND HOS AND VC
 *   RA/GRA Application      : (full_time OR contract) AND academic
 *   RDIG Application        : (full_time OR contract) AND academic, NOT Reviewer, NOT blocked_hos_rdig
 *   Admin Settings          : Admin group only
 *   Submissions (Inbox...)  : All authenticated users
 */
export const NAVIGATION_DATA: NavGroup[] = [
  {
    groupName: '',
    elements: [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      {
        label: 'Analysis Dashboard',
        icon: 'analytics',
        route: '/analysis-dashboard',
        permission: systemOrRmcAdminPermission,
      },
      {
        label: 'Inbox',
        icon: 'mail',
        route: '/submissions/inbox',
        permission: submissionsInboxHistoryPermission,
      },
      { label: 'Notifications', icon: 'notifications', route: '/notifications' },
      {
        label: 'Submissions',
        icon: 'inbox',
        isExpanded: true,
        children: [
          {
            label: 'Draft',
            icon: 'edit_note',
            route: '/submissions/draft',
            permission: submissionsDraftPendingPermission,
          },
          {
            label: 'Pending Application',
            icon: 'schedule',
            route: '/submissions/pending',
            permission: submissionsDraftPendingPermission,
          },
          {
            label: 'History',
            icon: 'history',
            route: '/submissions/history',
            permission: submissionsInboxHistoryPermission,
          },
          {
            label: 'Admin History',
            icon: 'manage_history',
            route: '/submissions/admin-history',
            permission: adminHistoryPermission,
          },
        ],
      },
      { label: 'Reports', icon: 'assessment', route: '/reports', permission: reportPermission },
      {
        label: 'Forms',
        icon: 'edit_document',
        children: [
          {
            label: 'RDIG Application',
            icon: 'description',
            route: '/rdig/application',
            formCode: 'RDIG',
            permission: rdigPermission,
          },
          {
            label: 'Conference Application',
            icon: 'event',
            route: '/conference/application',
            formCode: 'CONFERENCE',
            permission: fundingApplicationPermission,
          },
          {
            label: 'Journal Publication',
            icon: 'menu_book',
            route: '/journal/application',
            formCode: 'JOURNAL',
            permission: fundingApplicationPermission,
          },
          {
            label: 'RA/GRA Application',
            icon: 'person_add',
            route: '/ragra',
            formCode: 'RA_GRA',
            permission: disabledFeaturePermission,
          },
          {
            label: 'Partnership Application',
            icon: 'handshake',
            route: '/partnership/application',
            formCode: 'PARTNERSHIP',
            permission: disabledFeaturePermission,
          },
          {
            label: 'Proposal Application',
            icon: 'assignment',
            route: '/proposal',
            formCode: 'PROPOSAL',
            permission: disabledFeaturePermission,
          },
          {
            label: 'External Project Data Entry',
            icon: 'folder_open',
            route: '/external-project-data-entry',
            formCode: 'EXTERNAL',
            permission: externalProjectDataEntryPermission,
          },
          {
            label: 'Travel Authorization',
            icon: 'flight_takeoff',
            route: '/travel-authorization/application',
            formCode: 'TRAVEL_AUTH',
            permission: disabledFeaturePermission,
          },
        ],
      },
      {
        label: 'Admin Settings',
        icon: 'admin_panel_settings',
        route: '/admin-settings',
        permission: adminOnlySettingsChildPermission,
        children: [
          {
            label: 'Guidelines',
            icon: 'description',
            route: '/admin-settings/guidelines',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Form Setting',
            icon: 'dynamic_form',
            route: '/admin-settings/form-setting',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Dropdowns',
            icon: 'list',
            route: '/admin-settings/dropdowns',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Manage Project Account Code',
            icon: 'account_balance_wallet',
            route: '/admin-settings/manage-project-account-code',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Manage External Form Category',
            icon: 'category',
            route: '/admin-settings/manage-external-form-category',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Batches',
            icon: 'batch_prediction',
            route: '/admin-settings/batches',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'RDIG Blocked List',
            icon: 'person_add',
            route: '/admin-settings/staff-access',
            permission: adminOnlySettingsChildPermission,
          },
          {
            label: 'Manage RDIG Reviewer',
            icon: 'groups',
            route: '/admin-settings/manage-rdig-reviewer',
            permission: adminOnlySettingsChildPermission,
          },
        ],
      },
      {
        label: 'Settings',
        icon: 'settings',
        route: '/settings',
        permission: systemSettingsPermission,
        children: [
          {
            label: 'Forms',
            icon: 'description',
            route: '/settings/forms',
            permission: systemSettingsPermission,
          },
          {
            label: 'Dropdown Categories',
            icon: 'list_alt',
            route: '/settings/dropdown-categories',
            permission: systemSettingsPermission,
          },
          {
            label: 'Account Code Categories',
            icon: 'category',
            route: '/settings/account-code-categories',
            permission: systemSettingsPermission,
          },
          {
            label: 'Account Codes',
            icon: 'account_balance_wallet',
            route: '/settings/account-codes',
            permission: systemSettingsPermission,
          },
          {
            label: 'Vote Numbers',
            icon: 'pin',
            route: '/settings/vote-numbers',
            permission: systemSettingsPermission,
          },
          {
            label: 'Staff Directory',
            icon: 'badge',
            route: '/settings/staff-directory',
            permission: systemSettingsPermission,
          },
          {
            label: 'Academic Staff',
            icon: 'school',
            route: '/settings/academic-staff',
            permission: systemSettingsPermission,
          },
          {
            label: 'Form Correction',
            icon: 'fact_check',
            route: '/settings/form-correction',
            permission: systemSettingsPermission,
          },
          {
            label: 'Users',
            icon: 'manage_accounts',
            route: '/settings/users',
            permission: systemSettingsPermission,
          },
          {
            label: 'Roles',
            icon: 'verified_user',
            route: '/settings/roles',
            permission: systemSettingsPermission,
          },
          {
            label: 'System Access',
            icon: 'admin_panel_settings',
            route: '/settings/system-access',
            permission: systemSettingsPermission,
          },
          {
            label: 'Applicant Rules',
            icon: 'rule',
            route: '/settings/applicant-rules',
            permission: systemSettingsPermission,
          },
          {
            label: 'Workflow Configuration',
            icon: 'account_tree',
            route: '/settings/workflow',
            permission: systemSettingsPermission,
          },
          {
            label: 'Monitoring Logs',
            icon: 'monitor_heart',
            route: '/settings/monitoring',
            permission: systemSettingsPermission,
          },
          {
            label: 'Request Statuses',
            icon: 'published_with_changes',
            route: '/settings/request-statuses',
            permission: systemSettingsPermission,
          },
        ],
      },
    ],
  },
];
