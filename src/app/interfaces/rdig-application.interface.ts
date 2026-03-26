/**
 * Represents a single entry in the application's workflow audit trail.
 */
export interface WorkflowHistoryEntry {
  /** Action performed (e.g. 'submit', 'approve', 'resubmit', 'reject') */
  action: string;
  /** Status before the transition */
  fromStatus: string;
  /** Status after the transition */
  toStatus: string;
  /** Full name of the user who performed the action */
  performedBy: string;
  /** Role the user was acting in (e.g. 'Applicant', 'HOS', 'RMC', 'Reviewer', 'RDIG Chair', 'VC', 'CEO') */
  role: string;
  /** ISO 8601 timestamp of when the action was taken */
  timestamp: string;
  /** Optional snapshot of the application data at this point */
  dataSnapshot?: any;
}

/**
 * Tracks the live workflow state of an RDIG application.
 * Stored alongside the form data in the database.
 */
export interface WorkflowState {
  /** Current workflow status — single source of truth for the application state */
  currentStatus: string;
  /** Roles that are expected to act next */
  nextRoles: string[];
  /** Specific user IDs expected to act next (used for assigned reviewers) */
  nextUsers: string[];
  /** Full audit trail of all workflow transitions */
  history: WorkflowHistoryEntry[];
}
