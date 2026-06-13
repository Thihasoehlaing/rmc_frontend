import { NavPermission } from './permission.interface';

export interface NavItem {
    label: string;
    icon?: string;
    route?: string;
    externalUrl?: string;
    /** ABAC permission rules. Omit to allow all authenticated users. */
    permission?: NavPermission;
}

export interface NavFolder {
    label: string;
    icon?: string;
    route?: string;
    children: (NavItem | NavFolder)[];
    isExpanded?: boolean;
    /** ABAC permission rules. Omit to allow all authenticated users. */
    permission?: NavPermission;
}

export type NavElement = NavItem | NavFolder;

export interface NavGroup {
    groupName: string;
    elements: NavElement[];
    /** ABAC permission rules for the entire group. Omit to allow all authenticated users. */
    permission?: NavPermission;
}
