/**
 * request-display.util.ts
 *
 * Shared presentation helpers for the request/workflow list views (inbox,
 * pending, history, my-requests). Keeps status colours and form-code → label
 * /route mappings in one place so the list components stay consistent.
 */

/** Badge colour per workflow status code. */
export const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  fill_application: '#3b82f6',
  pending_applicant_resubmission_hos: '#f59e0b',
  pending_applicant_resubmission_reviewers: '#f59e0b',
  pending_hos: '#a855f7',
  pending_hos_review: '#a855f7',
  rejected_hos: '#ef4444',
  pending_rmc: '#6366f1',
  pending_rmc_review: '#6366f1',
  rejected_rmc: '#ef4444',
  pending_reviewers: '#0ea5e9',
  pending_rdig_chair: '#10b981',
  rejected_rdig_chair: '#ef4444',
  pending_vc: '#14b8a6',
  rejected_vc: '#ef4444',
  pending_ceo: '#f97316',
  rejected_ceo: '#ef4444',
  approved: '#22c55e',
};

const FORM_LABELS: Record<string, string> = {
  RDIG: 'RDIG',
  CONFERENCE: 'Conference',
  JOURNAL: 'Journal',
  EXTERNAL: 'External',
};

export function formTypeLabel(formCode: string | null | undefined, formName?: string | null): string {
  const code = (formCode ?? '').toUpperCase();
  return FORM_LABELS[code] ?? formName ?? code ?? '—';
}

/** The applicant form route a request opens into, by form code. */
export function formRoute(formCode: string | null | undefined): string {
  switch ((formCode ?? '').toUpperCase()) {
    case 'CONFERENCE':
      return '/conference/application';
    case 'JOURNAL':
      return '/journal/application';
    case 'EXTERNAL':
      return '/external-project-data-entry';
    case 'RDIG':
    default:
      return '/rdig/application';
  }
}

export function requestIdOf(app: { id?: number | null; request_id?: number | null }): number | null {
  return app.id ?? app.request_id ?? null;
}

export function detailRoute(app: { id?: number | null; request_id?: number | null }): string {
  const id = requestIdOf(app);
  return id == null ? '/submissions/history' : `/submissions/detail/${id}`;
}

export function actionRoute(app: { id?: number | null; request_id?: number | null }): string {
  const id = requestIdOf(app);
  return id == null ? '/submissions/inbox' : `/submissions/action/${id}`;
}
