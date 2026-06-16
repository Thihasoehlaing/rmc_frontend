export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  children?: NavItem[];
  metadata?: Record<string, any>;
}

export interface NavigationConfig {
  items: NavItem[];
  version: string;
}

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  timeZone?: string;
}
