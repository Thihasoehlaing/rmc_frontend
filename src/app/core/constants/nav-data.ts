import { NavGroup } from '../../interfaces/nav.interface';

export const NAVIGATION_DATA: NavGroup[] = [
    {
        groupName: 'RMC Settings',
        elements: [
            {
                label: 'RMC Settings Page',
                icon: 'settings',
                children: [
                    { label: 'RDIG Application Form (Guidelines Settings)', route: '/settings/rdig-guidelines' },
                    { label: 'RDIG Research Cluster Settings', route: '/settings/rdig-clusters' },
                    { label: 'RDIG Main Research Domain Entry', route: '/settings/rdig-domains' },
                    { label: 'RDIG Sub Research Domain Entry', route: '/settings/rdig-sub-domains' },
                    { label: 'RIDG ESG Settings', route: '/settings/rdig-esg' },
                    { label: 'Project Account Closure Form', route: '/settings/closure-checklist' },
                    { label: 'Conference Application Form', route: '/settings/conference-app' },
                    { label: 'Conference Funding Request Region Form', route: '/settings/conference-region' },
                    { label: 'Conference Form (Guidelines Settings)', route: '/settings/conference-guidelines' },
                    { label: 'Conference Item Research Costing', route: '/settings/conference-research-costing' },
                    { label: 'Conference Item Local Costing', route: '/settings/conference-local-costing' },
                    { label: 'Conference Item Overseas Costing', route: '/settings/conference-overseas-costing' },
                    { label: 'Journal Guidelines Settings', route: '/settings/journal-guidelines' },
                    { label: 'RDIG Application (Batch Settings)', route: '/settings/rdig-batch' },
                    { label: 'RDIG Managing Reviewer', route: '/settings/rdig-reviewer' },
                    { label: 'RDIG Blocked List', route: '/settings/rdig-blocked' },
                    { label: 'Research Project Account Code', route: '/settings/project-code' },
                    { label: 'Program Title', route: '/settings/program-title' }
                ]
            }
        ]
    },
    {
        groupName: 'Primary Applications',
        elements: [
            {
                label: 'RDIG Application Form',
                icon: 'description',
                children: [
                    { label: 'RDIG Application', route: '/rdig' },
                    { label: 'Inbox', route: '/rdig/inbox' },
                    { label: 'List', route: '/rdig/list' },
                    { label: 'Admin History', route: '/rdig/admin-history' },
                    { label: 'History', route: '/rdig/history' }
                ]
            },
            {
                label: 'Conference Funding Application Form',
                icon: 'event',
                children: []
            },
            {
                label: 'Journal Publication Funding Application Form',
                icon: 'menu_book',
                children: []
            },
            {
                label: 'External Project Data Entry',
                icon: 'storage',
                children: []
            },
            {
                label: 'RA/GRA Application Form',
                icon: 'person_add',
                children: []
            },
            {
                label: 'Travel Authorization Form',
                icon: 'flight',
                children: []
            },
            {
                label: 'Proposal Application Form',
                icon: 'assignment',
                children: []
            }
        ]
    }
];
