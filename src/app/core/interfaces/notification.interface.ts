export type NotificationType     = 'ACTION' | 'INFO' | 'REMINDER' | 'ALERT';
export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationScope    = 'GLOBAL' | 'RDIG';

export interface AppNotification {
  id?: number;

  /** Template key — e.g. REVIEW_ASSIGNED_TO_YOU */
  key: string;

  scope:    NotificationScope;
  type:     NotificationType;
  title:    string;
  message:  string;
  priority: NotificationPriority;

  read:      boolean;
  /** active = still actionable for the recipient; expired = workflow has moved past this stage */
  status?:   'active' | 'expired';
  createdAt: string; // ISO 8601 — relative time is computed from this in the UI

  /** Role-based recipient (HOS, RMC, RDIG_Chair, VC, CEO) */
  recipientRole?: string;
  /** Specific user recipient (applicant, assigned reviewer) */
  recipientUserId?: string;
  /** Department scope — used together with recipientRole === 'HOS' */
  recipientDepartment?: string;

  data: {
    entityId?:     number;
    entityType?:   string;
    entityModule?: string;
    stage?:        string;
    actorName?:    string;
    route?:        string;
    batchId?:      number;
    batchName?:    string;
    startDate?:    string;
    deadline?:     string;
    newDeadline?:  string;
    expiredAt?:    string;
    [key: string]: unknown;
  };
}
