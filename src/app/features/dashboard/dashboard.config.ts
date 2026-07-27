import { User } from '../../core/interfaces/user.interface';

export type DashboardAudience =
  | 'applicant'
  | 'workflow_actor'
  | 'finance'
  | 'rmc_admin'
  | 'system_admin';

export type DashboardMetricKey =
  | 'required_action'
  | 'pending'
  | 'completed_rejected'
  | 'all_applications'
  | 'decided_by_me'
  | 'total_submitted'
  | 'new_today'
  | 'history'
  | 'drafts'
  | 'failed_mail';

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
  primaryAction?: { label: string; icon: string; route: string };
  metrics: DashboardMetricConfig[];
  showAnalytics: boolean;
  formChartTitle: string;
  formChartDescription: string;
  formChartPrimaryLabel: string;
  recentTitle: string;
  recentRoute: string;
  emptyTitle: string;
  emptyDescription: string;
}

const CONFIG: Record<DashboardAudience, DashboardViewConfig> = {
  applicant: {
    audience: 'applicant',
    roleLabel: 'Applicant workspace',
    title: 'Research dashboard',
    subtitle: 'Track your drafts, pending applications, and decisions from one place.',
    metrics: [
      { key: 'drafts', label: 'Drafts', helper: 'Saved but not submitted', icon: 'edit_note', route: '/submissions/draft', tone: 'violet' },
      { key: 'pending', label: 'Pending applications', helper: 'Currently under review', icon: 'hourglass_top', route: '/submissions/pending', tone: 'blue' },
      { key: 'history', label: 'History', helper: 'Finalised applications', icon: 'history', route: '/submissions/history', tone: 'green' },
      { key: 'all_applications', label: 'All applications', helper: 'Submitted applications + drafts', icon: 'folder_copy', route: '/submissions/draft', tone: 'orange' },
    ],
    showAnalytics: false,
    formChartTitle: 'Applications by form',
    formChartDescription: 'Pending work and actions across each application type.',
    formChartPrimaryLabel: 'Pending',
    recentTitle: 'Recent applications',
    recentRoute: '/submissions/history',
    emptyTitle: 'No applications yet',
    emptyDescription: 'Create your first application when you are ready.',
  },
  workflow_actor: {
    audience: 'workflow_actor',
    roleLabel: 'Workflow workspace',
    title: 'Review dashboard',
    subtitle: 'Focus on submissions that need your action and the history relevant to your role.',
    primaryAction: { label: 'Open inbox', icon: 'arrow_forward', route: '/submissions/inbox' },
    metrics: [
      { key: 'required_action', label: 'Required action', helper: 'Items awaiting your decision', icon: 'priority_high', route: '/submissions/inbox', tone: 'orange' },
      { key: 'history', label: 'History', helper: 'Submitted requests you can view', icon: 'history', route: '/submissions/history', tone: 'blue' },
      { key: 'decided_by_me', label: 'Decided by me', helper: 'Your approve/reject actions', icon: 'fact_check', route: '/submissions/history', tone: 'green' },
      { key: 'new_today', label: 'New today', helper: 'Submitted since midnight', icon: 'fiber_new', route: '/submissions/inbox', tone: 'violet' },
    ],
    showAnalytics: false,
    formChartTitle: 'Applications by form',
    formChartDescription: 'Submitted applications and workflow activity grouped by form.',
    formChartPrimaryLabel: 'Submitted',
    recentTitle: 'Recent workflow activity',
    recentRoute: '/submissions/history',
    emptyTitle: 'No workflow activity',
    emptyDescription: 'Applications requiring your role will appear here.',
  },
  finance: {
    audience: 'finance',
    roleLabel: 'Finance view-only',
    title: 'Finance dashboard',
    subtitle: 'Review final approved funding requests without workflow action buttons.',
    primaryAction: { label: 'Open history', icon: 'history', route: '/submissions/history' },
    metrics: [
      { key: 'history', label: 'Approved / final requests', helper: 'Visible to Finance', icon: 'task_alt', route: '/submissions/history', tone: 'green' },
      { key: 'total_submitted', label: 'Total submitted', helper: 'Conference and journal activity', icon: 'description', route: '/submissions/history', tone: 'blue' },
      { key: 'new_today', label: 'New today', helper: 'Submitted since midnight', icon: 'fiber_new', route: '/submissions/history', tone: 'violet' },
      { key: 'required_action', label: 'Required action', helper: 'Finance is view-only', icon: 'visibility', route: '/submissions/history', tone: 'orange' },
    ],
    showAnalytics: false,
    formChartTitle: 'Finance-visible forms',
    formChartDescription: 'Approved requests grouped by form.',
    formChartPrimaryLabel: 'Approved',
    recentTitle: 'Recently visible requests',
    recentRoute: '/submissions/history',
    emptyTitle: 'No approved requests yet',
    emptyDescription: 'Final approved requests will appear here after CEO approval.',
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
    showAnalytics: true,
    formChartTitle: 'Decisions by form',
    formChartDescription: 'Applications you approved or rejected, grouped by form.',
    formChartPrimaryLabel: 'Decided by me',
    recentTitle: 'Latest service activity',
    recentRoute: '/submissions/admin-history',
    emptyTitle: 'No application activity',
    emptyDescription: 'New and updated applications will appear here.',
  },
  system_admin: {
    audience: 'system_admin',
    roleLabel: 'System administration',
    title: 'System dashboard',
    subtitle: 'Monitor platform activity, active workflows, and system-side exceptions.',
    metrics: [
      { key: 'total_submitted', label: 'Total submitted', helper: 'Across all form types', icon: 'description', route: '/submissions/admin-history', tone: 'blue' },
      { key: 'new_today', label: 'New today', helper: 'Submitted since midnight', icon: 'fiber_new', route: '/submissions/admin-history', tone: 'violet' },
      { key: 'failed_mail', label: 'Failed mail logs', helper: 'Needs system attention', icon: 'mark_email_unread', route: '/settings', tone: 'orange' },
      { key: 'all_applications', label: 'All applications', helper: 'Submitted applications + drafts', icon: 'folder_copy', route: '/submissions/admin-history', tone: 'green' },
    ],
    showAnalytics: true,
    formChartTitle: 'Applications by form',
    formChartDescription: 'Submitted applications and workflow activity grouped by form.',
    formChartPrimaryLabel: 'Submitted',
    recentTitle: 'Latest platform activity',
    recentRoute: '/submissions/admin-history',
    emptyTitle: 'No application activity',
    emptyDescription: 'New and updated applications will appear here.',
  },
};

export function dashboardAudienceFor(user: User | null, serverView?: string | null): DashboardAudience {
  if (isDashboardAudience(serverView)) return serverView;

  const groups = user?.groups ?? [];
  if (groups.includes('SystemAdmin')) return 'system_admin';
  if (groups.includes('Admin') || groups.includes('RMC')) return 'rmc_admin';
  if (groups.includes('Finance')) return 'finance';
  if (groups.some((group) => ['HOS', 'VC', 'HR', 'CEO', 'RDIG_Chair', 'Reviewer'].includes(group))) {
    return 'workflow_actor';
  }
  return 'applicant';
}

export function dashboardConfigFor(user: User | null, serverView?: string | null): DashboardViewConfig {
  return CONFIG[dashboardAudienceFor(user, serverView)];
}

function isDashboardAudience(value: string | null | undefined): value is DashboardAudience {
  return (
    value === 'applicant' ||
    value === 'workflow_actor' ||
    value === 'finance' ||
    value === 'rmc_admin' ||
    value === 'system_admin'
  );
}
