export interface NavItem {
    label: string;
    icon?: string;
    route?: string;
    permissions?: string[];
    externalUrl?: string;
}

export interface NavFolder {
    label: string;
    icon?: string;
    children: (NavItem | NavFolder)[];
    isExpanded?: boolean;
    permissions?: string[];
}

export type NavElement = NavItem | NavFolder;

export interface NavGroup {
    groupName: string;
    elements: NavElement[];
    permissions?: string[];
}
