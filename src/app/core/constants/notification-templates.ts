import { NotificationScope, NotificationType, NotificationPriority } from '../../interfaces/notification.interface';

export interface NotificationTemplate {
  scope:           NotificationScope;
  type:            NotificationType;
  title:           string;
  /** Use {{placeholders}} matching the keys passed to NotificationService.build() */
  messageTemplate: string;
  priority:        NotificationPriority;
}

/**
 * Central registry of all notification templates.
 *
 * GLOBAL keys work across any module.
 * RDIG keys are RDIG-specific (batch / stage management).
 *
 * To add a new notification:
 *  1. Add a new key + template here.
 *  2. Call notifSvc.build(key, context) wherever the event occurs.
 *  No other files need to change.
 */
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {

  // ── GLOBAL — workflow action ──────────────────────────────────────────────

  REVIEW_ASSIGNED_TO_YOU: {
    scope:           'GLOBAL',
    type:            'ACTION',
    title:           'Action Required',
    messageTemplate: '{{entityType}} #{{entityId}} requires your review at the {{stage}} stage.',
    priority:        'high',
  },

  APPLICATION_SUBMITTED_CONFIRMED: {
    scope:           'GLOBAL',
    type:            'INFO',
    title:           'Submission Confirmed',
    messageTemplate: '{{entityType}} #{{entityId}} has been successfully submitted and is now awaiting review.',
    priority:        'low',
  },

  APPLICATION_RESUBMITTED_BY: {
    scope:           'GLOBAL',
    type:            'INFO',
    title:           'Application Resubmitted',
    messageTemplate: '{{entityType}} #{{entityId}} has been resubmitted by {{actorName}} and is ready for your review.',
    priority:        'medium',
  },

  APPLICATION_RETURNED_FOR_REVISION: {
    scope:           'GLOBAL',
    type:            'ACTION',
    title:           'Revision Required',
    messageTemplate: '{{entityType}} #{{entityId}} has been returned by {{actorName}} for revision. Please review the comments and resubmit.',
    priority:        'high',
  },

  APPLICATION_REJECTED_BY: {
    scope:           'GLOBAL',
    type:            'ALERT',
    title:           'Application Rejected',
    messageTemplate: '{{entityType}} #{{entityId}} was rejected by {{actorName}} at the {{stage}} stage.',
    priority:        'high',
  },

  REVIEWER_ASSIGNED_TO_APPLICATION: {
    scope:           'GLOBAL',
    type:            'ACTION',
    title:           'Review Assignment',
    messageTemplate: 'You have been assigned to review {{entityType}} #{{entityId}}. Please complete your review before the deadline.',
    priority:        'high',
  },

  // ── GLOBAL — reminders / escalation ──────────────────────────────────────

  REMINDER_DEADLINE: {
    scope:           'GLOBAL',
    type:            'REMINDER',
    title:           'Deadline Reminder',
    messageTemplate: '{{entityType}} #{{entityId}} requires your action before {{deadline}}.',
    priority:        'medium',
  },

  ESCALATION_REQUIRED: {
    scope:           'GLOBAL',
    type:            'ALERT',
    title:           'Escalation',
    messageTemplate: '{{entityType}} #{{entityId}} requires immediate attention. Deadline is tomorrow.',
    priority:        'high',
  },

  DEADLINE_MISSED: {
    scope:           'GLOBAL',
    type:            'ALERT',
    title:           'Deadline Missed',
    messageTemplate: 'The deadline for {{entityType}} #{{entityId}} at the {{stage}} stage has passed. Please contact the RMC Office.',
    priority:        'high',
  },

  // ── RDIG — batch management ───────────────────────────────────────────────

  BATCH_IS_DONE: {
    scope:           'RDIG',
    type:            'ALERT',
    title:           'Batch Ready to Close',
    messageTemplate: 'The RDIG batch "{{batchName}}" has reached its end date. Please review and close the batch if no extension is required.',
    priority:        'high',
  },

  UPCOMING_BATCH_PLAN: {
    scope:           'RDIG',
    type:            'REMINDER',
    title:           'Upcoming Batch',
    messageTemplate: 'The RDIG batch "{{batchName}}" is scheduled to start in 7 days. Please review and confirm the plan.',
    priority:        'medium',
  },

  STAGE_DEADLINE_EXTENDED: {
    scope:           'RDIG',
    type:            'INFO',
    title:           'Stage Deadline Extended',
    messageTemplate: 'The deadline for the {{stage}} stage has been extended to {{newDeadline}}.',
    priority:        'medium',
  },
};
