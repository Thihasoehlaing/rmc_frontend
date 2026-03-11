import { NavGroup } from '../../interfaces/nav.interface';

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
 *   RA/GRA Application      : (full_time OR contract) AND academic AND HOS AND group_ra_gra_hos_pass
 *   RDIG Application        : (full_time OR contract) AND academic, NOT Reviewer, NOT blocked_hos_rdig
 *   RMC Settings            : RMC group only
 *   Submissions (Inbox...)  : All authenticated users
 */
export const NAVIGATION_DATA: NavGroup[] = [
    {
        groupName: '', // No visible section header — single unified nav list
        elements: [

            // ── Submissions ──────────────────────────────────────────────────────────────
            // Collapsible folder visible to every authenticated user. Open by default.
            {
                label: 'Submissions',
                icon: 'inbox',
                isExpanded: true,
                children: [
                    { label: 'Inbox',               icon: 'mail',           route: '/submissions/inbox' },
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
                        route: '/rdig',
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
                        permission: {
                            anyCondition: [
                                { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
                                { anyOf: ['HOS'] },
                                { anyOf: ['VC'] },
                            ],
                        },
                    },
                    // RA/GRA: (HOS AND (full_time OR contract) AND academic) OR ra_gra_hos_pass
                    {
                        label: 'RA/GRA Application',
                        icon: 'person_add',
                        route: '/ragra',
                        permission: {
                            anyCondition: [
                                { anyOf: ['full_time', 'contract'], allOf: ['academic', 'HOS'] },
                                { anyOf: ['group_ra_gra_hos_pass'] },
                            ],
                        },
                    },
                    // Proposal: (full_time OR contract) AND academic
                    {
                        label: 'Proposal Application',
                        icon: 'assignment',
                        route: '/proposal',
                        permission: {
                            anyOf: ['full_time', 'contract'],
                            allOf: ['academic'],
                        },
                    },
                ],
            },

            // ── RMC Settings ─────────────────────────────────────────────────────────────
            // Administrative configuration folder — RMC group only.
            {
                label: 'RMC Settings',
                icon: 'settings',
                permission: { allOf: ['RMC'] },
                children: [
                    { label: 'RDIG Application Form (Guidelines Settings)', route: '/settings/rdig-guidelines' },
                    { label: 'RDIG Research Cluster Settings',              route: '/settings/rdig-clusters' },
                    { label: 'RDIG Main Research Domain Entry',             route: '/settings/rdig-domains' },
                    { label: 'RDIG Sub Research Domain Entry',              route: '/settings/rdig-sub-domains' },
                    { label: 'RDIG ESG Settings',                          route: '/settings/rdig-esg' },
                    { label: 'Project Account Closure Form',                route: '/settings/closure-checklist' },
                    { label: 'Conference Application Form',                 route: '/settings/conference-app' },
                    { label: 'Conference Funding Request Region Form',      route: '/settings/conference-region' },
                    { label: 'Conference Form (Guidelines Settings)',        route: '/settings/conference-guidelines' },
                    { label: 'Conference Item Research Costing',            route: '/settings/conference-research-costing' },
                    { label: 'Conference Item Local Costing',               route: '/settings/conference-local-costing' },
                    { label: 'Conference Item Overseas Costing',            route: '/settings/conference-overseas-costing' },
                    { label: 'Journal Guidelines Settings',                 route: '/settings/journal-guidelines' },
                    { label: 'RDIG Application (Batch Settings)',           route: '/settings/rdig-batch' },
                    { label: 'RDIG Managing Reviewer',                      route: '/settings/rdig-reviewer' },
                    { label: 'RDIG Blocked List',                           route: '/settings/rdig-blocked' },
                    { label: 'Research Project Account Code',               route: '/settings/project-code' },
                    { label: 'Program Title',                               route: '/settings/program-title' },
                ],
            },
        ],
    },
];
