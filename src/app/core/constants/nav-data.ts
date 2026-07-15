import { NavGroup } from '../interfaces/nav.interface';

/**
 * NAVIGATION_DATA — central routing and permission configuration.
 *
 * Permission rules use the ABAC model defined in NavPermission:
 *   permission.anyOf         — user must belong to at least ONE of these groups
 *   permission.allOf         — user must belong to ALL of these groups
 *   permission.excludeGroups — user must NOT belong to any of these groups
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
        groupName: '', // No visible section header — single unified nav list
        elements: [

            // ── Dashboard ────────────────────────────────────────────────────────────────
            { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },

            // ── Inbox ────────────────────────────────────────────────────────────────────
            { label: 'Inbox', icon: 'mail', route: '/submissions/inbox' },
            { label: 'Notifications', icon: 'notifications', route: '/notifications' },

            // ── Submissions ──────────────────────────────────────────────────────────────
            // Collapsible folder visible to every authenticated user. Open by default.
            {
                label: 'Submissions',
                icon: 'inbox',
                isExpanded: true,
                children: [
                    { label: 'Draft',               icon: 'edit_note',      route: '/submissions/draft' },
                    { label: 'Pending Application', icon: 'schedule',       route: '/submissions/pending' },
                    { label: 'History',             icon: 'history',        route: '/submissions/history' },
                    {
                        label: 'Admin History',
                        icon: 'manage_history',
                        route: '/submissions/admin-history',
                        permission: { anyOf: ['RMC', 'Admin'] },
                    },
                ],
            },

            // ── Forms ────────────────────────────────────────────────────────────────────
            // Collapsible folder of application submission forms.
            // No folder-level permission — child-level ABAC handles visibility.
            // The folder is automatically hidden when all children are filtered out.
            {
                label: 'Forms',
                icon: 'edit_document',
                children: [
                    // RDIG: (full_time OR contract) AND academic, NOT Reviewer, NOT HOS
                    {
                        label: 'RDIG Application',
                        icon: 'description',
                        route: '/rdig/application',
                        formCode: 'RDIG',
                        permission: {
                            anyOf: ['full_time', 'contract'],
                            allOf: ['academic'],
                            excludeGroups: ['Reviewer', 'HOS'],
                        },
                    },
                    // Conference: ((full_time OR contract) AND academic) OR HOS OR VC
                    {
                        label: 'Conference Application',
                        icon: 'event',
                        route: '/conference/application',
                        formCode: 'CONFERENCE',
                        permission: {
                            anyCondition: [
                                { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
                                { anyOf: ['HOS'] },
                                { anyOf: ['VC'] },
                            ],
                        },
                    },
                    // Journal: ((full_time OR contract) AND academic) OR HOS OR VC
                    {
                        label: 'Journal Publication',
                        icon: 'menu_book',
                        route: '/journal/application',
                        formCode: 'JOURNAL',
                        permission: {
                            anyCondition: [
                                { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
                                { anyOf: ['HOS'] },
                                { anyOf: ['VC'] },
                            ],
                        },
                    },
                    // RA/GRA: (full_time OR contract) AND academic
                    {
                        label: 'RA/GRA Application',
                        icon: 'person_add',
                        route: '/ragra',
                        formCode: 'RA_GRA',
                        permission: {
                            anyOf: ['full_time', 'contract'],
                            allOf: ['academic'],
                        },
                    },
                    // Partnership: (full_time OR contract) AND academic
                    {
                        label: 'Partnership Application',
                        icon: 'handshake',
                        route: '/partnership/application',
                        formCode: 'PARTNERSHIP',
                        permission: {
                            anyOf: ['full_time', 'contract'],
                            allOf: ['academic'],
                        },
                    },
                    // Proposal: (full_time OR contract) AND academic
                    {
                        label: 'Proposal Application',
                        icon: 'assignment',
                        route: '/proposal',
                        formCode: 'PROPOSAL',
                        permission: {
                            anyOf: ['full_time', 'contract'],
                            allOf: ['academic'],
                        },
                    },
                    {
                        label: 'External Project Data Entry',
                        icon: 'folder_open',
                        route: '/external-project-data-entry',
                        formCode: 'EXTERNAL',
                        permission: { anyOf: ['RMC', 'Admin'] },
                    },                    // Travel Authorization: visible to all authenticated users except Admin
                    {
                        label: 'Travel Authorization',
                        icon: 'flight_takeoff',
                        route: '/travel-authorization/application',
                        formCode: 'TRAVEL_AUTH',
                        permission: {
                            excludeGroups: ['Admin'],
                        },
                    },
                ],
            },

            // ── Admin Settings ──────────────────────────────────────────────────────────────
            // Admin-only configuration folder.
            {
                label: 'Admin Settings',
                icon: 'admin_panel_settings',
                route: '/admin-settings',
                permission: { anyOf: ['Admin'] },
                children: [
                    { label: 'Guidelines', icon: 'description', route: '/admin-settings/guidelines', permission: { anyOf: ['Admin'] } },
                    { label: 'Dropdowns', icon: 'list', route: '/admin-settings/dropdowns', permission: { anyOf: ['Admin'] } },
                    { label: 'Manage Project Account Code', icon: 'account_balance_wallet', route: '/admin-settings/manage-project-account-code', permission: { anyOf: ['Admin'] } },
                    { label: 'Manage External Form Category', icon: 'category', route: '/admin-settings/manage-external-form-category', permission: { anyOf: ['Admin'] } },
                    { label: 'Batches', icon: 'batch_prediction', route: '/admin-settings/batches', permission: { anyOf: ['Admin'] } },
                    { label: 'RDIG Blocked List', icon: 'person_add', route: '/admin-settings/staff-access', permission: { anyOf: ['Admin'] } },
                    { label: 'Manage RDIG Reviewer', icon: 'groups', route: '/admin-settings/manage-rdig-reviewer', permission: { anyOf: ['Admin'] } },
                ],
            },

            // System configuration is restricted to SYSTEM_ADMIN users.
            {
                label: 'Settings',
                icon: 'settings',
                route: '/settings',
                permission: { allOf: ['SystemAdmin'] },
                children: [
                    { label: 'Forms', icon: 'description', route: '/settings/forms', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Dropdown Categories', icon: 'list_alt', route: '/settings/dropdown-categories', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Account Code Categories', icon: 'category', route: '/settings/account-code-categories', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Account Codes', icon: 'account_balance_wallet', route: '/settings/account-codes', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Staff Directory', icon: 'badge', route: '/settings/staff-directory', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Academic Staff', icon: 'school', route: '/settings/academic-staff', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Users', icon: 'manage_accounts', route: '/settings/users', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Roles', icon: 'verified_user', route: '/settings/roles', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'System Access', icon: 'admin_panel_settings', route: '/settings/system-access', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Applicant Rules', icon: 'rule', route: '/settings/applicant-rules', permission: { allOf: ['SystemAdmin'] } },
                    { label: 'Workflow Configuration', icon: 'account_tree', route: '/settings/workflow', permission: { allOf: ['SystemAdmin'] } },
                ],
            },
        ],
    },
];
