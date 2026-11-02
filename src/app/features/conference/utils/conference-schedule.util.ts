import { malaysiaNowInputValue } from '../../../shared/utils/date-time.util';

const ACTION = 'Please change the Conference Start Date and Conference End Date, or contact RMC Admin for assistance.';
export const CONFERENCE_LEAD_TIME_MESSAGE =
  'Applications must be submitted at least three weeks before the Conference Start Date. ' + ACTION;

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function minimumConferenceStartDate(): string {
  const today = new Date(malaysiaNowInputValue().slice(0, 10) + 'T00:00:00Z');
  today.setUTCDate(today.getUTCDate() + 21);
  return today.toISOString().slice(0, 10);
}

export function conferenceScheduleError(start: unknown, end: unknown, firstSubmission: boolean): string | null {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 'Conference Start Date and Conference End Date must be valid dates. ' + ACTION;
  if (endDate < startDate) return 'Conference End Date must be on or after Conference Start Date. ' + ACTION;
  if (firstSubmission && String(start) < minimumConferenceStartDate()) return CONFERENCE_LEAD_TIME_MESSAGE;
  return null;
}
