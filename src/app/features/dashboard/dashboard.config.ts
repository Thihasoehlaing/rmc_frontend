import { User } from '../../core/interfaces/user.interface';

export type DashboardAudience = 'academic' | 'rmc_admin';
export type DashboardMetricKey =
  | 'required_action'
  | 'pending'
  | 'completed_rejected'
  | 'all_applications'
  | 'decided_by_me'
  | 'total_submitted'
  | 'new_today';

export interface DashboardMetricConfig {
  key: DashboardMetricKey;
  label: string;
  helper: string;
  icon: string;
  route: string;
  tone: 'blue' | 'violet' | 'green' | 'orange';
}

export interface DashboardViewConfig {
  audience: DashboardAudience;
  roleLabel: string;
  title: string;
  subtitle: string;
  primaryAction: { label: string; icon: string; route: string };
  metrics: DashboardMetricConfig[];
  formChartTitle: string;
  formChartDescription: string;
  formChartPrimaryLabel: string;
  recentTitle: string;
  emptyTitle: string;
  emptyDescription: string;
}

const CONFIG: Record<DashboardAudience, DashboardViewConfig> = {
  academic: {
    audience: 'academic',
    roleLabel: 'Academic workspace',
    title: 'Research dashboard',
    subtitle: 'Track every application, deadline, and decision from one place.',
    primaryAction: { label: 'New application', icon: 'add', route: '/rdig/application' },
    metrics: [
      { key: 'required_action', label: 'Required action', helper: 'Across all form types', icon: 'priority_high', route: '/submissions/inbox', tone: 'orange' },
      { key: 'pending', label: 'Pending applications', helper: 'Currently under review', icon: 'hourglass_top', route: '/submissions/pending', tone: 'blue' },
      { key: 'completed_rejected', label: 'Complete / rejected', helper: 'Finalised applications', icon: 'task_alt', route: '/submissions/history', tone: 'green' },
      { key: 'all_applications', label: 'All applications', helper: 'Submitted applications + drafts', icon: 'folder_copy', route: '/submissions/draft', tone: 'violet' },
    ],
    formChartTitle: 'Applications by form',
    formChartDescription: 'Pending work and actions across each application type.',
    formChartPrimaryLabel: 'Pending',
    recentTitle: 'Recent applications',
    emptyTitle: 'No applications yet',
    emptyDescription: 'Create your first application when you are ready.',
  },
  rmc_admin: {
    audience: 'rmc_admin',
    roleLabel: 'RMC administration',
    title: 'Service analytics',
    subtitle: 'A live view of research application activity and your decisions.',
    primaryAction: { label: 'Open work queue', icon: 'arrow_forward', route: '/submissions/inbox' },
    metrics: [
      { key: 'required_action', label: 'Required action', helper: 'Items awaiting RMC', icon: 'inbox', route: '/submissions/inbox', tone: 'orange' },
      { key: 'decided_by_me', label: 'Approved / rejected by me', helper: 'Your recorded decisions', icon: 'fact_check', route: '/submissions/admin-history', tone: 'green' },
      { key: 'total_submitted', label: 'Total submitted', helper: 'Across all form types', icon: 'description', route: '/submissions/admin-history', tone: 'blue' },
      { key: 'new_today', label: 'New applications today', helper: 'Submitted since midnight', icon: 'fiber_new', route: '/submissions/inbox', tone: 'violet' },
    ],
    formChartTitle: 'Decisions by form',
    formChartDescription: 'Applications you approved or rejected, grouped by form.',
    formChartPrimaryLabel: 'Decided by me',
    recentTitle: 'Latest service activity',
    emptyTitle: 'No application activity',
    emptyDescription: 'New and updated applications will appear here.',
  },
};

export function dashboardAudienceFor(user: User | null): DashboardAudience {
  const groups = user?.groups ?? [];
  return groups.includes('Admin') || groups.includes('RMC') ? 'rmc_admin' : 'academic';
}

export function dashboardConfigFor(user: User | null): DashboardViewConfig {
  return CONFIG[dashboardAudienceFor(user)];
}
